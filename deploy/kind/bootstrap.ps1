[CmdletBinding()]
param(
    [string] $ClusterName = 'bank-local',
    [string] $ReleaseName = 'bank',
    [string] $ImageTag = '1.0-SNAPSHOT',
    [switch] $SkipCluster,
    [switch] $SkipImages,
    [switch] $SkipSecrets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$chartPath = Join-Path $repoRoot 'helm\bank-platform'
$infraPath = Join-Path $repoRoot 'deploy\k8s\infra'
$Namespace = 'bank'

function Assert-Command {
    param([Parameter(Mandatory)][string] $Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-Native {
    param([Parameter(Mandatory)][string] $Name, [Parameter(Mandatory)][string[]] $Arguments)
    & $Name @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Name $($Arguments -join ' ') failed with exit code $LASTEXITCODE." }
}

function kubectl_apply_crds {
    # CRD bundles (RabbitMQ, CNPG, cert-manager) exceed the 262144-byte
    # last-applied-configuration annotation limit under client-side apply.
    param([Parameter(Mandatory)][string] $Url)
    kubectl apply --server-side --force-conflicts -f "$Url"
}

function Install-HelmRelease {
    param([string] $Name, [string] $Chart, [string] $Namespace, [string] $Version, [string[]] $ExtraArgs = @())
    $installArgs = @('upgrade', '--install', $Name, $Chart, '--namespace', $Namespace, '--create-namespace', '--version', $Version) + $ExtraArgs
    Invoke-Native -Name 'helm' -Arguments $installArgs
}

Write-Host '==> Validating prerequisites' -ForegroundColor Cyan
foreach ($command in 'docker', 'kind', 'kubectl', 'helm', 'powershell') { Assert-Command -Name $command }

if (-not $SkipCluster) {
    Write-Host '==> Creating or reusing the kind cluster' -ForegroundColor Cyan
    if ((& kind get clusters) -notcontains $ClusterName) {
        Invoke-Native -Name 'kind' -Arguments @('create', 'cluster', '--name', $ClusterName, '--config', (Join-Path $PSScriptRoot 'kind-cluster.yaml'))
    }

    Write-Host '==> Installing ingress-nginx' -ForegroundColor Cyan
    kubectl_apply_crds 'https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/kind/deploy.yaml'
    Invoke-Native -Name 'kubectl' -Arguments @('wait', '--namespace', 'ingress-nginx', '--for=condition=ready', 'pod', '--selector=app.kubernetes.io/component=controller', '--timeout=300s')
}

$previousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    & kubectl get namespace $Namespace *> $null
} finally {
    $ErrorActionPreference = $previousPreference
}
if ($LASTEXITCODE -ne 0) {
    Invoke-Native -Name 'kubectl' -Arguments @('create', 'namespace', $Namespace)
}

# Pod Security Admission at minimum warn/audit for kind; restricted is enforced
# in staging/prod via deploy/k8s/namespaces/namespaces.yaml.
Invoke-Native -Name 'kubectl' -Arguments @('label', 'namespace', $Namespace,
    'pod-security.kubernetes.io/warn=restricted',
    'pod-security.kubernetes.io/audit=restricted',
    '--overwrite') 

if (-not $SkipSecrets) {
    Write-Host '==> Creating application and infrastructure Secrets' -ForegroundColor Cyan
    Invoke-Native -Name 'powershell' -Arguments @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot '..\scripts\create-secrets.ps1'), '-Namespace', $Namespace, '-ReleaseName', $ReleaseName, '-SecretName', 'bank-app-secrets')
}

Write-Host '==> Installing cert-manager and CloudNativePG' -ForegroundColor Cyan
Invoke-Native -Name 'helm' -Arguments @('repo', 'add', 'jetstack', 'https://charts.jetstack.io', '--force-update')
Invoke-Native -Name 'helm' -Arguments @('repo', 'add', 'cnpg', 'https://cloudnative-pg.github.io/charts', '--force-update')
Invoke-Native -Name 'helm' -Arguments @('repo', 'update')
Install-HelmRelease -Name 'cert-manager' -Chart 'jetstack/cert-manager' -Namespace 'cert-manager' -Version 'v1.21.2' -ExtraArgs @('--set', 'crds.enabled=true')
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'deployment/cert-manager', '-n', 'cert-manager', '--timeout=300s')
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'deployment/cert-manager-cainjector', '-n', 'cert-manager', '--timeout=300s')
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'deployment/cert-manager-webhook', '-n', 'cert-manager', '--timeout=300s')
Install-HelmRelease -Name 'cloudnative-pg' -Chart 'cnpg/cloudnative-pg' -Namespace 'cnpg-system' -Version '0.29.1'
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'deployment/cloudnative-pg', '-n', 'cnpg-system', '--timeout=300s')
Install-HelmRelease -Name 'plugin-barman-cloud' -Chart 'cnpg/plugin-barman-cloud' -Namespace 'cnpg-system' -Version '0.8.1'
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'deployment/plugin-barman-cloud', '-n', 'cnpg-system', '--timeout=300s')

