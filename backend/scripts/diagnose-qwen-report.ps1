param(
  [string]$Api = "",
  [int]$ApiTimeout = 30000,
  [switch]$SkipLive,
  [switch]$ListModels
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir
$scriptPath = Join-Path $scriptDir "diagnose-qwen-report.mjs"

$argsList = @($scriptPath)
if ($Api) {
  $argsList += "--api=$Api"
  $argsList += "--api-timeout=$ApiTimeout"
}
if ($SkipLive) {
  $argsList += "--skip-live"
}
if ($ListModels) {
  $argsList += "--list-models"
}

Push-Location $backendDir
try {
  & node @argsList
} finally {
  Pop-Location
}
