$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
$image = "bowly-backend:latest"
$container = "bowly-backend-test"
$port = 18787
$resultPath = Join-Path $PSScriptRoot "container-test-result.json"
$errorPath = Join-Path $PSScriptRoot "container-test-error.txt"
$buildLogPath = Join-Path $PSScriptRoot "container-build.log"

Remove-Item -LiteralPath $resultPath, $errorPath, $buildLogPath -Force -ErrorAction SilentlyContinue

try {
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $docker build -t $image (Join-Path $repoRoot "backend") *> $buildLogPath
  $buildExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorPreference
  if ($buildExitCode -ne 0) {
    $buildTail = Get-Content -LiteralPath $buildLogPath -Tail 30
    throw "Docker image build failed.`n$($buildTail -join "`n")"
  }

  $ErrorActionPreference = "Continue"
  & $docker rm -f $container *> $null
  $ErrorActionPreference = $previousErrorPreference

  & $docker run --detach `
    --name $container `
    --publish "${port}:8787" `
    --env "USE_MOCK_AI=true" `
    --env "DEPLOYMENT_PLATFORM=local-docker" `
    --env "ALIBABA_CLOUD_REGION=local" `
    $image
  if ($LASTEXITCODE -ne 0) {
    throw "Docker container failed to start."
  }

  try {
    $health = $null
    for ($attempt = 0; $attempt -lt 12; $attempt += 1) {
      Start-Sleep -Seconds 2
      try {
        $health = Invoke-RestMethod "http://127.0.0.1:$port/health"
        break
      } catch {
        if ($attempt -eq 11) {
          throw
        }
      }
    }

    $health | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $resultPath
  } finally {
    & $docker rm -f $container | Out-Null
  }
} catch {
  $_ | Out-String | Set-Content -LiteralPath $errorPath
  exit 1
}
