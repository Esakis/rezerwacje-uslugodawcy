@echo off
setlocal enabledelayedexpansion
title BookEasy - lokalny start
cd /d "%~dp0"

echo ========================================
echo   BookEasy - uruchamianie lokalne
echo ========================================
echo.

REM --- 1. Zabij proces zajmujacy port 3000 (poprzednia instancja) ---
echo [1/4] Sprawdzam port 3000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo    Zabijam proces PID %%P na porcie 3000...
    taskkill /F /PID %%P >nul 2>&1
)

REM --- 2. Instalacja zaleznosci jesli brak node_modules ---
if not exist "node_modules" (
    echo [2/4] Brak node_modules - instaluje zaleznosci...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo    BLAD instalacji zaleznosci.
        pause
        exit /b 1
    )
    echo    Generuje klienta Prisma...
    call npx prisma generate
) else (
    echo [2/4] Zaleznosci juz zainstalowane - pomijam.
)

REM --- 3. Baza danych: utworz jesli brak i zasil danymi demo ---
if not exist "prisma\dev.db" (
    echo [3/4] Brak bazy - tworze i zasilam danymi demo...
    call npm run db:push
    call npm run db:seed
) else (
    echo [3/4] Baza danych istnieje - pomijam.
)

REM --- 4. Start aplikacji ---
echo [4/4] Uruchamiam aplikacje...
echo.
echo    Panel:      http://localhost:3000/login  (demo@bookeasy.pl / demo1234)
echo    Rezerwacja: http://localhost:3000/studio-anna
echo.
echo    Zatrzymanie: Ctrl+C
echo ========================================
echo.

call npm run dev

endlocal
