# PowerShell Script to Start All Cinemies Servers
# Run this with: ./start-servers.ps1

Write-Host "Starting Cinemies Application..." -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Check dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow

$missingDeps = @()

if (-not (Test-Command "node")) {
    $missingDeps += "Node.js"
}

if (-not (Test-Command "python")) {
    $missingDeps += "Python"
}

if (-not (Test-Command "npm")) {
    $missingDeps += "npm"
}

if ($missingDeps.Count -gt 0) {
    Write-Host "Missing dependencies: $($missingDeps -join ', ')" -ForegroundColor Red
    Write-Host "Please install missing dependencies and try again." -ForegroundColor Red
    exit 1
}

Write-Host "All dependencies found" -ForegroundColor Green
Write-Host ""

# Check if services are running by testing their default ports
Write-Host "Checking database services..." -ForegroundColor Yellow

function Test-Port {
    param($Port, $Name)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait) {
            $tcp.EndConnect($connect)
            $tcp.Close()
            Write-Host "$Name is running on port $Port" -ForegroundColor Green
            return $true
        }
        $tcp.Close()
        Write-Host "$Name may not be running on port $Port" -ForegroundColor Yellow
        return $false
    } catch {
        Write-Host "Could not check $Name status on port $Port" -ForegroundColor Yellow
        return $false
    }
}

$servicesOk = $true

# Check PostgreSQL
if (-not (Test-Port 5432 "PostgreSQL")) {
    $servicesOk = $false
}

# Check MongoDB
if (-not (Test-Port 27017 "MongoDB")) {
    $servicesOk = $false
}

# Check Redis
if (-not (Test-Port 6379 "Redis")) {
    $servicesOk = $false
}

if (-not $servicesOk) {
    Write-Host ""
    Write-Host "Some database services may not be running." -ForegroundColor Yellow
    Write-Host "You may need to start them manually:" -ForegroundColor Yellow
    Write-Host "  - PostgreSQL: net start postgresql-x64-<version>" -ForegroundColor Gray
    Write-Host "  - MongoDB: net start MongoDB" -ForegroundColor Gray
    Write-Host "  - Redis: redis-server" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""
Write-Host "Opening 4 new terminal windows..." -ForegroundColor Cyan
Write-Host ""

# Terminal 1: Backend
Write-Host "Starting Backend (Node.js)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd cinemies-backend; Write-Host 'BACKEND SERVER' -ForegroundColor Blue; npm run dev"

Start-Sleep -Seconds 2

# Terminal 2: Seed Script (one-time)
Write-Host "Running Calibration Movies Seed..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd cinemies-backend; Write-Host 'SEEDING CALIBRATION MOVIES' -ForegroundColor Green; Start-Sleep -Seconds 5; node database/seed-calibration-movies.js; Write-Host ''; Write-Host 'Seeding complete. You can close this window.' -ForegroundColor Green"

Start-Sleep -Seconds 1

# Terminal 3: AI Engine
Write-Host "Starting AI Engine (Python)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd cinemies-ai; Write-Host 'AI ENGINE' -ForegroundColor Yellow; .venv\Scripts\activate; python -m uvicorn main:app --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 2

# Terminal 4: Frontend
Write-Host "Starting Frontend (React)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd cinemies-frontend; Write-Host 'FRONTEND' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "All servers starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Wait about 10-15 seconds for all servers to initialize, then:" -ForegroundColor Yellow
Write-Host "  - Frontend: http://localhost:3003" -ForegroundColor Cyan
Write-Host "  - Backend: http://localhost:5000" -ForegroundColor Blue
Write-Host "  - AI Engine: http://localhost:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Check each terminal window for status and errors." -ForegroundColor Gray
Write-Host ""
Write-Host "To stop servers: Press Ctrl+C in each terminal window" -ForegroundColor Gray
Write-Host ""
