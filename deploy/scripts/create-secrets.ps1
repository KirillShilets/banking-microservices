[CmdletBinding()]
param(
    [string] $Namespace   = 'bank',
    [string] $ReleaseName = 'bank',
    [string] $SecretName  = '',
    [string] $EnvFile     = '.env'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$envPath  = Join-Path $repoRoot $EnvFile
if (-not (Test-Path $envPath)) {
    throw "$EnvFile was not found at $envPath. Copy .env.example to .env and fill it in."
}

$config = @{}
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $index = $line.IndexOf('=')
    if ($index -lt 1) { return }
    $key   = $line.Substring(0, $index).Trim()
    $value = $line.Substring($index + 1).Trim()
    if ($value.Length -ge 2 -and
            (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                    ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    $config[$key] = $value
}

function Get-Required {
    param([Parameter(Mandatory)][string] $Key)
    if (-not $config.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($config[$Key])) {
        throw ".env is missing a value for '$Key'."
    }
    return $config[$Key]
}

foreach ($key in 'ACCOUNT_DB_PASSWORD', 'BILL_DB_PASSWORD', 'DEPOSIT_DB_PASSWORD', 'NOTIFICATION_DB_PASSWORD', 'KEYCLOAK_DB_PASSWORD', 'RABBITMQ_PASSWORD', 'MAIL_PASSWORD') {
    if ((Get-Required $key) -eq 'change-me') {
        throw ".env still contains the example password for '$key'. Set a unique value before deployment."
    }
}

function New-RandomSecretValue {
    param([int] $Length = 40)
    $bytes = [byte[]]::new($Length)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return [Convert]::ToBase64String($bytes).Replace('+', 'A').Replace('/', 'B').TrimEnd('=').Substring(0, $Length)
}

function Apply-GenericSecret {
    param(
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][System.Collections.IDictionary] $Values,
        [string] $Type = 'Opaque'
    )
    $kubectlArgs = @('create', 'secret', 'generic', $Name, '-n', $Namespace, "--type=$Type", '--dry-run=client', '-o', 'yaml')
    foreach ($entry in $Values.GetEnumerator()) {
        $kubectlArgs += "--from-literal=$($entry.Key)=$($entry.Value)"
    }
    & kubectl @kubectlArgs | & kubectl apply -f - | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not apply secret '$Name'." }
}

function Ensure-GeneratedSecret {
    param(
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][System.Collections.IDictionary] $Values
    )
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & kubectl get secret $Name -n $Namespace *> $null
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($LASTEXITCODE -eq 0) { return }
    Apply-GenericSecret -Name $Name -Values $Values
}

Write-Host '==> Ensuring the namespace exists' -ForegroundColor Cyan
$previousPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $probe = & kubectl get namespace $Namespace 2>&1
    $namespaceExists = ($LASTEXITCODE -eq 0)

    if (-not $namespaceExists) {
        & kubectl create namespace $Namespace 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Could not create namespace '$Namespace'."
        }
        Write-Host "    Created namespace '$Namespace'." -ForegroundColor DarkGray
    }
} finally {
    $ErrorActionPreference = $previousPreference
}

$literals = [ordered]@{
    'ACCOUNT_DB_USER'           = 'account_service_admin'
    'ACCOUNT_DB_PASSWORD'       = Get-Required 'ACCOUNT_DB_PASSWORD'
    'BILL_DB_USER'              = 'bill_service_admin'
    'BILL_DB_PASSWORD'          = Get-Required 'BILL_DB_PASSWORD'
    'DEPOSIT_DB_USER'           = 'deposit_service_admin'
    'DEPOSIT_DB_PASSWORD'       = Get-Required 'DEPOSIT_DB_PASSWORD'
    'NOTIFICATION_DB_USER'      = 'notification_service_admin'
    'NOTIFICATION_DB_PASSWORD'  = Get-Required 'NOTIFICATION_DB_PASSWORD'

    'RABBITMQ_USERNAME'         = Get-Required 'RABBITMQ_USERNAME'
    'RABBITMQ_PASSWORD'         = Get-Required 'RABBITMQ_PASSWORD'

    'MAIL_USERNAME'             = Get-Required 'MAIL_USERNAME'
    'MAIL_PASSWORD'             = Get-Required 'MAIL_PASSWORD'
}

Write-Host "==> Applying secret '$SecretName' in namespace '$Namespace'" -ForegroundColor Cyan
Apply-GenericSecret -Name $SecretName -Values $literals

$databaseCredentials = @(
    @{ Secret = 'account-db-credentials'; User = 'account_service_admin'; Password = Get-Required 'ACCOUNT_DB_PASSWORD' },
    @{ Secret = 'bill-db-credentials'; User = 'bill_service_admin'; Password = Get-Required 'BILL_DB_PASSWORD' },
    @{ Secret = 'deposit-db-credentials'; User = 'deposit_service_admin'; Password = Get-Required 'DEPOSIT_DB_PASSWORD' },
    @{ Secret = 'notification-db-credentials'; User = 'notification_service_admin'; Password = Get-Required 'NOTIFICATION_DB_PASSWORD' },
    @{ Secret = 'keycloak-db-credentials'; User = 'keycloak_admin'; Password = Get-Required 'KEYCLOAK_DB_PASSWORD' }
)

foreach ($credential in $databaseCredentials) {
    Apply-GenericSecret -Name $credential.Secret -Type 'kubernetes.io/basic-auth' -Values ([ordered]@{
        username = $credential.User
        password = $credential.Password
    })
    & kubectl label secret $credential.Secret -n $Namespace 'cnpg.io/reload=true' --overwrite | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not label the PostgreSQL credentials Secret '$($credential.Secret)'." }
}

Apply-GenericSecret -Name 'rabbitmq-app-credentials' -Values ([ordered]@{
    username = Get-Required 'RABBITMQ_USERNAME'
    password = Get-Required 'RABBITMQ_PASSWORD'
})
& kubectl label secret rabbitmq-app-credentials -n $Namespace 'rabbitmq.com/topology-operator=true' --overwrite | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not label the RabbitMQ credentials Secret.' }

Ensure-GeneratedSecret -Name 'postgres-admin-credentials' -Values ([ordered]@{
    username = 'bank_admin'
    password = New-RandomSecretValue -Length 48
})
& kubectl label secret postgres-admin-credentials -n $Namespace 'cnpg.io/reload=true' --overwrite | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not label the PostgreSQL admin Secret.' }
Ensure-GeneratedSecret -Name 'minio-root-credentials' -Values ([ordered]@{
    username = New-RandomSecretValue -Length 20
    password = New-RandomSecretValue -Length 40
})
Ensure-GeneratedSecret -Name 'postgres-backup-credentials' -Values ([ordered]@{
    ACCESS_KEY_ID = New-RandomSecretValue -Length 20
    ACCESS_SECRET_KEY = New-RandomSecretValue -Length 40
})

Write-Host 'Done. Secret contents were not printed.' -ForegroundColor Green
