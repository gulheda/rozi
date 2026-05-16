@echo off
title DisasterRoute - Baslatiliyor...
color 0A

echo.
echo  ==========================================
echo   DISASTERROUTE - BASLATILIYOR
echo  ==========================================
echo.

:: Backend'i arka planda baslat
echo [1/2] Backend baslatiliyor...
start "DisasterRoute Backend" cmd /k "cd /d C:\Users\hp\projects\rozi\backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

:: 3 saniye bekle
timeout /t 3 /nobreak >nul

:: ngrok'u baslat
echo [2/2] ngrok baslatiliyor...
start "DisasterRoute ngrok" cmd /k "ngrok http 8000"

:: 2 saniye bekle
timeout /t 2 /nobreak >nul

:: Tarayiciyi ac
echo [3/3] Tarayici aciliyor...
start chrome "http://localhost:8000"

echo.
echo  ==========================================
echo   HAZIR!
echo   Lokal:  http://localhost:8000
echo   Mobil:  https://activate-thinning-departed.ngrok-free.dev
echo  ==========================================
echo.
pause
