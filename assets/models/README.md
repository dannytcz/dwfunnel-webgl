# Hero GLB

Active file: **`cyborg-bust.glb`** (Tripo image→3D export — cyberpunk female bust).

## Install from Tripo export

Place your export at `assets/cyberpunk female 3d model.glb`, then:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-cyberpunk-glb.ps1
```

## Fallback download (Three.js demo)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/download-hero-glb.ps1
```

Michelle.glb from [Three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf) — placeholder only.

Runtime applies dark metal albedo + **native emissive** from green/bright texture pixels + bloom (no overlay patches).

## Swap model

Replace `cyborg-bust.glb` or edit `GLB_URLS` in `hero-scene.js`.