@echo off
echo ========================================
echo    SCANNR - Stop All Services
echo ========================================
echo.

echo Stopping Node.js processes...
taskkill /F /IM node.exe 2>nul

echo Stopping Python processes...
taskkill /F /IM python.exe 2>nul

echo.
echo All services stopped!
echo.
pause
