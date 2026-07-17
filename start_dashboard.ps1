param(
  [switch]$NoBrowser,
  [switch]$Classic
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 3001
$DashboardPath = if ($Classic) { "/" } else { "/outputs/versions/smart-dashboard-v2-2026-07-17/giliguli_dashboard_v2.html" }
$DashboardUrl = "http://localhost:$Port$DashboardPath"
$HealthUrl = "http://localhost:$Port/health"
$LogDir = Join-Path $Root 'logs'
$OutLog = Join-Path $LogDir 'dashboard-proxy.out.log'
$ErrLog = Join-Path $LogDir 'dashboard-proxy.err.log'

function Test-DashboardProxy {
  try {
    $response = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 2
    return ($response.status -eq 'ok')
  } catch {
    return $false
  }
}

Set-Location $Root

if (-not (Test-DashboardProxy)) {
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  $node = (Get-Command node -ErrorAction Stop).Source
  Start-Process -FilePath $node -ArgumentList 'scalla_proxy.js' -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog | Out-Null

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-DashboardProxy) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    Write-Host 'Smart Dashboard proxy failed to start.' -ForegroundColor Red
    Write-Host "Check logs:" -ForegroundColor Yellow
    Write-Host "  $OutLog"
    Write-Host "  $ErrLog"
    exit 1
  }
}

Write-Host "Smart Dashboard proxy is running: $HealthUrl" -ForegroundColor Green
if (-not $NoBrowser) {
  Write-Host "Opening Smart Dashboard: $DashboardUrl" -ForegroundColor Green
  Start-Process $DashboardUrl
} else {
  Write-Host "Smart Dashboard URL: $DashboardUrl" -ForegroundColor Green
}

