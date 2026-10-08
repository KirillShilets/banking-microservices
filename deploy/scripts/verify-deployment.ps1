[CmdletBinding()]
param(
    [string] $Namespace   = 'bank',
    [string] $ReleaseName = 'bank'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Failures = 0
function Write-Check {
    param([string] $Name, [bool] $Passed, [string] $Detail = '')
    if ($Passed) { Write-Host "  [PASS] $Name" -ForegroundColor Green }
    else { Write-Host "  [FAIL] $Name $Detail" -ForegroundColor Red; $script:Failures++ }
}

$services = @(
    'config-service','discovery-service','account-service','bill-service',
    'deposit-service','notification-service','gateway-service','frontend'
)

Write-Host '==> 1/5 Deployment readiness' -ForegroundColor Cyan
foreach ($service in $services) {
    $json = & kubectl -n $Namespace get deploy $service -o json 2>$null | ConvertFrom-Json
    if ($null -eq $json) { Write-Check -Name "$service exists" -Passed $false -Detail '(not found)'; continue }
    $desired = [int]$json.spec.replicas
    $ready   = 0
    if ($json.status.PSObject.Properties['readyReplicas']) { $ready = [int]$json.status.readyReplicas }
    Write-Check -Name "$service ready ($ready/$desired)" -Passed ($ready -eq $desired)
}

Write-Host '==> 2/5 Config Server content' -ForegroundColor Cyan
$forward = Start-Job -ScriptBlock { param($ns) kubectl -n $ns port-forward svc/config-service 18001:8001 } -ArgumentList $Namespace
Start-Sleep -Seconds 5
try {
    $deployment = & kubectl -n $Namespace get deploy config-service -o json | ConvertFrom-Json
    $secretName = @($deployment.spec.template.spec.containers[0].env |
            Where-Object { $_.name -eq 'SPRING_SECURITY_USER_NAME' } |
            ForEach-Object { $_.valueFrom.secretKeyRef.name })[0]
    if (-not $secretName) { throw 'config-service has no SPRING_SECURITY_USER_NAME secretKeyRef.' }
    $secret = & kubectl -n $Namespace get secret $secretName -o json | ConvertFrom-Json
    $user = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($secret.data.SPRING_SECURITY_USER_NAME))
    $pass = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($secret.data.SPRING_SECURITY_PASSWORD))
    $auth = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${user}:${pass}"))
    foreach ($app in 'account-service','bill-service','deposit-service','notification-service') {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:18001/${app}/default" `
                -Headers @{ Authorization = $auth } -UseBasicParsing -TimeoutSec 15
            Write-Check -Name "Config Server serves $app" -Passed ($response.StatusCode -eq 200)
        } catch {
            Write-Check -Name "Config Server serves $app" -Passed $false -Detail $_.Exception.Message
        }
    }
} finally {
    Stop-Job $forward -ErrorAction SilentlyContinue
    Remove-Job $forward -Force -ErrorAction SilentlyContinue
}

Write-Host '==> 3/5 Eureka registrations' -ForegroundColor Cyan
$forward2 = Start-Job -ScriptBlock { param($ns) kubectl -n $ns port-forward svc/discovery-service 18761:8761 } -ArgumentList $Namespace
Start-Sleep -Seconds 5
try {
    $apps = Invoke-RestMethod -Uri 'http://localhost:18761/eureka/apps' `
        -Headers @{ Accept = 'application/json' } -TimeoutSec 15
    $registered = @($apps.applications.application | ForEach-Object { $_.name.ToUpperInvariant() })
    foreach ($app in 'ACCOUNT-SERVICE','BILL-SERVICE','DEPOSIT-SERVICE','NOTIFICATION-SERVICE','GATEWAY-SERVICE') {
        Write-Check -Name "Eureka has $app" -Passed ($registered -contains $app)
    }
} catch {
    Write-Check -Name 'Eureka query' -Passed $false -Detail $_.Exception.Message
} finally {
    Stop-Job $forward2 -ErrorAction SilentlyContinue
    Remove-Job $forward2 -Force -ErrorAction SilentlyContinue
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
} finally {
    Stop-Job $forward3 -ErrorAction SilentlyContinue
    Remove-Job $forward3 -Force -ErrorAction SilentlyContinue
}

Write-Host '==> 5/5 Restart stability' -ForegroundColor Cyan
foreach ($service in $services) {
    $raw = & kubectl -n $Namespace get pods -l "app.kubernetes.io/name=$service" `
        -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}' 2>$null
    if ([string]::IsNullOrWhiteSpace($raw)) { continue }
    $max = ($raw -split '\s+' | Where-Object { $_ -match '^\d+$' } | ForEach-Object { [int]$_ } |
            Measure-Object -Maximum).Maximum
    Write-Check -Name "$service restarts <= 1 (max $max)" -Passed ($max -le 1)
}

Write-Host ''
if ($script:Failures -gt 0) { Write-Host "$($script:Failures) check(s) failed." -ForegroundColor Red; exit 1 }
Write-Host 'All checks passed.' -ForegroundColor Green
exit 0