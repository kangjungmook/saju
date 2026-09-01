# Windows equivalent of run-local.sh: loads backend\.env (see .env.example)
# and starts the backend against it.
#
# Run from PowerShell:
#   powershell -ExecutionPolicy Bypass -File run-local.ps1
# (default Windows policy blocks local scripts, hence -ExecutionPolicy Bypass)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Write-Error "Missing backend\.env - copy .env.example to .env and fill in your Supabase credentials."
    exit 1
}

Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $idx = $line.IndexOf("=")
        if ($idx -gt 0) {
            $key = $line.Substring(0, $idx).Trim()
            $value = $line.Substring($idx + 1).Trim()
            Set-Item -Path "Env:$key" -Value $value
        }
    }
}

.\mvnw.cmd spring-boot:run
