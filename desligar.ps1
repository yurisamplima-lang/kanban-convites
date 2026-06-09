Write-Host ""
Write-Host "Desligando Convites da Kah..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Parando backend e frontend..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host ""
Write-Host "Tudo desligado. (Evolution API continua no Railway)" -ForegroundColor Green
Write-Host ""
Read-Host "Pressione Enter para fechar"
