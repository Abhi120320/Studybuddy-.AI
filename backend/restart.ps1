# PowerShell Script to Restart Backend Server
# Usage: Right-click and select "Run with PowerShell"
# Or: powershell -ExecutionPolicy Bypass -File restart.ps1

Write-Host "🔄 Restarting Study Buddy AI Backend..." -ForegroundColor Cyan
Write-Host ""

# Stop existing server on port 5000
Write-Host "🛑 Stopping existing server..." -ForegroundColor Yellow
$pid = (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess

if ($pid) {
    taskkill /PID $pid /F | Out-Null
    Write-Host "✅ Stopped old server (PID: $pid)" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No server was running" -ForegroundColor Gray
}

# Wait a moment
Write-Host "⏳ Waiting..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# Start new server
Write-Host "🚀 Starting backend server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
npm start

