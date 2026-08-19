# PowerShell Script to Stop Backend Server
# Usage: Right-click and select "Run with PowerShell"
# Or: powershell -ExecutionPolicy Bypass -File stop.ps1

Write-Host "🛑 Stopping Study Buddy AI Backend..." -ForegroundColor Red
Write-Host ""

# Find and stop server on port 5000
$pid = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess

if ($pid) {
    taskkill /PID $pid /F | Out-Null
    Write-Host "✅ Server stopped successfully (PID: $pid)" -ForegroundColor Green
    Write-Host "   Port 5000 is now free" -ForegroundColor Gray
} else {
    Write-Host "ℹ️  No server is running on port 5000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

