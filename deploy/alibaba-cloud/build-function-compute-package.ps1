$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$backendRoot = Join-Path $repoRoot "backend"
$outputRoot = Join-Path $PSScriptRoot "function-compute-package"
$zipPath = Join-Path $PSScriptRoot "bowly-backend-function-compute.zip"

Push-Location $backendRoot
try {
  npm.cmd run build
  if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed."
  }
} finally {
  Pop-Location
}

if (Test-Path -LiteralPath $outputRoot) {
  Remove-Item -LiteralPath $outputRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $outputRoot | Out-Null

Copy-Item -LiteralPath (Join-Path $backendRoot "package.json") -Destination $outputRoot
Copy-Item -LiteralPath (Join-Path $backendRoot "package-lock.json") -Destination $outputRoot
Copy-Item -LiteralPath (Join-Path $backendRoot "dist") -Destination $outputRoot -Recurse

Push-Location $outputRoot
try {
  npm.cmd ci --omit=dev
  if ($LASTEXITCODE -ne 0) {
    throw "Production dependency installation failed."
  }
} finally {
  Pop-Location
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

# PowerShell Compress-Archive writes Windows backslashes into ZIP entry names.
# Function Compute runs on Linux and needs forward-slash paths such as
# dist/server.js, so use bsdtar to create the ZIP instead.
& tar.exe -a -c -f $zipPath -C $outputRoot .
if ($LASTEXITCODE -ne 0) {
  throw "Function Compute ZIP creation failed."
}

Get-Item -LiteralPath $zipPath |
  Select-Object FullName, Length, LastWriteTime
