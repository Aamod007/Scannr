# Test runner for all SCANNR services
# Run this from project root

$services = @(
    @{ Name = "API Gateway"; Path = "services/api-gateway"; Port = 8006 },
    @{ Name = "Vision AI"; Path = "services/vision-svc"; Port = 8001 },
    @{ Name = "Risk Scoring"; Path = "services/risk-svc"; Port = 8002 },
    @{ Name = "ML Monitor"; Path = "services/ml-monitor-svc"; Port = 8004 }
)

$totalPassed = 0
$totalFailed = 0

Write-Host "======================================"
Write-Host "SCANNR - Running All Tests"
Write-Host "======================================"
Write-Host ""

foreach ($service in $services) {
    Write-Host "Testing $($service.Name)..." -ForegroundColor Yellow
    
    Push-Location $service.Path
    
    $result = python -m pytest tests/ -v 2>&1
    $exitCode = $LASTEXITCODE
    
    Pop-Location
    
    if ($exitCode -eq 0) {
        Write-Host "  ✓ All tests passed" -ForegroundColor Green
        $totalPassed++
    } else {
        Write-Host "  ✗ Some tests failed" -ForegroundColor Red
        $totalFailed++
    }
    Write-Host ""
}

# Run security tests
Write-Host "Testing Security..." -ForegroundColor Yellow
$result = python -m pytest tests/security/ -v 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host "  ✓ All security tests passed" -ForegroundColor Green
    $totalPassed++
} else {
    Write-Host "  ✗ Some security tests failed" -ForegroundColor Red
    $totalFailed++
}
Write-Host ""

Write-Host "======================================"
Write-Host "Test Summary"
Write-Host "======================================"
Write-Host "Passed: $totalPassed" -ForegroundColor Green
Write-Host "Failed: $totalFailed" -ForegroundColor Red
Write-Host ""

if ($totalFailed -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Some tests failed" -ForegroundColor Red
    exit 1
}
