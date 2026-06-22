param(
  [string]$NodeVersion = "v24.17.0"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $root ".tools"
$downloadsDir = Join-Path $toolsDir "downloads"
$nodeZip = Join-Path $downloadsDir "node-$NodeVersion-win-x64.zip"
$shasumsFile = Join-Path $downloadsDir "SHASUMS256.txt"
$nodeExtractDir = Join-Path $toolsDir "node-$NodeVersion-win-x64"
$nodeDir = Join-Path $toolsDir "node"
$baseUrl = "https://nodejs.org/dist/$NodeVersion"

New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null

if (!(Test-Path -LiteralPath $nodeZip)) {
  Invoke-WebRequest `
    -Uri "$baseUrl/node-$NodeVersion-win-x64.zip" `
    -OutFile $nodeZip
}

if (!(Test-Path -LiteralPath $shasumsFile)) {
  Invoke-WebRequest -Uri "$baseUrl/SHASUMS256.txt" -OutFile $shasumsFile
}

$expectedHash = (Get-Content $shasumsFile |
  Where-Object { $_ -match " node-$NodeVersion-win-x64\.zip$" } |
  Select-Object -First 1).Split(" ")[0].ToUpperInvariant()
$actualHash = (Get-FileHash -Algorithm SHA256 $nodeZip).Hash.ToUpperInvariant()

if (!$expectedHash -or $actualHash -ne $expectedHash) {
  throw "Falha na verificacao SHA256 do Node.js."
}

if (!(Test-Path -LiteralPath $nodeExtractDir)) {
  Expand-Archive -LiteralPath $nodeZip -DestinationPath $toolsDir -Force
}

if (Test-Path -LiteralPath $nodeDir) {
  Remove-Item -LiteralPath $nodeDir -Recurse -Force
}

Rename-Item -LiteralPath $nodeExtractDir -NewName "node"

$env:Path = "$nodeDir;$env:Path"

& (Join-Path $nodeDir "node.exe") --version
& (Join-Path $nodeDir "npm.cmd") --version

Push-Location $root
try {
  & (Join-Path $nodeDir "npm.cmd") ci
  & (Join-Path $nodeDir "npm.cmd") run prisma:generate
  & (Join-Path $nodeDir "npm.cmd") test -- --run
  & (Join-Path $nodeDir "npm.cmd") run build
}
finally {
  Pop-Location
}
