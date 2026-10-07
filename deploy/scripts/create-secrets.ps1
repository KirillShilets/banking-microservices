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

if ([string]::IsNullOrWhiteSpace($SecretName)) {
    $SecretName = "${ReleaseName}-app-secrets"
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
    'SPRING_SECURITY_USER_NAME' = Get-Required 'SPRING_SECURITY_USER_NAME'
    'SPRING_SECURITY_PASSWORD'  = Get-Required 'SPRING_SECURITY_PASSWORD'

    'ACCOUNT_DB_USER'           = Get-Required 'ACCOUNT_DB_USER'
    'ACCOUNT_DB_PASSWORD'       = Get-Required 'ACCOUNT_DB_PASSWORD'
    'BILL_DB_USER'              = Get-Required 'BILL_DB_USER'
    'BILL_DB_PASSWORD'          = Get-Required 'BILL_DB_PASSWORD'
    'DEPOSIT_DB_USER'           = Get-Required 'DEPOSIT_DB_USER'
    'DEPOSIT_DB_PASSWORD'       = Get-Required 'DEPOSIT_DB_PASSWORD'
    'NOTIFICATION_DB_USER'      = Get-Required 'NOTIFICATION_DB_USER'
    'NOTIFICATION_DB_PASSWORD'  = Get-Required 'NOTIFICATION_DB_PASSWORD'

    'RABBITMQ_USERNAME'         = Get-Required 'RABBITMQ_USERNAME'
    'RABBITMQ_PASSWORD'         = Get-Required 'RABBITMQ_PASSWORD'

    'MAIL_PASSWORD'             = Get-Required 'MAIL_PASSWORD'
}

$applyArgs = @('create', 'secret', 'generic', $SecretName, '-n', $Namespace, '--dry-run=client', '-o', 'yaml')
foreach ($entry in $literals.GetEnumerator()) {
    $applyArgs += "--from-literal=$($entry.Key)=$($entry.Value)"
}

Write-Host "==> Applying secret '$SecretName' in namespace '$Namespace'" -ForegroundColor Cyan
& kubectl @applyArgs | & kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw 'Secret creation failed.' }

Write-Host 'Done. Secret contents were not printed.' -ForegroundColor Green