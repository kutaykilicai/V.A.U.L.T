@echo off
title V.A.U.L.T. MK6 Sunucusu

echo V.A.U.L.T. MK6 Baslatiliyor...
echo.

echo Arka plan sunucusu baslatiliyor...
:: Python sunucusunu yeni bir pencerede baslat
start "VAULT MK6 Backend" python VAULT_MK6_backend.py

echo Arayuzun baslamasi icin 5 saniye bekleniyor...
:: Sunucunun tam olarak baslamasi icin kisa bir bekleme
timeout /t 5 /nobreak > nul

echo Arayuz baslatiliyor...
:: Varsayilan tarayicida arayuzu ac
start http://127.0.0.1:5000

exit