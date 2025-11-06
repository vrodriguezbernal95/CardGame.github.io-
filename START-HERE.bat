@echo off
color 0A
cls
echo.
echo ========================================================
echo            CARD GAME ANIME - INICIAR PROYECTO
echo ========================================================
echo.
echo Este script iniciara el backend y abrira el frontend
echo.
echo Presiona cualquier tecla para continuar...
pause > nul

echo.
echo [1/2] Iniciando Backend (API)...
echo.
start "Backend - Card Game API" cmd /k "cd backend && npm start"

timeout /t 3 > nul

echo.
echo [2/2] Abriendo Frontend...
echo.
echo IMPORTANTE:
echo - El backend esta corriendo en http://localhost:3000
echo - Abre el archivo: frontend\index.html en tu navegador
echo.
echo Si tienes VS Code:
echo   1. Abre la carpeta del proyecto en VS Code
echo   2. Click derecho en frontend\index.html
echo   3. Selecciona "Open with Live Server"
echo.
echo O simplemente abre: frontend\index.html con tu navegador
echo.
echo ========================================================
echo.
echo Presiona cualquier tecla para salir...
pause > nul
