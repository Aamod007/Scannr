@echo off
echo ========================================
echo   SCANNR Local Development Launcher
echo ========================================
echo.

set ROOT=%~dp0
set VENV_PYTHON=%ROOT%.venv\Scripts\python.exe

echo Starting vision-svc on port 8001...
start "vision-svc" /D "%ROOT%services\vision-svc" "%VENV_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8001

echo Starting risk-svc on port 8002...
start "risk-svc" /D "%ROOT%services\risk-svc" "%VENV_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8002

echo Starting tariff-sync-svc on port 8003...
start "tariff-sync-svc" /D "%ROOT%services\tariff-sync-svc" "%VENV_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8003

echo Starting ml-monitor-svc on port 8004...
start "ml-monitor-svc" /D "%ROOT%services\ml-monitor-svc" "%VENV_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8004

echo Starting api-gateway on port 8000...
start "api-gateway" /D "%ROOT%services\api-gateway" "%VENV_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000

echo Starting identity-svc on port 8005...
start "identity-svc" /D "%ROOT%services\identity-svc" cmd /c "set PORT=8005 && node src/server.js"

echo Starting dashboard-svc on port 8006...
start "dashboard-svc" /D "%ROOT%services\dashboard-svc" cmd /c "set PORT=8006 && node server.js"

echo.
echo ========================================
echo   All services launched!
echo ========================================
echo.
echo Service URLs:
echo   api-gateway:     http://localhost:8000
echo   vision-svc:      http://localhost:8001
echo   risk-svc:        http://localhost:8002
echo   tariff-sync-svc: http://localhost:8003
echo   ml-monitor-svc:  http://localhost:8004
echo   identity-svc:    http://localhost:8005
echo   dashboard-svc:   http://localhost:8006
echo.
