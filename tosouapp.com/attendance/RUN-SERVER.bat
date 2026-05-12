@echo off
cd /d c:\tosouapp.com
if not exist package.json (
  echo ERROR: package.json not found in %cd%
  pause
  exit /b 1
)
echo.
echo ========================================
echo Starting Attendance Local Server
echo ========================================
echo.
echo UI Login: http://localhost:3000/ui/login
echo.
npm start
