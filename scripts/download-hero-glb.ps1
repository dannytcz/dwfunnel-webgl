$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Out = Join-Path $Root "assets\models\cyborg-bust.glb"
$Url = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb"

Write-Host "Downloading Michelle.glb -> cyborg-bust.glb ..."
Invoke-WebRequest -Uri $Url -OutFile $Out -UseBasicParsing
$size = (Get-Item $Out).Length / 1MB
Write-Host "Done ($([math]::Round($size, 2)) MB)"
