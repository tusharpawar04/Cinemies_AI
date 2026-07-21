# Start the Cinemies AI server
Write-Host "Starting Cinemies AI Recommendation Engine..." -ForegroundColor Green
Write-Host "Working directory: $(Get-Location)" -ForegroundColor Cyan

# Activate virtual environment if it exists
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & .venv\Scripts\Activate.ps1
}

# Start uvicorn server
Write-Host "Starting uvicorn server on port 8000..." -ForegroundColor Yellow
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
