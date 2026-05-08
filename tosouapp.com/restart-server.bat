@echo off
cd /d c:\tosouapp.com
echo Stopping Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak
echo Starting server...
npm start
pause
