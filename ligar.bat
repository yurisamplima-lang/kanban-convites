@echo off
echo.
echo Ligando Convites da Kah...
echo.

set "PROJ=%~dp0"

:: Verifica se Docker esta respondendo
docker info > nul 2>&1
if errorlevel 1 (
    echo Docker nao esta rodando. Iniciando Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Aguardando Docker inicializar (pode levar 30-60 segundos)...
    :aguarda_docker
    timeout /t 5 /nobreak > nul
    docker info > nul 2>&1
    if errorlevel 1 goto aguarda_docker
    echo Docker pronto!
    echo.
)

echo [1/3] Subindo Evolution API e Redis...
cd /d "%PROJ%"
docker compose up -d
if errorlevel 1 (
    echo ERRO ao subir containers.
    pause
    exit /b 1
)

echo.
echo [2/3] Iniciando backend...
start "Backend CRM" cmd /k "cd /d "%PROJ%backend" && npm run dev"

timeout /t 3 /nobreak > nul

echo [3/3] Iniciando frontend...
start "Frontend CRM" cmd /k "cd /d "%PROJ%frontend" && npm run dev"

echo.
echo Tudo ligado! Acesse: http://localhost:5173
echo.
pause
