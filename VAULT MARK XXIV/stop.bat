@echo off
echo V.A.U.L.T. MARK XXV durduruluyor...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8765 "') do (
    echo PID %%a kapatiliyor...
    taskkill /PID %%a /F 2>nul
)
echo Tamam. Pencereyi kapatabilirsiniz.
timeout /t 2 /nobreak >nul
