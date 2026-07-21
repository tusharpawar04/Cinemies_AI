# Test 1: Health
Write-Host "=== Test 1: Health Check ==="
try {
    $health = Invoke-RestMethod -Uri 'http://localhost:8000/health' -TimeoutSec 10
    Write-Host "Status: $($health.status)"
    Write-Host "Indexed Movies: $($health.indexed_movies)"
    Write-Host "PASS"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
    exit 1
}

# Test 2: Recommend (basic, no personalization)
Write-Host "`n=== Test 2: Recommend mind_bending ==="
try {
    $rec = Invoke-RestMethod -Uri 'http://localhost:8000/recommend?mood=mind_bending&limit=5' -TimeoutSec 15
    Write-Host "Mood: $($rec.mood)"
    Write-Host "Count: $($rec.count)"
    foreach ($m in $rec.recommendations) {
        Write-Host "  - $($m.title) (TMDB:$($m.tmdb_id), Score:$([math]::Round($m.match_score, 3)))"
    }
    Write-Host "PASS"
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
}

# Test 3: Recommend with exclude_ids
Write-Host "`n=== Test 3: Recommend with exclude_ids ==="
try {
    $rec2 = Invoke-RestMethod -Uri 'http://localhost:8000/recommend?mood=comfort_food&limit=5&exclude_ids=27205,603,13' -TimeoutSec 15
    Write-Host "Count: $($rec2.count)"
    $excluded = $false
    foreach ($m in $rec2.recommendations) {
        if ($m.tmdb_id -in @(27205, 603, 13)) { $excluded = $true; Write-Host "  FAIL: excluded movie $($m.tmdb_id) appeared!" }
        Write-Host "  - $($m.title) (TMDB:$($m.tmdb_id))"
    }
    if (-not $excluded) { Write-Host "PASS - no excluded movies in results" }
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
}

# Test 4: Collaborative vector endpoint
Write-Host "`n=== Test 4: Collaborative Vector ==="
try {
    # Create a dummy request with insufficient similar users (expect available=false)
    $body = @{
        user_id = "test-user"
        current_taste_vector = @(1..384 | ForEach-Object { [math]::Round((Get-Random -Minimum -1.0 -Maximum 1.0), 4) })
        other_users = @()
        min_similarity = 0.6
        min_similar_users = 3
    } | ConvertTo-Json -Depth 3
    
    $collab = Invoke-RestMethod -Uri 'http://localhost:8000/collaborative-vector' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 10
    Write-Host "Available: $($collab.available)"
    Write-Host "Similar Users: $($collab.similar_user_count)"
    if ($collab.available -eq $false) { Write-Host "PASS - correctly returns unavailable for empty user list" }
} catch {
    Write-Host "FAIL: $($_.Exception.Message)"
}

Write-Host "`n=== All Tests Complete ==="
