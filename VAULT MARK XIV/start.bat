@echo off
title V.A.U.L.T. MARK XIV
cd /d "%~dp0"
echo.
echo   V.A.U.L.T. MARK XIV -- Agentic OS Edition
echo   ============================================
echo   Backend: http://localhost:8765
echo.
echo   [Checking Playwright Chromium...]
python -m playwright install chromium --quiet 2>nul
echo   [Ready]
echo.
python vault_backend.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Start failed. Run: pip install -r requirements.txt
    pause
)
