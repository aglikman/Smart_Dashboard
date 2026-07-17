@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_dashboard.ps1"
endlocal
