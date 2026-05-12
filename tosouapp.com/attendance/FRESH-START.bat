@echo off
REM Start server with NODE_ENV=production to avoid any require cache issues

echo.
echo ========================================
echo Starting Server - Fresh Instance
echo ========================================
echo.

REM Kill any existing Node processes
taskkill /F /IM node.exe >nul 2>&1

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Navigate to workspace root (contains package.json)
cd /d c:\tosouapp.com
if not exist package.json (
  echo ERROR: package.json not found in %cd%
  pause
  exit /b 1
)

REM Start fresh server
echo Starting npm...
echo UI Login: http://localhost:3000/ui/login
echo.
npm start

pause