Write-Host '==> Installing RabbitMQ operators' -ForegroundColor Cyan
kubectl_apply_crds 'https://github.com/rabbitmq/cluster-operator/releases/download/v2.22.3/cluster-operator.yml'
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'deployment/rabbitmq-cluster-operator', '-n', 'rabbitmq-system', '--timeout=300s')
kubectl_apply_crds 'https://github.com/rabbitmq/messaging-topology-operator/releases/download/v1.20.0/messaging-topology-operator-with-certmanager.yaml'
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'deployment/messaging-topology-operator', '-n', 'rabbitmq-system', '--timeout=300s')

Write-Host '==> Installing Keycloak Operator in the application namespace' -ForegroundColor Cyan
kubectl apply --server-side --force-conflicts -k (Join-Path $infraPath 'keycloak\operator')
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'deployment/keycloak-operator', '-n', $Namespace, '--timeout=300s')

Write-Host '==> Deploying MinIO and creating the backup bucket' -ForegroundColor Cyan
$minioInitImage = 'bank/minio-mc-init:RELEASE.2025-08-13T08-35-41Z'
Invoke-Native -Name 'docker' -Arguments @('build', '-f', (Join-Path $infraPath 'minio\init.Dockerfile'), '-t', $minioInitImage, $repoRoot)
Invoke-Native -Name 'kind' -Arguments @('load', 'docker-image', '--name', $ClusterName, $minioInitImage)
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'minio\statefulset.yaml'))
Invoke-Native -Name 'kubectl' -Arguments @('rollout', 'status', 'statefulset/minio', '-n', $Namespace, '--timeout=600s')
& kubectl delete job minio-bootstrap -n $Namespace --ignore-not-found=true | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not replace MinIO bootstrap Job.' }
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'minio\bucket-job.yaml'))
Invoke-Native -Name 'kubectl' -Arguments @('wait', '--for=condition=complete', 'job/minio-bootstrap', '-n', $Namespace, '--timeout=300s')

Write-Host '==> Deploying PostgreSQL cluster and backup schedule' -ForegroundColor Cyan
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'postgres\object-store.yaml'))
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'postgres\cluster.yaml'))
Invoke-Native -Name 'kubectl' -Arguments @('wait', '--for=condition=Ready', 'cluster.postgresql.cnpg.io/postgres', '-n', $Namespace, '--timeout=900s')
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'postgres\databases.yaml'))
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'postgres\scheduled-backup.yaml'))

Write-Host '==> Deploying RabbitMQ cluster and application user' -ForegroundColor Cyan
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'rabbitmq\cluster.yaml'))
$rabbitUser = (& kubectl get secret 'bank-app-secrets' -n $Namespace -o 'jsonpath={.data.RABBITMQ_USERNAME}')
if ($LASTEXITCODE -ne 0) { throw 'Could not read the configured RabbitMQ username from the app Secret.' }
$rabbitUser = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($rabbitUser))
if ($rabbitUser -notmatch '^[A-Za-z0-9._-]+$') { throw 'RABBITMQ_USERNAME must contain only letters, numbers, dots, underscores or hyphens.' }
$rabbitTemplate = Get-Content (Join-Path $infraPath 'rabbitmq\user.yaml') -Raw
$rabbitManifest = $rabbitTemplate.Replace('name: bankmq', "name: $rabbitUser").Replace('user: bankmq', "user: $rabbitUser")
$rabbitManifestPath = Join-Path ([System.IO.Path]::GetTempPath()) ('bank-rabbitmq-user-' + [guid]::NewGuid().ToString('N') + '.yaml')
[System.IO.File]::WriteAllText($rabbitManifestPath, $rabbitManifest, [System.Text.UTF8Encoding]::new($false))
try {
    Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', $rabbitManifestPath)
} finally {
    Remove-Item -LiteralPath $rabbitManifestPath -Force -ErrorAction SilentlyContinue
}
Invoke-Native -Name 'kubectl' -Arguments @('wait', '--for=condition=AllReplicasReady', 'rabbitmqcluster.rabbitmq.com/rabbitmq', '-n', $Namespace, '--timeout=900s')

