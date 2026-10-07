[CmdletBinding()]
param([switch] $Check)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$source   = Join-Path $repoRoot 'config-service\src\main\resources\services'
$target   = Join-Path $repoRoot 'helm\bank-platform\config\config-service\src\main\resources\services'

if (-not (Test-Path $source)) { throw "Source directory not found: $source" }

if ($Check) {
    $sourceFiles = Get-ChildItem $source -Filter '*.yml' -File
    foreach ($file in $sourceFiles) {
        $mirror = Join-Path $target $file.Name
        if (-not (Test-Path $mirror)) {
            throw "helm chart config is missing $($file.Name). Run deploy/scripts/sync-config.ps1."
        }
        if ((Get-FileHash $mirror).Hash -ne (Get-FileHash $file.FullName).Hash) {
            throw "helm chart config differs for $($file.Name). Run deploy/scripts/sync-config.ps1."
        }
    }
    $extra = Get-ChildItem $target -Filter '*.yml' -File -ErrorAction SilentlyContinue |
            Where-Object { -not (Test-Path (Join-Path $source $_.Name)) }
    if ($extra) {
        throw "helm chart config has stale files: $($extra.Name -join ', '). Run deploy/scripts/sync-config.ps1."
    }
    Write-Host 'Config copies are in sync.' -ForegroundColor Green
    exit 0
}

New-Item -ItemType Directory -Force $target | Out-Null
Get-ChildItem $target -Filter '*.yml' -File -ErrorAction SilentlyContinue | Remove-Item -Force
Copy-Item (Join-Path $source '*.yml') $target
Write-Host "Synced $((Get-ChildItem $target -Filter '*.yml').Count) file(s) into the chart." -ForegroundColor Green