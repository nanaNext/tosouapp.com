@echo off
cd /d c:\tosouapp.com
if not exist package.json (
  echo ERROR: package.json not found in %cd%
  pause
  exit /b 1
)
echo Starting local server from %cd% ...
echo UI Login: http://localhost:3000/ui/login
echo.
npm start
