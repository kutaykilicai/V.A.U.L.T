@echo off
title V.A.U.L.T. MARK XIII
cd /d "%~dp0"
echo.
echo   V.A.U.L.T. MARK XIII -- Real Terminal Hub
echo   =========================================
echo   Backend: http://localhost:8765
echo.
python vault_backend.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Start failed. Run: pip install -r requirements.txt
    pause
)
