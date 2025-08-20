@echo off
echo Starting VAULT MK8 Backend...
echo.

:: Set environment variables
set GEMINI_API_KEY=AIzaSyBsj2k7ypQd4-iCIbnorH9S2NRUV-2AnQ
set N8N_BASIC_AUTH_ACTIVE=false
set N8N_SECURE_COOKIE=false
set WEBHOOK_URL=http://localhost:5678
set N8N_HOST=0.0.0.0
set N8N_PORT=5678
set N8N_PROTOCOL=http

echo Environment variables set:
echo GEMINI_API_KEY: %GEMINI_API_KEY:~0,20%...
echo N8N_HOST: %N8N_HOST%
echo N8N_PORT: %N8N_PORT%
echo.

echo Starting n8n server...
n8n start

echo.
echo VAULT MK8 Backend stopped.
pause
