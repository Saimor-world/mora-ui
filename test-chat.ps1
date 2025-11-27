#!/usr/bin/env pwsh
# Quick Test Script - MÔRA Chat Functionality

Write-Host "🧪 MÔRA Chat Quick Test" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Check if UI is running
Write-Host "1️⃣ Checking UI Server..." -ForegroundColor Yellow
$uiProcess = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
if ($uiProcess) {
    Write-Host "   ✅ UI läuft auf http://localhost:3002" -ForegroundColor Green
} else {
    Write-Host "   ❌ UI läuft NICHT! Starte mit: npm run dev" -ForegroundColor Red
    exit 1
}

# Check if Backend is running
Write-Host "`n2️⃣ Checking Backend Server..." -ForegroundColor Yellow
$backendProcess = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if ($backendProcess) {
    Write-Host "   ✅ Backend läuft auf http://localhost:8081" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Backend läuft NICHT (optional für Chat)" -ForegroundColor Yellow
}

# Check .env.local configuration
Write-Host "`n3️⃣ Checking AI Provider Config..." -ForegroundColor Yellow
$envFile = "c:\saimor\mora-ui\.env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    if ($envContent -match "NEXT_PUBLIC_AI_PROVIDER=(\w+)") {
        $provider = $matches[1]
        Write-Host "   ✅ Provider: $provider" -ForegroundColor Green
    } else {
        Write-Host "   ❌ NEXT_PUBLIC_AI_PROVIDER nicht gesetzt!" -ForegroundColor Red
    }
    
    if ($envContent -match "NEXT_PUBLIC_AI_API_KEY=(.+)") {
        $key = $matches[1]
        if ($key -like "*<*>*" -or $key.Length -lt 10) {
            Write-Host "   ❌ API Key ist Placeholder! Ersetze mit echtem Key." -ForegroundColor Red
        } else {
            $keyPreview = $key.Substring(0, [Math]::Min(15, $key.Length)) + "..."
            Write-Host "   ✅ API Key: $keyPreview" -ForegroundColor Green
        }
    } else {
        Write-Host "   ❌ NEXT_PUBLIC_AI_API_KEY nicht gesetzt!" -ForegroundColor Red
    }
    
    if ($envContent -match "NEXT_PUBLIC_AI_MODEL=(.+)") {
        $model = $matches[1]
        Write-Host "   ✅ Model: $model" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  NEXT_PUBLIC_AI_MODEL nicht gesetzt (nutzt Default)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ .env.local nicht gefunden!" -ForegroundColor Red
    Write-Host "   💡 Kopiere .env.local.example zu .env.local" -ForegroundColor Yellow
}

# Test API endpoint
Write-Host "`n4️⃣ Testing Chat API Endpoint..." -ForegroundColor Yellow
try {
    $testBody = @{
        messages = @(
            @{ role = "user"; content = "test" }
        )
        context = @{}
        provider = "gemini"
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-WebRequest -Uri "http://localhost:3002/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $testBody `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    Write-Host "   ✅ Chat API antwortet (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode) {
        Write-Host "   ❌ Chat API Error: HTTP $statusCode" -ForegroundColor Red
        Write-Host "   💡 Schaue in Browser Console (F12) für Details" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Chat API nicht erreichbar: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Öffne Browser: http://localhost:3002" -ForegroundColor White
Write-Host "Klicke Chat-Icon (unten rechts)" -ForegroundColor White
Write-Host "Schreibe: 'Hallo Môra'" -ForegroundColor White
Write-Host "`nBei Problemen:" -ForegroundColor Yellow
Write-Host "- Schaue in Browser Console (F12)" -ForegroundColor White
Write-Host "- Lies CHAT_FIX_SUMMARY.md" -ForegroundColor White
Write-Host "- Lies AI_PROVIDER_SETUP.md" -ForegroundColor White
