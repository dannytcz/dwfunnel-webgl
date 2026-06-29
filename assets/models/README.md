# Download hero GLB (run once)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/download-hero-glb.ps1
```

Default model: **Michelle.glb** from [Three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf) — skinned female mesh, CC-friendly demo asset.

Saved as `assets/models/cyborg-bust.glb`. Scene applies dark metal + neon-green emissive override at runtime.

## Swap model

Replace `cyborg-bust.glb` with any bust/character GLB, or edit `GLB_URLS` in `hero-scene.js`.

## Attribution

- **Michelle.glb** — Three.js / Mixamo sample (demo use via three.js repo)
