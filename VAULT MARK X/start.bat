@echo off
title V.A.U.L.T. MARK X
cd /d "%~dp0"
echo.
echo   V.A.U.L.T. MARK X -- Virtual Assistant for Universal ^& Local Tasks
echo   ================================================================
echo   Starting backend on http://localhost:8765
echo.
python vault_backend.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend failed to start. Check Python and dependencies.
    echo Run: pip install -r requirements.txt
    pause
)
