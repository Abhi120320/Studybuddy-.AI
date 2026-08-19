# PowerShell Script to Start Backend Server
# Usage: Right-click and select "Run with PowerShell"
# Or: powershell -ExecutionPolicy Bypass -File start.ps1

Write-Host "🚀 Starting Study Buddy AI Backend..." -ForegroundColor Green
Write-Host ""

# Check if port is already in use
$pid = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess

if ($pid) {
    Write-Host "⚠️  Port 5000 is already in use (PID: $pid)" -ForegroundColor Yellow
    Write-Host "   Do you want to stop it and restart? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "Y" -or $response -eq "y") {
        taskkill /PID $pid /F | Out-Null
        Write-Host "✅ Stopped old server" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "❌ Cancelled" -ForegroundColor Red
        Write-Host ""
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit
    }
}

# Start the server
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
npm start

