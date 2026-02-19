# Simple API test with error details
$baseUrl = "https://qwen-api-proxy.imseldrith.workers.dev"

Write-Host "`nTesting API with error details..." -ForegroundColor Cyan

try {
    $body = @{
        message = "Hello"
        model = "qwen-max"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 20
    
    Write-Host "`nSuccess!" -ForegroundColor Green
    Write-Host $response.Content
    
} catch {
    Write-Host "`nError occurred:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nError Details:" -ForegroundColor Yellow
        $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error: $($errorJson.error)" -ForegroundColor Red
        if ($errorJson.details) {
            Write-Host "Details: $($errorJson.details)" -ForegroundColor Red
        }
    } else {
        Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
    }
}
