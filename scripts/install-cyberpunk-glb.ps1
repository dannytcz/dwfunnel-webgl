# Copy Tripo export into the active hero model path.
$src = Join-Path $PSScriptRoot "..\assets\cyberpunk female 3d model.glb"
$dst = Join-Path $PSScriptRoot "..\assets\models\cyborg-bust.glb"

if (-not (Test-Path $src)) {
  Write-Error "Source not found: $src"
  exit 1
}

Copy-Item -Path $src -Destination $dst -Force
Write-Host "Installed hero GLB -> $dst ($((Get-Item $dst).Length / 1MB) MB)"
