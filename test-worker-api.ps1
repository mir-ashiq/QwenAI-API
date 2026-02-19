# Test Cloudflare Worker API
Write-Host "`n================================" -ForegroundColor Yellow
Write-Host " Cloudflare Worker API Tests" -ForegroundColor Yellow
Write-Host "================================`n" -ForegroundColor Yellow

$baseUrl = "https://qwen-api-proxy.imseldrith.workers.dev"

# Test 1: Text Chat
Write-Host "[1/3] Text Chat Test" -ForegroundColor Cyan
try {
    $body = @{
        message = "What is the capital of France? One word answer."
        model = "qwen-max"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 20
    if ($response.response) {
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        Write-Host "  Response: $($response.response.Substring(0, [Math]::Min(100, $response.response.Length)))" -ForegroundColor White
    } else {
        Write-Host "  ✗ No response received" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Image Generation
Write-Host "[2/3] Image Generation Test" -ForegroundColor Cyan
try {
    $body = @{
        message = "a red apple on a white table"
        model = "qwen-vl-max"
        chatType = "t2i"
        size = "1024*1024"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 25
    if ($response.imageUrl) {
        Write-Host "  ✓ SUCCESS - Image Generated" -ForegroundColor Green
        Write-Host "  URL: $($response.imageUrl)" -ForegroundColor White
        Write-Host "  Task ID: $($response.taskId)" -ForegroundColor Gray
    } elseif ($response.taskId) {
        Write-Host "  ⟳ PROCESSING - Task ID: $($response.taskId)" -ForegroundColor Yellow
    } else {
        Write-Host "  ✗ Unexpected response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Video Generation
Write-Host "[3/3] Video Generation Test" -ForegroundColor Cyan
try {
    $body = @{
        message = "a bird flying in the sky"
        model = "qwen2-vl-7b"
        chatType = "t2v"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 25
    if ($response.videoUrl) {
        Write-Host "  ✓ SUCCESS - Video Generated" -ForegroundColor Green
        Write-Host "  URL: $($response.videoUrl)" -ForegroundColor White
    } elseif ($response.taskId) {
        Write-Host "  ⟳ PROCESSING - Task Started" -ForegroundColor Yellow
        Write-Host "  Task ID: $($response.taskId)" -ForegroundColor White
        Write-Host "  Check status: $baseUrl/api/tasks/status/$($response.taskId)" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Unexpected response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n================================" -ForegroundColor Yellow
Write-Host " Tests Complete" -ForegroundColor Yellow
Write-Host "================================`n" -ForegroundColor Yellow
