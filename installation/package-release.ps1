# RideDesk Release Packaging Script (Windows PowerShell)
# Builds production assets, verifies tests, and packages a ready-to-distribute release ZIP.

$ErrorActionPreference = "Stop"
$RootPath = (Get-Item $PSScriptRoot).Parent.FullName
$Version = "1.6.0"
$ReleaseDir = Join-Path $RootPath "release-dist"
$ZipFile = Join-Path $RootPath "ridedesk-v$Version-release.zip"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  RideDesk Packaging & Build Pipeline v$Version  " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 1. Run Automated Backend Tests
Write-Host "`n[1/5] Running automated backend test suite..." -ForegroundColor Yellow
Push-Location (Join-Path $RootPath "backend-laravel")
try {
    php artisan config:clear
    php artisan test
    if ($LASTEXITCODE -ne 0) {
        throw "Backend tests failed! Release packaging aborted."
    }
} finally {
    Pop-Location
}

# 2. Build Frontend Production Assets
Write-Host "`n[2/5] Compiling frontend production bundle (Vite)..." -ForegroundColor Yellow
Push-Location (Join-Path $RootPath "frontend-react")
try {
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed! Release packaging aborted."
    }
} finally {
    Pop-Location
}

# 3. Publish Frontend Dist into Laravel Public Directory
Write-Host "`n[3/5] Publishing frontend SPA to backend-laravel/public..." -ForegroundColor Yellow
$FrontendDist = Join-Path $RootPath "frontend-react\dist\*"
$BackendPublic = Join-Path $RootPath "backend-laravel\public"
Copy-Item -Path $FrontendDist -Destination $BackendPublic -Recurse -Force

# 4. Prepare Clean Staging Directory
Write-Host "`n[4/5] Preparing clean release staging directory..." -ForegroundColor Yellow
if (Test-Path $ReleaseDir) {
    Remove-Item -Path $ReleaseDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ReleaseDir | Out-Null

# Copy Backend Files
$StagingBackend = Join-Path $ReleaseDir "backend-laravel"
New-Item -ItemType Directory -Path $StagingBackend | Out-Null

$ExcludeBackend = @(".git", ".github", ".env", "tests", "storage\logs\*", "storage\framework\cache\data\*")
Get-ChildItem -Path (Join-Path $RootPath "backend-laravel") | Where-Object {
    $_.Name -notin @(".git", ".github", "node_modules", ".env")
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $StagingBackend -Recurse -Force
}

# Copy Frontend Source (for buyers who want to customize UI)
$StagingFrontend = Join-Path $ReleaseDir "frontend-react"
New-Item -ItemType Directory -Path $StagingFrontend | Out-Null
Get-ChildItem -Path (Join-Path $RootPath "frontend-react") | Where-Object {
    $_.Name -notin @(".git", "node_modules", "dist")
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $StagingFrontend -Recurse -Force
}

# Copy Installation Guides
$StagingInstallation = Join-Path $ReleaseDir "installation"
Copy-Item -Path (Join-Path $RootPath "installation") -Destination $StagingInstallation -Recurse -Force

# Copy Readme, Plan, and Feature documentation
Copy-Item -Path (Join-Path $RootPath "README.md") -Destination $ReleaseDir -Force
Copy-Item -Path (Join-Path $RootPath "plan.md") -Destination $ReleaseDir -Force
Copy-Item -Path (Join-Path $RootPath "feature.md") -Destination $ReleaseDir -Force

# 5. Compress into ZIP file
Write-Host "`n[5/5] Compressing release package into ZIP..." -ForegroundColor Yellow
if (Test-Path $ZipFile) {
    Remove-Item -Path $ZipFile -Force
}
Compress-Archive -Path "$ReleaseDir\*" -DestinationPath $ZipFile -CompressionLevel Optimal

# Cleanup staging directory
Start-Sleep -Seconds 2
try {
    Remove-Item -Path $ReleaseDir -Recurse -Force -ErrorAction Stop
} catch {
    cmd.exe /c "rd /s /q `"$ReleaseDir`""
}

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Release ZIP Created:" -ForegroundColor Green
Write-Host "  $ZipFile" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

