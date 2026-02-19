@echo off
echo ========================================
echo    SCANNR - Start All Services
echo ========================================
echo.

REM Change to project directory
cd /d "%~dp0"

REM Kill any existing Node and Python processes
echo Stopping any existing services...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting SCANNR services...
echo.

REM Terminal 1: Dashboard (Port 8000)
start "SCANNR Dashboard" cmd /k "cd services\dashboard-svc && echo Starting Dashboard on port 8000... && node server.js"
timeout /t 2 /nobreak >nul

REM Terminal 2: Vision AI Service (Port 8001)
start "SCANNR Vision AI" cmd /k "cd services\vision-svc && echo Starting Vision AI on port 8001... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"
timeout /t 2 /nobreak >nul

REM Terminal 3: Risk Scoring Service (Port 8002)
start "SCANNR Risk" cmd /k "cd services\risk-svc && echo Starting Risk Service on port 8002... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002"
timeout /t 2 /nobreak >nul

REM Terminal 4: ML Monitor Service (Port 8004)
start "SCANNR ML Monitor" cmd /k "cd services\ml-monitor-svc && echo Starting ML Monitor on port 8004... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8004"
timeout /t 2 /nobreak >nul

REM Terminal 5: Identity Service (Port 8005)
start "SCANNR Identity" cmd /k "cd services\identity-svc && echo Starting Identity Service on port 8005... && node src/server.js"
timeout /t 2 /nobreak >nul

REM Terminal 6: API Gateway (Port 8006)
start "SCANNR API Gateway" cmd /k "cd services\api-gateway && echo Starting API Gateway on port 8006... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8006"

echo.
echo ========================================
echo    All services started!
echo ========================================
echo.
echo Service URLs:
echo   Dashboard:      http://localhost:8000
echo   Vision AI:      http://localhost:8001
echo   Risk Scoring:   http://localhost:8002
echo   ML Monitor:     http://localhost:8004
echo   Identity:       http://localhost:8005
echo   API Gateway:    http://localhost:8006
echo.
pause
