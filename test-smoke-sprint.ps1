# MORA Sprint Smoke Test
# Verifies all new endpoints from the 10-day sprint

$BaseUrl = "http://localhost:8081"
$Token = $env:NEXT_PUBLIC_SAIMOR_CORE_JWT

if (-not $Token) {
    Write-Host "WARNING: No JWT Token found in environment. Using a dummy token for connectivity check." -ForegroundColor Yellow
    $Token = "dummy-token"
}

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type"  = "application/json"
}

function Test-Endpoint {
    param (
        [string]$Method,
        [string]$Url,
        [string]$Description
    )

    Write-Host "Testing: $Description ($Method $Url)..." -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl$Url" -Method $Method -Headers $Headers -ErrorAction Stop
        Write-Host " OK" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Gray
        return $null
    }
}

Write-Host "Starting MORA Sprint Smoke Test..." -ForegroundColor Cyan

# 1. Get a Folder ID
$folders = Test-Endpoint "GET" "/v1/folders" "List Folders"
if ($folders -and $folders.Count -gt 0) {
    $folderId = $folders[0].id
    Write-Host "   Using Folder ID: $folderId" -ForegroundColor Gray

    # 2. Test Node Access (Phase 2)
    Test-Endpoint "GET" "/v1/folders/$folderId/nodes" "Get Folder Nodes" | Out-Null

    # 3. Test Mindloop Events (Phase 3)
    Test-Endpoint "GET" "/v1/mindloop/events?folder_id=$folderId" "Get Folder Events" | Out-Null

    # 4. Test Folder Children (Phase 4)
    Test-Endpoint "GET" "/v1/folders/$folderId/children" "Get Folder Children" | Out-Null
    
    # 5. Test Folder Parents (Phase 4)
    Test-Endpoint "GET" "/v1/folders/$folderId/parents" "Get Folder Parents" | Out-Null

    # 6. Test Scan (Phase 6) - Dry run without creating node
    Test-Endpoint "POST" "/v1/mindloop/scan" "Run Intelligence Scan (Dry Run)" | Out-Null

}
else {
    Write-Host "WARNING: No folders found. Skipping folder-dependent tests." -ForegroundColor Yellow
}

# 7. Get a Node ID
$nodes = Test-Endpoint "GET" "/v1/nodes?limit=1" "List Nodes"
if ($nodes -and $nodes.Count -gt 0) {
    $nodeId = $nodes[0].id
    Write-Host "   Using Node ID: $nodeId" -ForegroundColor Gray

    # 8. Test Node Relations (Phase 4)
    Test-Endpoint "GET" "/v1/nodes/$nodeId/relations" "Get Node Relations" | Out-Null
}
else {
    Write-Host "WARNING: No nodes found. Skipping node-dependent tests." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Smoke Test Complete." -ForegroundColor Cyan
