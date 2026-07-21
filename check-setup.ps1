# Quick Setup Diagnostic Script
# Run with: ./check-setup.ps1

Write-Host "🔍 Cinemies Setup Diagnostic" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$warnings = @()

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not found" -ForegroundColor Red
        $issues += "Node.js not installed"
    }
} catch {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "Node.js not installed"
}

# Check Python
Write-Host "Checking Python..." -NoNewline
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not found" -ForegroundColor Red
        $issues += "Python not installed"
    }
} catch {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "Python not installed"
}

# Check npm
Write-Host "Checking npm..." -NoNewline
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host " ❌ Not found" -ForegroundColor Red
        $issues += "npm not installed"
    }
} catch {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "npm not installed"
}

Write-Host ""
Write-Host "Checking Database Services..." -ForegroundColor Yellow
Write-Host ""

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -NoNewline
try {
    $pgReady = pg_isready 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ Running" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Not running or not found" -ForegroundColor Yellow
        $warnings += "PostgreSQL may not be running. Start it with: net start postgresql-x64-<version>"
    }
} catch {
    Write-Host " ⚠️  Not found" -ForegroundColor Yellow
    $warnings += "PostgreSQL not found or not running"
}

# Check MongoDB
Write-Host "Checking MongoDB..." -NoNewline
try {
    $mongoPing = mongo --eval "db.adminCommand('ping')" --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅ Running" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Not running or not found" -ForegroundColor Yellow
        $warnings += "MongoDB may not be running. Start it with: net start MongoDB"
    }
} catch {
    Write-Host " ⚠️  Not found" -ForegroundColor Yellow
    $warnings += "MongoDB not found or not running"
}

# Check Redis
Write-Host "Checking Redis..." -NoNewline
try {
    $redisPing = redis-cli ping 2>&1
    if ($redisPing -eq "PONG") {
        Write-Host " ✅ Running" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Not running or not found" -ForegroundColor Yellow
        $warnings += "Redis may not be running. Start it with: redis-server"
    }
} catch {
    Write-Host " ⚠️  Not found" -ForegroundColor Yellow
    $warnings += "Redis not found or not running"
}

Write-Host ""
Write-Host "Checking Project Files..." -ForegroundColor Yellow
Write-Host ""

# Check backend directory
Write-Host "Checking backend..." -NoNewline
if (Test-Path "cinemies-backend/package.json") {
    if (Test-Path "cinemies-backend/node_modules") {
        Write-Host " ✅ Ready" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Dependencies not installed" -ForegroundColor Yellow
        $warnings += "Run: cd cinemies-backend && npm install"
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "Backend directory missing or invalid"
}

# Check frontend directory
Write-Host "Checking frontend..." -NoNewline
if (Test-Path "cinemies-frontend/package.json") {
    if (Test-Path "cinemies-frontend/node_modules") {
        Write-Host " ✅ Ready" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Dependencies not installed" -ForegroundColor Yellow
        $warnings += "Run: cd cinemies-frontend && npm install"
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "Frontend directory missing or invalid"
}

# Check AI directory
Write-Host "Checking AI engine..." -NoNewline
if (Test-Path "cinemies-ai/main.py") {
    if (Test-Path "cinemies-ai/.venv") {
        Write-Host " ✅ Ready" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Virtual environment not found" -ForegroundColor Yellow
        $warnings += "Run: cd cinemies-ai && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt"
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "AI engine directory missing or invalid"
}

Write-Host ""
Write-Host "Checking Configuration..." -ForegroundColor Yellow
Write-Host ""

# Check backend .env
Write-Host "Checking backend .env..." -NoNewline
if (Test-Path "cinemies-backend/.env") {
    $envContent = Get-Content "cinemies-backend/.env" -Raw
    if ($envContent -match "CORS_ORIGIN.*3003") {
        Write-Host " ✅ CORS configured correctly" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  CORS may need update" -ForegroundColor Yellow
        $warnings += "Backend .env should include: CORS_ORIGIN=http://localhost:5173,http://localhost:3003,http://localhost:3000"
    }
} else {
    Write-Host " ❌ Not found" -ForegroundColor Red
    $issues += "Backend .env file missing"
}

# Check frontend .env
Write-Host "Checking frontend .env..." -NoNewline
if (Test-Path "cinemies-frontend/.env") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ⚠️  Not found" -ForegroundColor Yellow
    $warnings += "Frontend .env file missing. Copy from .env.example if needed"
}

# Check AI .env
Write-Host "Checking AI .env..." -NoNewline
if (Test-Path "cinemies-ai/.env") {
    Write-Host " ✅ Found" -ForegroundColor Green
} else {
    Write-Host " ⚠️  Not found" -ForegroundColor Yellow
    $warnings += "AI .env file missing (may be optional)"
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host ""

if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ All checks passed! You're ready to start the servers." -ForegroundColor Green
    Write-Host ""
    Write-Host "Run: ./start-servers.ps1" -ForegroundColor Cyan
} else {
    if ($issues.Count -gt 0) {
        Write-Host "❌ Critical Issues ($($issues.Count)):" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "   • $issue" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Warnings ($($warnings.Count)):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   • $warning" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    if ($issues.Count -gt 0) {
        Write-Host "Fix critical issues before starting servers." -ForegroundColor Red
    } else {
        Write-Host "You can start servers, but some features may not work." -ForegroundColor Yellow
        Write-Host "Run: ./start-servers.ps1" -ForegroundColor Cyan
    }
}

Write-Host ""
