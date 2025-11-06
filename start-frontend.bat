@echo off
echo.
echo ================================================
echo   INICIANDO FRONTEND - Card Game Anime
echo ================================================
echo.
echo El frontend se abrira en: http://localhost:8080
echo.
echo Para detener el servidor presiona Ctrl+C
echo.
echo ================================================
echo.

cd frontend
python -m http.server 8080 2>nul || (
    echo Python no encontrado, intentando con PHP...
    php -S localhost:8080 2>nul || (
        echo.
        echo ERROR: No se encontro ni Python ni PHP
        echo.
        echo Por favor instala Python o usa Live Server en VS Code
        echo.
        pause
    )
)
