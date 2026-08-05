# ============================================
# Script para Rodar App React Native
# ============================================

Write-Host "`n=== FARMSILO APP - REACT NATIVE ===" -ForegroundColor Cyan
Write-Host "Branch: test-feature`n" -ForegroundColor Yellow

# 1. Verificar dispositivos conectados
Write-Host "1. Verificando dispositivos conectados..." -ForegroundColor Green
adb devices -l

$devices = adb devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "`n⚠️  NENHUM DISPOSITIVO ENCONTRADO!" -ForegroundColor Red
    Write-Host "`nOpções:" -ForegroundColor Yellow
    Write-Host "  1. Conecte um celular via USB (modo depuração ativado)"
    Write-Host "  2. Inicie um emulador: emulator -avd Pixel_5"
    Write-Host "`nApós conectar, execute este script novamente.`n"
    exit
}

Write-Host "`n✅ Dispositivo encontrado!`n" -ForegroundColor Green

# 2. Verificar se node_modules existe
if (-Not (Test-Path "node_modules")) {
    Write-Host "2. Instalando dependências (npm install)..." -ForegroundColor Green
    npm install
} else {
    Write-Host "2. ✅ Dependências já instaladas (node_modules existe)`n" -ForegroundColor Green
}

# 3. Perguntar o que fazer
Write-Host "=== O QUE VOCÊ QUER FAZER? ===" -ForegroundColor Cyan
Write-Host "1. Iniciar Metro Bundler (npm start)"
Write-Host "2. Rodar app no Android (npm run android)"
Write-Host "3. Ambos (Metro + Android)"
Write-Host "4. Limpar cache e rodar (--reset-cache)"
Write-Host "5. Ver logs do app (logcat)"
Write-Host ""

$choice = Read-Host "Escolha uma opção (1-5)"

switch ($choice) {
    "1" {
        Write-Host "`nIniciando Metro Bundler...`n" -ForegroundColor Green
        npm start
    }
    "2" {
        Write-Host "`nRodando app no Android...`n" -ForegroundColor Green
        npm run android
    }
    "3" {
        Write-Host "`nIniciando Metro Bundler em background...`n" -ForegroundColor Green
        Start-Job -ScriptBlock { npm start }
        Start-Sleep -Seconds 5
        Write-Host "`nRodando app no Android...`n" -ForegroundColor Green
        npm run android
    }
    "4" {
        Write-Host "`nLimpando cache...`n" -ForegroundColor Green
        npm start -- --reset-cache
    }
    "5" {
        Write-Host "`nVendo logs do app (Ctrl+C para sair)...`n" -ForegroundColor Green
        adb logcat | Select-String "ReactNative|farmsilo"
    }
    default {
        Write-Host "`n❌ Opção inválida!`n" -ForegroundColor Red
    }
}
