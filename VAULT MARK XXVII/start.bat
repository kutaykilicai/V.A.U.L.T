@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem Onceki instance varsa kapat
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8765 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

rem Arkaplanda minimized pencerede baslat
start "V.A.U.L.T. MARK XXVII" /min "%~dp0launch_bg.bat"

rem Tarayici ac
timeout /t 3 /nobreak >nul
start "" "http://localhost:8765"
