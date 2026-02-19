# Debug test - check raw response
$body = '{"message":"test","model":"qwen-max"}'

try {
    $response = Invoke-WebRequest -Uri "https://qwen-api-proxy.imseldrith.workers.dev/api/chat" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
    
    Write-Host "`nStatus: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "`nFull Response:" -ForegroundColor Cyan
    $json = $response.Content | ConvertFrom-Json
    Write-Host ($json | ConvertTo-Json -Depth 10)
    
    Write-Host "`n`nContent Field: '$($json.response)'" -ForegroundColor Yellow
    Write-Host "Content Length: $($json.response.Length)" -ForegroundColor Yellow
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