Write-Host '==> Deploying Keycloak, ingress and realm import' -ForegroundColor Cyan
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'keycloak\keycloak.yaml'))
Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', (Join-Path $infraPath 'keycloak\ingress.yaml'))
Invoke-Native -Name 'kubectl' -Arguments @('wait', '--for=condition=Ready', 'keycloak.k8s.keycloak.org/keycloak', '-n', $Namespace, '--timeout=1200s')

$realmPath = Join-Path $repoRoot 'keycloak\import\bank-realm-realm.json'
$realm = Get-Content $realmPath -Raw
$realmManifest = '{"apiVersion":"k8s.keycloak.org/v2beta1","kind":"KeycloakRealmImport","metadata":{"name":"bank-realm","namespace":"' + $Namespace + '"},"spec":{"keycloakCRName":"keycloak","realm":' + $realm + '}}'
$realmManifestPath = Join-Path ([System.IO.Path]::GetTempPath()) ('bank-realm-import-' + [guid]::NewGuid().ToString('N') + '.json')
[System.IO.File]::WriteAllText($realmManifestPath, $realmManifest, [System.Text.UTF8Encoding]::new($false))
try {
    Invoke-Native -Name 'kubectl' -Arguments @('apply', '-f', $realmManifestPath)
} finally {
    Remove-Item -LiteralPath $realmManifestPath -Force -ErrorAction SilentlyContinue
}
Invoke-Native -Name 'kubectl' -Arguments @('wait', '--for=condition=Done', 'keycloakrealmimport.k8s.keycloak.org/bank-realm', '-n', $Namespace, '--timeout=600s')

if (-not $SkipImages) {
    Write-Host '==> Building application images' -ForegroundColor Cyan
    Push-Location $repoRoot
    try {
        foreach ($service in 'account-service', 'bill-service', 'deposit-service', 'notification-service', 'gateway-service') {
            Invoke-Native -Name 'docker' -Arguments @('build', '-f', "$service/Dockerfile", '-t', "bank/${service}:${ImageTag}", '.')
        }
        Invoke-Native -Name 'docker' -Arguments @('build', '-f', 'frontend/Dockerfile', '--build-arg', 'VITE_KEYCLOAK_URL=http://keycloak.localhost', '--build-arg', 'VITE_KEYCLOAK_REALM=bank-realm', '--build-arg', 'VITE_KEYCLOAK_CLIENT_ID=banking-frontend', '--build-arg', 'VITE_GATEWAY_URL=http://api.localhost', '-t', "bank/frontend:${ImageTag}", 'frontend')
    } finally { Pop-Location }
    $images = @('account-service', 'bill-service', 'deposit-service', 'notification-service', 'gateway-service', 'frontend') | ForEach-Object { "bank/${_}:${ImageTag}" }
    Invoke-Native -Name 'kind' -Arguments (@('load', 'docker-image', '--name', $ClusterName) + $images)
}

Write-Host '==> Deploying application tier with Helm' -ForegroundColor Cyan
Invoke-Native -Name 'helm' -Arguments @('upgrade', '--install', $ReleaseName, $chartPath, '--namespace', $Namespace, '--create-namespace', '--values', (Join-Path $chartPath 'values-kind.yaml'), '--wait', '--timeout', '15m')

Write-Host '==> Waiting for application rollouts' -ForegroundColor Cyan
foreach ($service in 'account-service', 'bill-service', 'deposit-service', 'notification-service', 'gateway-service', 'frontend') {
    Invoke-Native -Name 'kubectl' -Arguments @('-n', $Namespace, 'rollout', 'status', "deploy/bank-$service", '--timeout=300s')
}

Write-Host ''
Write-Host 'Deployment complete.' -ForegroundColor Green
Write-Host 'Smoke test requires BANK_SMOKE_TEST_JWT; see deploy/README.md.' -ForegroundColor Yellow
Write-Host 'Open the local endpoints:' -ForegroundColor Yellow
Write-Host '    Frontend: http://app.localhost'
Write-Host '    Gateway:  http://api.localhost'
Write-Host '    Keycloak: http://keycloak.localhost'
