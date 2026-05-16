@echo off
title DisasterRoute - Baslatiliyor...
color 0A

echo.
echo  ==========================================
echo   DISASTERROUTE - BASLATILIYOR
echo  ==========================================
echo.

:: Backend'i baslat (yeni sms.py kodunu almasi icin)
echo [1/3] Backend baslatiliyor (port 8000)...
start "DisasterRoute Backend" cmd /k "cd /d C:\Users\hp\projects\rozi\backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

:: ngrok'u STATIK DOMAIN ile baslat
:: NOT: activate-thinning-departed.ngrok-free.dev senin statik domainin.
:: Eger degistiyse: ngrok dashboard -> Domains -> kopyala
echo [2/3] ngrok baslatiliyor (statik domain)...
start "DisasterRoute ngrok" cmd /k "ngrok http 8000 --domain=activate-thinning-departed.ngrok-free.dev"

timeout /t 3 /nobreak >nul

:: Frontend dev server
echo [3/3] Frontend baslatiliyor...
start "DisasterRoute Frontend" cmd /k "cd /d C:\Users\hp\projects\rozi\frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo  ==========================================
echo   HAZIR!
echo.
echo   Lokal  : http://localhost:5173
echo   Backend: http://localhost:8000
echo   Public : https://activate-thinning-departed.ngrok-free.dev
echo.
echo   Twilio Webhook URL:
echo   https://activate-thinning-departed.ngrok-free.dev/sms/webhook
echo.
echo   Panel Sifresi: AFET2026
echo  ==========================================
echo.
echo  [!] Twilio'da webhook sunu kontrol et:
echo      https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
echo      "A message comes in" alani:
echo      https://activate-thinning-departed.ngrok-free.dev/sms/webhook
echo.
pause
