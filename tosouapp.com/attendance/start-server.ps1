#!/usr/bin/env pwsh

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Attendance Local Server Startup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Navigate to workspace root (contains package.json)
Set-Location "c:\tosouapp.com"

if (-not (Test-Path ".\package.json")) {
  Write-Host "ERROR: package.json not found in $(Get-Location)" -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host "Starting Node.js server..." -ForegroundColor Green
Write-Host "Location: $(Get-Location)" -ForegroundColor Yellow
Write-Host "UI Login: http://localhost:3000/ui/login" -ForegroundColor Yellow
Write-Host ""

# Start npm
npm start

# If npm start exits, show message
Write-Host "`nServer stopped" -ForegroundColor Red
Read-Host "Press Enter to close"
