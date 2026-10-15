[CmdletBinding()]
param(
    [string] $Namespace   = 'bank',
    [string] $ReleaseName = 'bank',
    [string] $JwtToken = $env:BANK_SMOKE_TEST_JWT
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Failures = 0
function Write-Check {
    param([string] $Name, [bool] $Passed, [string] $Detail = '')
    if ($Passed) { Write-Host "  [PASS] $Name" -ForegroundColor Green }
    else { Write-Host "  [FAIL] $Name $Detail" -ForegroundColor Red; $script:Failures++ }
}

function ConvertTo-HashtableDeep {
    param([Parameter(ValueFromPipeline)] $InputObject)
    process {
        if ($null -eq $InputObject) { return $null }

        if ($InputObject -is [System.Collections.IEnumerable] -and $InputObject -isnot [string]) {
            $collection = @(
            foreach ($item in $InputObject) { ConvertTo-HashtableDeep $item }
            )
            return $collection
        }
        elseif ($InputObject -is [PSCustomObject]) {
            $hash = @{}
            foreach ($property in $InputObject.PSObject.Properties) {
                $hash[$property.Name] = ConvertTo-HashtableDeep $property.Value
            }
            return $hash
        }
        else {
            return $InputObject
        }
    }
}

function Get-SafeProperty {
    param($InputObject, [string] $PropertyName)
    if ($null -eq $InputObject) { return $null }
    $prop = $InputObject.PSObject.Properties[$PropertyName]
    if ($null -eq $prop) { return $null }
    return $prop.Value
}

$services = @(
    'account-service','bill-service',
    'deposit-service','notification-service','gateway-service','frontend'
)

function Get-RestartSnapshot {
    $snapshot = @{}
    foreach ($service in $services) {
        $json = & kubectl -n $Namespace get pods -l "app.kubernetes.io/name=$service" -o json 2>$null | ConvertFrom-Json
        $podIds = @()
        $restartCount = 0
        foreach ($pod in $json.items) {
            $podIds += [string]$pod.metadata.uid
            $containerStatuses = Get-SafeProperty -InputObject $pod.status -PropertyName 'containerStatuses'
            if ($containerStatuses) {
                foreach ($container in $containerStatuses) {
                    $restartCount += [int]$container.restartCount
                }
            }
        }
        $snapshot[$service] = [pscustomobject]@{
            PodIds = @($podIds | Sort-Object)
            RestartCount = $restartCount
        }
    }
    return $snapshot
}

$restartSnapshotBefore = Get-RestartSnapshot

Write-Host '==> 1/5 Deployment readiness' -ForegroundColor Cyan
foreach ($service in $services) {
    $json = & kubectl -n $Namespace get deploy $service -o json 2>$null | ConvertFrom-Json
    if ($null -eq $json) { Write-Check -Name "$service exists" -Passed $false -Detail '(not found)'; continue }
    $desired = [int]$json.spec.replicas
    $ready   = 0
    if ($json.status.PSObject.Properties['readyReplicas']) { $ready = [int]$json.status.readyReplicas }
    Write-Check -Name "$service ready ($ready/$desired)" -Passed ($ready -eq $desired)
}

Write-Host '==> 2/5 Kubernetes ConfigMap content and mounts' -ForegroundColor Cyan
$configMaps = & kubectl -n $Namespace get configmap -l "app.kubernetes.io/instance=$ReleaseName" -o json 2>$null | ConvertFrom-Json | ConvertTo-HashtableDeep
$applicationConfig = if ($configMaps) {
    @($configMaps.items | Where-Object { $_.metadata.name -like '*-application-config' })[0]
} else { $null }
$configData = if ($applicationConfig) { $applicationConfig.data } else { $null }
$gatewayConfig = if ($configData) { $configData['gateway-service-kubernetes.yml'] } else { $null }
$hasGatewayRoutes = $gatewayConfig -and
        $gatewayConfig.Contains('http://account-service:8081') -and
        $gatewayConfig.Contains('http://bill-service:8082') -and
        $gatewayConfig.Contains('http://deposit-service:8083')
Write-Check -Name 'ConfigMap contains Kubernetes Gateway routes' -Passed $hasGatewayRoutes

foreach ($service in 'account-service','bill-service','deposit-service','notification-service','gateway-service') {
    $deployment = & kubectl -n $Namespace get deploy $service -o json 2>$null | ConvertFrom-Json
    $podSpec = if ($deployment) { $deployment.spec.template.spec } else { $null }
    $container = if ($podSpec) { $podSpec.containers[0] } else { $null }
    $valid = $false
    if ($container -and $applicationConfig) {
        $configEnv = @($container.env | Where-Object { $_.name -eq 'SPRING_CONFIG_LOCATION' })[0]
        $configNameEnv = @($container.env | Where-Object { $_.name -eq 'SPRING_CONFIG_NAME' })[0]
        $applicationNameEnv = @($container.env | Where-Object { $_.name -eq 'SPRING_APPLICATION_NAME' })[0]
        $configClientEnv = @($container.env | Where-Object { $_.name -eq 'SPRING_CLOUD_CONFIG_ENABLED' })[0]
        $configVolumeName = @($podSpec.volumes | Where-Object {
            $cm = Get-SafeProperty -InputObject $_ -PropertyName 'configMap'
            $cm -and $cm.name -eq $applicationConfig.metadata.name
        } | ForEach-Object { $_.name })[0]
        $configMount = @($container.volumeMounts | Where-Object {
            $readOnly = Get-SafeProperty -InputObject $_ -PropertyName 'readOnly'
            $_.name -eq $configVolumeName -and $_.mountPath -eq '/app/config' -and $readOnly -eq $true
        })[0]
        $valid = $configEnv.value -eq 'file:/app/config/' -and
                $configNameEnv.value -eq "application,$service" -and
                $applicationNameEnv.value -eq $service -and
                $configClientEnv.value -eq 'false' -and $null -ne $configMount
    }
    Write-Check -Name "$service loads mounted ConfigMap configuration" -Passed $valid
}

Write-Host '==> 3/5 Kubernetes Service presence' -ForegroundColor Cyan
foreach ($service in 'account-service','bill-service','deposit-service') {
    $svc = & kubectl -n $Namespace get service $service -o json 2>$null | ConvertFrom-Json
    Write-Check -Name "Service $service exists" -Passed ($null -ne $svc)
}

Write-Host '==> 4/5 Gateway reachability' -ForegroundColor Cyan
$forward3 = Start-Job -ScriptBlock { param($ns) kubectl -n $ns port-forward svc/gateway-service 18989:8989 } -ArgumentList $Namespace
Start-Sleep -Seconds 5
try {
    try {
        Invoke-WebRequest -Uri 'http://localhost:18989/accounts/me' -UseBasicParsing -TimeoutSec 15 | Out-Null
        Write-Check -Name 'Unauthenticated /accounts/me is rejected' -Passed $false -Detail '(got 2xx)'
    } catch {
        $status = 'no response'
        $response = $_.Exception.PSObject.Properties['Response']
        if ($response -and $response.Value) { $status = [int]$response.Value.StatusCode }
        Write-Check -Name "Unauthenticated /accounts/me returns 401 (got $status)" -Passed ($status -eq 401)
    }

    if ([string]::IsNullOrWhiteSpace($JwtToken)) {
        Write-Check -Name 'Valid JWT /accounts/me request' -Passed $false `
            -Detail '(set BANK_SMOKE_TEST_JWT or pass -JwtToken)'
    } else {
        $statusCode = 0
        try {
            $response = Invoke-WebRequest -Uri 'http://localhost:18989/accounts/me' `
                -Headers @{ Authorization = "Bearer $JwtToken" } -UseBasicParsing -TimeoutSec 15
            $statusCode = [int]$response.StatusCode
        } catch {
            $response = $_.Exception.PSObject.Properties['Response']
            if ($response -and $response.Value) { $statusCode = [int]$response.Value.StatusCode }
        }
        $authenticated = ($statusCode -ge 200 -and $statusCode -lt 300) -or ($statusCode -eq 404)
        $statusText = if ($statusCode -eq 0) { 'no response' } else { [string]$statusCode }
        Write-Check -Name "Valid JWT reaches /accounts/me (got $statusText)" -Passed $authenticated
    }
} finally {
    Stop-Job $forward3 -ErrorAction SilentlyContinue
    Remove-Job $forward3 -Force -ErrorAction SilentlyContinue
}

Write-Host '==> 5/5 Restart stability' -ForegroundColor Cyan
$restartSnapshotAfter = Get-RestartSnapshot
foreach ($service in $services) {
    $before = $restartSnapshotBefore[$service]
    $after = $restartSnapshotAfter[$service]
    $changedPods = Compare-Object -ReferenceObject $before.PodIds -DifferenceObject $after.PodIds
    $newRestarts = $after.RestartCount -gt $before.RestartCount
    $stable = (-not $newRestarts) -and ($null -eq $changedPods)
    Write-Check -Name "$service has no restarts or Pod replacement during smoke test" -Passed $stable
    Write-Host "  [INFO] $service cumulative container restarts: $($after.RestartCount)"
}

Write-Host ''
if ($script:Failures -gt 0) { Write-Host "$($script:Failures) check(s) failed." -ForegroundColor Red; exit 1 }
Write-Host 'All checks passed.' -ForegroundColor Green
exit 0