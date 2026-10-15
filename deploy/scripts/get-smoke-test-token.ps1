[CmdletBinding()]
param(
    [switch] $Enroll,
    [string] $KeycloakUrl = 'http://keycloak.localhost',
    [string] $ClientId = 'banking-frontend',
    [string] $Realm = 'bank-realm'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$credentialDirectory = Join-Path $env:LOCALAPPDATA 'BankingSystem'
$credentialPath = Join-Path $credentialDirectory 'smoke-refresh-token.dpapi'

function Convert-SecureStringToPlainText {
    param([Parameter(Mandatory)][Security.SecureString] $Value)
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Save-RefreshToken {
    param([Parameter(Mandatory)][string] $Token)
    New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
    $secureToken = ConvertTo-SecureString -String $Token -AsPlainText -Force
    $protectedToken = ConvertFrom-SecureString -SecureString $secureToken
    Set-Content -LiteralPath $credentialPath -Value $protectedToken -NoNewline
}

if ($Enroll) {
    $enteredToken = Read-Host 'Вставь refresh_token из ответа Keycloak' -AsSecureString
    $refreshToken = Convert-SecureStringToPlainText -Value $enteredToken
    if ([string]::IsNullOrWhiteSpace($refreshToken)) {
        throw 'Refresh token пустой.'
    }
} else {
    if (-not (Test-Path -LiteralPath $credentialPath)) {
        throw "Refresh token ещё не сохранён. Сначала выполни: .\deploy\scripts\get-smoke-test-token.ps1 -Enroll"
    }
    $protectedToken = Get-Content -LiteralPath $credentialPath -Raw
    $secureToken = ConvertTo-SecureString -String $protectedToken
    $refreshToken = Convert-SecureStringToPlainText -Value $secureToken
}

$tokenEndpoint = "$($KeycloakUrl.TrimEnd('/'))/realms/$Realm/protocol/openid-connect/token"
$body = 'grant_type=refresh_token&client_id={0}&refresh_token={1}' -f `
    [uri]::EscapeDataString($ClientId), [uri]::EscapeDataString($refreshToken)
try {
    $tokenResponse = Invoke-RestMethod -Uri $tokenEndpoint -Method Post -TimeoutSec 20 `
        -ContentType 'application/x-www-form-urlencoded' -Body $body
} catch {
    if ($Enroll) {
        throw 'Keycloak не принял refresh token. Проверь, что скопирован refresh_token из свежего входа в приложение и Keycloak доступен по http://keycloak.localhost.'
    }
    throw 'Не удалось обновить JWT. Refresh token мог истечь или быть отозван. Войди в приложение заново и выполни get-smoke-test-token.ps1 -Enroll.'
}

if ([string]::IsNullOrWhiteSpace([string]$tokenResponse.access_token)) {
    throw 'Keycloak не вернул access token.'
}

$nextRefreshToken = [string]$tokenResponse.refresh_token
if ([string]::IsNullOrWhiteSpace($nextRefreshToken)) {
    $nextRefreshToken = $refreshToken
}
Save-RefreshToken -Token $nextRefreshToken
[Console]::Out.WriteLine([string]$tokenResponse.access_token)
