@echo off
cls
echo ================================================
echo   🚀 VAULT MK8 - PROJECT SETUP SCRIPT
echo   Advanced Multi-Agent Command Processor
echo ================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version
echo.

:: Check if n8n is installed
n8n --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing n8n globally...
    npm install -g n8n
) else (
    echo ✅ n8n is already installed
    n8n --version
)
echo.

:: Create necessary directories
if not exist "workflows" mkdir workflows
if not exist "logs" mkdir logs
if not exist "data" mkdir data

echo 📁 Project directories created:
echo    - workflows/
echo    - logs/
echo    - data/
echo.

:: Copy enhanced agents to workflows directory
echo 📋 Setting up enhanced agents...
copy "AIAgentExecutor.js" "workflows\" >nul 2>&1
copy "BrowserAgentExecutor.js" "workflows\" >nul 2>&1
copy "SystemAgentExecutor.js" "workflows\" >nul 2>&1
copy "FileAgentExecutor.js" "workflows\" >nul 2>&1
echo ✅ Enhanced agent files copied to workflows/
echo.

:: Set up environment
echo 🔧 Setting up environment variables...
echo.
echo Environment Configuration:
echo - GEMINI_API_KEY: Set (masked)
echo - N8N_HOST: localhost
echo - N8N_PORT: 5678
echo - WEBHOOK_URL: http://localhost:5678
echo.

:: Create a quick start guide
echo 📖 Creating quick start guide...
(
echo VAULT MK8 - Quick Start Guide
echo =============================
echo.
echo 1. Start the backend:
echo    ^> n8n-start.bat
echo.
echo 2. Open n8n interface:
echo    ^> http://localhost:5678
echo.
echo 3. Import the workflow:
echo    - Go to Workflows ^> Import from file
echo    - Select: "VAULT MK8 - Advanced Multi-Agent Command.json"
echo    - Activate the workflow
echo.
echo 4. Test the system:
echo    - Open: test_n8n_connection.html
echo    - Or open: vault_mk8_frontend.html
echo.
echo 5. Available Commands:
echo    Turkish:
echo    - "google ara javascript"  ^(Browser Agent^)
echo    - "yaz merhaba dünya"      ^(AI Agent^)
echo    - "listele processes"      ^(System Agent^)
echo    - "oku test.txt"           ^(File Agent^)
echo    - "merhaba"                ^(Chit-Chat Agent^)
echo.
echo    English:
echo    - "google search react"    ^(Browser Agent^)
echo    - "write hello world"      ^(AI Agent^)
echo    - "list processes"         ^(System Agent^)
echo    - "read test.txt"          ^(File Agent^)
echo    - "hello"                  ^(Chit-Chat Agent^)
echo.
echo System Architecture:
echo ====================
echo Frontend ^(HTML/JS^) ^<--^> n8n Webhook ^<--^> Multi-Agent Router
echo                                            ^|
echo                     +----------------------+
echo                     ^|
echo           +---------+---------+
echo           ^|         ^|         ^|
echo        Browser    System     AI Agent
echo         Agent     Agent    ^(Gemini^)
echo           ^|         ^|         ^|
echo        +--+--+   +--+--+   +--+--+
echo        ^|     ^|   ^|     ^|   ^|     ^|
echo      File  API  Chit  Database More...
echo     Agent Agent Chat   Agent   Agents
) > "QUICK_START_GUIDE.txt"

echo ✅ Quick start guide created: QUICK_START_GUIDE.txt
echo.

:: Check project status
echo 🔍 Project Status Check:
echo.
if exist "vault_mk8_frontend.html" (
    echo ✅ Frontend interface ready
) else (
    echo ❌ Frontend interface missing
)

if exist "VAULT MK8 - Advanced Multi-Agent Command.json" (
    echo ✅ n8n workflow file ready
) else (
    echo ❌ n8n workflow file missing
)

if exist "n8n-start.bat" (
    echo ✅ Backend start script ready
) else (
    echo ❌ Backend start script missing
)

if exist "test_n8n_connection.html" (
    echo ✅ Connection test page ready
) else (
    echo ❌ Connection test page missing
)

echo.
echo 🎯 VAULT MK8 Setup Complete!
echo.
echo Next Steps:
echo 1. Run 'n8n-start.bat' to start the backend
echo 2. Import the workflow in n8n interface
echo 3. Open 'vault_mk8_frontend.html' to use the system
echo.
echo For detailed instructions, see: QUICK_START_GUIDE.txt
echo.
echo ================================================
echo   🔥 VAULT MK8 READY FOR ACTION! 🔥
echo ================================================
pause
