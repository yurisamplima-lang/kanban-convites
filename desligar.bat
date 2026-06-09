@echo off
echo.
echo  Desligando Convites da Kah...
echo.

cd /d "%~dp0"

echo  [1/2] Parando backend e frontend...
taskkill /FI "WINDOWTITLE eq Backend CRM*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend CRM*" /F > nul 2>&1

echo  [2/2] Parando Evolution API e Redis...
docker compose down

echo.
echo  Tudo desligado. Ate logo!
echo.
pause
