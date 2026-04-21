#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$EnvFile = "install\.env.local"

Write-Host ""
Write-Host "=== Panda Manager - Local Setup ===" -ForegroundColor Cyan
Write-Host ""

# -- 1. Check Docker ----------------------------------------------------------
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker is not installed." -ForegroundColor Red
    Write-Host "       Download Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
}

try {
    docker info 2>&1 | Out-Null
} catch {
    Write-Host "ERROR: Docker is not running." -ForegroundColor Red
    Write-Host "       Open Docker Desktop and wait for it to finish starting, then try again."
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running." -ForegroundColor Red
    Write-Host "       Open Docker Desktop and wait for it to finish starting, then try again."
    exit 1
}

# -- 2. Check if already configured -------------------------------------------
if (Test-Path $EnvFile) {
    Write-Host "Found existing configuration ($EnvFile) - skipping API key prompt."
    Write-Host "Delete that file and re-run if you need to change your API key."
} else {
    # -- 3. Prompt for API key -------------------------------------------------
    Write-Host "You need an Anthropic API key to use the AI features."
    Write-Host "Get one at: https://console.anthropic.com/"
    Write-Host ""
    $ApiKey = Read-Host "Paste your Anthropic API key"
    Write-Host ""

    if ([string]::IsNullOrWhiteSpace($ApiKey)) {
        Write-Host "ERROR: API key cannot be empty." -ForegroundColor Red
        exit 1
    }

    # -- 4. Generate secret + write .env.local --------------------------------
    $RandomBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($RandomBytes)
    $AuthSecret = [Convert]::ToBase64String($RandomBytes)

    if (-not (Test-Path "install")) {
        New-Item -ItemType Directory -Path "install" | Out-Null
    }

    @"
ANTHROPIC_API_KEY=$ApiKey
BETTER_AUTH_SECRET=$AuthSecret
"@ | Set-Content -Path $EnvFile -Encoding UTF8

    Write-Host "Configuration saved to $EnvFile"
}

# -- 5. Build and start -------------------------------------------------------
Write-Host ""
Write-Host "Starting Panda Manager (first run builds the Docker image - ~5 min)..."
Write-Host ""
docker compose -f install/docker-compose.local.yml up --build -d

# -- 6. Wait for app to be ready ----------------------------------------------
Write-Host ""
Write-Host "Waiting for the app to start..."
$MaxWait = 180
$Elapsed = 0
$Ready = $false

while ($Elapsed -lt $MaxWait) {
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($Response.StatusCode -lt 500) {
            $Ready = $true
            break
        }
    } catch {}
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 3
    $Elapsed += 3
}

Write-Host ""

if (-not $Ready) {
    Write-Host ""
    Write-Host "ERROR: App did not start within ${MaxWait}s." -ForegroundColor Red
    Write-Host "       Check logs with: docker compose -f install/docker-compose.local.yml logs app"
    exit 1
}

Write-Host ""
Write-Host "=== Ready! ===" -ForegroundColor Green
Write-Host ""
Write-Host "  URL:      http://localhost:3000"
Write-Host "  Email:    admin@localhost.dev"
Write-Host "  Password: admin123"
Write-Host ""

Start-Process "http://localhost:3000"
