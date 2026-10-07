[CmdletBinding()]
param(
    [string] $ClusterName = 'bank-local',
    [string] $Namespace   = 'bank',
    [string] $ReleaseName = 'bank',
    [string] $ImageTag    = '1.0-SNAPSHOT',
    [switch] $SkipCluster,
    [switch] $SkipImages,
    [switch] $SkipSecrets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot  = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$chartPath = Join-Path $repoRoot 'helm\bank-platform'

function Assert-Command {
    param([Parameter(Mandatory)][string] $Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

Write-Host '==> Validating prerequisites' -ForegroundColor Cyan
foreach ($command in 'docker', 'kind', 'kubectl', 'helm') { Assert-Command -Name $command }

Write-Host '==> Checking external dependencies' -ForegroundColor Cyan
$requiredPorts = [ordered]@{ 'PostgreSQL' = 5433; 'RabbitMQ' = 5672; 'Keycloak' = 8080 }
foreach ($entry in $requiredPorts.GetEnumerator()) {
    $reachable = Test-NetConnection -ComputerName 'localhost' -Port $entry.Value `
                                    -InformationLevel Quiet -WarningAction SilentlyContinue
    if (-not $reachable) {
        throw "$($entry.Key) is not reachable on localhost:$($entry.Value). Run 'docker compose up -d' first."
    }
    Write-Host ("    {0,-12} localhost:{1} OK" -f $entry.Key, $entry.Value) -ForegroundColor DarkGray
}

if (-not $SkipCluster) {
    Write-Host '==> Creating the kind cluster' -ForegroundColor Cyan
    if ((& kind get clusters) -contains $ClusterName) {
        Write-Host "    Cluster '$ClusterName' already exists, reusing it." -ForegroundColor DarkGray
    } else {
        & kind create cluster --config (Join-Path $PSScriptRoot 'kind-cluster.yaml')
        if ($LASTEXITCODE -ne 0) { throw 'kind cluster creation failed.' }
    }

    Write-Host '==> Installing ingress-nginx' -ForegroundColor Cyan
    & kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/kind/deploy.yaml
    if ($LASTEXITCODE -ne 0) { throw 'ingress-nginx installation failed.' }
    & kubectl wait --namespace ingress-nginx --for=condition=ready pod `
        --selector=app.kubernetes.io/component=controller --timeout=300s
    if ($LASTEXITCODE -ne 0) { throw 'ingress-nginx did not become ready.' }
}

$nodeName = (& kind get nodes --name $ClusterName | Select-Object -First 1).Trim()
$hostGatewayIp = (& docker inspect -f '{{.NetworkSettings.Networks.kind.Gateway}}' $nodeName).Trim()
if ($LASTEXITCODE -ne 0 -or $hostGatewayIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
    throw "Could not determine the docker gateway address for node '$nodeName' (got '$hostGatewayIp')."
}
Write-Host "==> Host gateway address: $hostGatewayIp" -ForegroundColor Cyan

if (-not $SkipImages) {
    Write-Host '==> Building images' -ForegroundColor Cyan
    Push-Location $repoRoot
    try {
        foreach ($service in 'account-service','bill-service','deposit-service','notification-service','gateway-service') {
            Write-Host "    $service (root context)" -ForegroundColor DarkGray
            & docker build -f "$service/Dockerfile" -t "bank/${service}:${ImageTag}" .
            if ($LASTEXITCODE -ne 0) { throw "Image build failed for $service." }
        }
        foreach ($service in 'config-service','discovery-service') {
            Write-Host "    $service (module context)" -ForegroundColor DarkGray
            & docker build -f "$service/Dockerfile" -t "bank/${service}:${ImageTag}" $service
            if ($LASTEXITCODE -ne 0) { throw "Image build failed for $service." }
        }
        Write-Host '    frontend' -ForegroundColor DarkGray
        & docker build -f frontend/Dockerfile `
            --build-arg VITE_KEYCLOAK_URL=http://keycloak.localhost:8080 `
            --build-arg VITE_KEYCLOAK_REALM=bank-realm `
            --build-arg VITE_KEYCLOAK_CLIENT_ID=banking-frontend `
            --build-arg VITE_GATEWAY_URL=http://api.bank.local `
            -t "bank/frontend:${ImageTag}" frontend
        if ($LASTEXITCODE -ne 0) { throw 'Frontend image build failed.' }
    } finally { Pop-Location }

    Write-Host '==> Loading images into kind' -ForegroundColor Cyan
    $images = @(
        'config-service','discovery-service','account-service','bill-service',
        'deposit-service','notification-service','gateway-service','frontend'
    ) | ForEach-Object { "bank/${_}:${ImageTag}" }
    & kind load docker-image --name $ClusterName @images
    if ($LASTEXITCODE -ne 0) { throw 'kind load docker-image failed.' }
}

if (-not $SkipSecrets) {
    Write-Host '==> Resolving the Secret name from the rendered chart' -ForegroundColor Cyan
    $rendered = & helm template $ReleaseName $chartPath `
        --namespace $Namespace `
        --values (Join-Path $chartPath 'values.yaml') `
        --values (Join-Path $chartPath 'values-kind.yaml') `
        --set-string "global.hostAliases[0].ip=$hostGatewayIp" `
        --set-string "global.hostAliases[0].hostnames[0]=keycloak.localhost" `
        --set-string "external.keycloakHost=$hostGatewayIp" `
        --set-string "external.rabbitmqHost=$hostGatewayIp" 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'helm template failed while resolving the Secret name.' }

    $match = $rendered | Select-String -Pattern '^\s+name: (\S*-app-secrets)\s*$' |
            Select-Object -First 1
    if ($null -eq $match) { throw 'No *-app-secrets reference found in the rendered chart.' }
    $secretName = $match.Matches[0].Groups[1].Value
    Write-Host "    Secret name from the chart: $secretName" -ForegroundColor DarkGray

    Write-Host '==> Creating secrets' -ForegroundColor Cyan
    powershell -NoProfile -ExecutionPolicy Bypass `
        -File (Join-Path $PSScriptRoot '..\scripts\create-secrets.ps1') `
        -Namespace $Namespace -ReleaseName $ReleaseName -SecretName $secretName
    if ($LASTEXITCODE -ne 0) { throw 'Secret creation failed.' }
}

Write-Host '==> Deploying the Helm release' -ForegroundColor Cyan
& helm upgrade --install $ReleaseName $chartPath `
    --namespace $Namespace --create-namespace `
    --values (Join-Path $chartPath 'values.yaml') `
    --values (Join-Path $chartPath 'values-kind.yaml') `
    --set-string "global.hostAliases[0].ip=$hostGatewayIp" `
    --set-string "global.hostAliases[0].hostnames[0]=keycloak.localhost" `
    --set-string "external.keycloakHost=$hostGatewayIp" `
    --set-string "external.rabbitmqHost=$hostGatewayIp" `
    --set-string "services.account-service.env.SPRING_DATASOURCE_URL=jdbc:postgresql://${hostGatewayIp}:5433/account_service_database" `
    --set-string "services.bill-service.env.SPRING_DATASOURCE_URL=jdbc:postgresql://${hostGatewayIp}:5433/bill_service_database" `
    --set-string "services.deposit-service.env.SPRING_DATASOURCE_URL=jdbc:postgresql://${hostGatewayIp}:5433/deposit_service_database" `
    --set-string "services.notification-service.env.SPRING_DATASOURCE_URL=jdbc:postgresql://${hostGatewayIp}:5433/notification_service_database" `
    --wait --timeout 10m
if ($LASTEXITCODE -ne 0) { throw 'helm upgrade failed.' }

Write-Host '==> Waiting for rollouts' -ForegroundColor Cyan
foreach ($service in 'config-service','discovery-service','account-service','bill-service',
'deposit-service','notification-service','gateway-service','frontend') {
    & kubectl -n $Namespace rollout status "deploy/$service" --timeout=300s
    if ($LASTEXITCODE -ne 0) { throw "Rollout of $service did not complete." }
}

Write-Host ''
Write-Host 'Deployment complete.' -ForegroundColor Green
Write-Host 'Add these lines to C:\Windows\System32\drivers\etc\hosts:' -ForegroundColor Yellow
Write-Host '    127.0.0.1 app.bank.local'
Write-Host '    127.0.0.1 api.bank.local'