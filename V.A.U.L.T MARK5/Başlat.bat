@echo off
title V.A.U.L.T. MK5 Sunucusu

echo V.A.U.L.T. MK5 Başlatılıyor...
echo.

echo Arka plan sunucusu başlatılıyor...
:: Python sunucusunu yeni bir pencerede başlat
start "VAULT MK5 Backend" python VAULT_MK5_backend.py

echo Arayuzun baslamasi icin 5 saniye bekleniyor...
:: Sunucunun tam olarak başlaması için kısa bir bekleme
timeout /t 5 /nobreak > nul

echo Arayuz baslatiliyor...
:: Varsayılan tarayıcıda arayüzü aç
start http://127.0.0.1:5000

exit