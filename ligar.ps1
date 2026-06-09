$proj = $PSScriptRoot

Write-Host ""
Write-Host "Ligando Convites da Kah..." -ForegroundColor Cyan
Write-Host "(Evolution API rodando no Railway - sem Docker necessario)" -ForegroundColor DarkGray
Write-Host ""

Write-Host "[1/2] Iniciando backend..." -ForegroundColor Yellow
Start-Process "cmd" -ArgumentList "/k cd /d `"$proj\backend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[2/2] Iniciando frontend..." -ForegroundColor Yellow
Start-Process "cmd" -ArgumentList "/k cd /d `"$proj\frontend`" && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Tudo ligado! Acesse: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Read-Host "Pressione Enter para fechar"
