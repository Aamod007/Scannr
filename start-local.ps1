# SCANNR Local Development Launcher
# Starts all services without Docker
# Usage: .\start-local.ps1

$ErrorActionPreference = "Continue"
$ROOT = $PSScriptRoot
$VENV_PYTHON = "$ROOT\.venv\Scripts\python.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SCANNR Local Development Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes on our ports
$ports = @(8000, 8001, 8002, 8003, 8004, 8005, 8006)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
    if ($proc) {
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
        Write-Host "Killed process on port $port" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 1

# --- Python Services ---
$pythonServices = @(
    @{ Name = "vision-svc";      Port = 8001; Dir = "$ROOT\services\vision-svc" },
    @{ Name = "risk-svc";        Port = 8002; Dir = "$ROOT\services\risk-svc" },
    @{ Name = "tariff-sync-svc"; Port = 8003; Dir = "$ROOT\services\tariff-sync-svc" },
    @{ Name = "ml-monitor-svc";  Port = 8004; Dir = "$ROOT\services\ml-monitor-svc" }
)

$jobs = @()

foreach ($svc in $pythonServices) {
    Write-Host "Starting $($svc.Name) on port $($svc.Port)..." -ForegroundColor Green
    $job = Start-Process -FilePath $VENV_PYTHON `
        -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "$($svc.Port)" `
        -WorkingDirectory $svc.Dir `
        -PassThru -NoNewWindow
    $jobs += $job
    Start-Sleep -Milliseconds 500
}

# --- API Gateway (port 8000) ---
Write-Host "Starting api-gateway on port 8000..." -ForegroundColor Green
$gwJob = Start-Process -FilePath $VENV_PYTHON `
    -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory "$ROOT\services\api-gateway" `
    -PassThru -NoNewWindow
$jobs += $gwJob

# --- Node.js Services ---
Write-Host "Starting identity-svc on port 8005..." -ForegroundColor Green
$idJob = Start-Process -FilePath "node" `
    -ArgumentList "src/server.js" `
    -WorkingDirectory "$ROOT\services\identity-svc" `
    -PassThru -NoNewWindow
$jobs += $idJob

Write-Host "Starting dashboard-svc on port 8006..." -ForegroundColor Green
$dashJob = Start-Process -FilePath "node" `
    -ArgumentList "server.js" `
    -WorkingDirectory "$ROOT\services\dashboard-svc" `
    -PassThru -NoNewWindow
$jobs += $dashJob

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All services starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor White
Write-Host "  api-gateway:     http://localhost:8000" -ForegroundColor Gray
Write-Host "  vision-svc:      http://localhost:8001" -ForegroundColor Gray
Write-Host "  risk-svc:        http://localhost:8002" -ForegroundColor Gray
Write-Host "  tariff-sync-svc: http://localhost:8003" -ForegroundColor Gray
Write-Host "  ml-monitor-svc:  http://localhost:8004" -ForegroundColor Gray
Write-Host "  identity-svc:    http://localhost:8005" -ForegroundColor Gray
Write-Host "  dashboard-svc:   http://localhost:8006" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Wait and cleanup on exit
try {
    while ($true) { Start-Sleep -Seconds 5 }
} finally {
    Write-Host "Stopping all services..." -ForegroundColor Red
    foreach ($job in $jobs) {
        if (!$job.HasExited) {
            Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
