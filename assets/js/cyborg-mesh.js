import * as THREE from "three";

const NEON = 0x39ff14;
const ARMOR = 0x0c1210;
const SKIN = 0x1a2420;

function matArmor() {
  return new THREE.MeshPhysicalMaterial({
    color: ARMOR,
    metalness: 0.92,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.4,
  });
}

function matSkin() {
  return new THREE.MeshPhysicalMaterial({
    color: SKIN,
    metalness: 0.55,
    roughness: 0.38,
    clearcoat: 0.35,
    emissive: 0x0a2818,
    emissiveIntensity: 0.25,
    envMapIntensity: 0.9,
  });
}

function matGlow(intensity = 1.2) {
  return new THREE.MeshStandardMaterial({
    color: 0x001a08,
    emissive: NEON,
    emissiveIntensity: intensity,
    metalness: 1,
    roughness: 0.08,
  });
}

function matGlass() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x020806,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.55,
    thickness: 0.4,
    transparent: true,
    opacity: 0.85,
    emissive: NEON,
    emissiveIntensity: 0.35,
  });
}

/** Lathe profile → feminine android head shell */
function headShellGeo() {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = t * 1.05 - 0.15;
    let r;
    if (t < 0.08) r = 0.18 + t * 1.2;
    else if (t < 0.35) r = 0.52 + Math.sin(t * Math.PI * 2.1) * 0.04;
    else if (t < 0.55) r = 0.48 - (t - 0.35) * 0.35;
    else if (t < 0.78) r = 0.38 - (t - 0.55) * 0.25;
    else r = 0.32 - (t - 0.78) * 1.1;
    r = Math.max(0.06, r);
    pts.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(pts, 48);
}

function circuitTube(curve, radius = 0.008) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, 48, radius, 6, false),
    matGlow(0.9)
  );
}

function makeEye(parent, x) {
  const socket = new THREE.Group();
  socket.position.set(x, 0.08, 0.44);

  const recess = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55),
    matArmor()
  );
  recess.rotation.x = -0.35;
  socket.add(recess);

  /* Native emissive inset — no floating glow sphere */
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 12),
    matGlow(1.6)
  );
  core.position.z = 0.025;
  socket.add(core);

  parent.add(socket);
  return { socket, group: core, core, glow: core };
}

/**
 * Premium stylized 3D cyborg bust — real geometry, PBR, no flat texture.
 * @returns {{ root: THREE.Group, head: THREE.Group, eyeL, eyeR, visor: THREE.Mesh, circuits: THREE.Mesh[] }}
 */
export function createCyborgBust() {
  const root = new THREE.Group();
  const head = new THREE.Group();
  head.position.y = 0.35;
  root.add(head);

  const armor = matArmor();
  const skin = matSkin();

  /* ── Head shell ── */
  const shell = new THREE.Mesh(headShellGeo(), skin);
  shell.scale.set(1.05, 1.05, 0.88);
  shell.position.y = 0.05;
  head.add(shell);

  const facePlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.62, 0.18),
    armor
  );
  facePlate.position.set(0, 0.02, 0.38);
  head.add(facePlate);

  const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.08), armor);
  cheekL.position.set(-0.28, -0.02, 0.36);
  cheekL.rotation.y = 0.25;
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.28;
  cheekR.rotation.y = -0.25;
  head.add(cheekL, cheekR);

  /* ── Visor band ── */
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.11, 0.12), matGlass());
  visor.position.set(0, 0.28, 0.48);
  head.add(visor);

  const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.06), matGlow(0.7));
  visorFrame.position.set(0, 0.22, 0.5);
  head.add(visorFrame);

  /* ── Eyes ── */
  const eyeL = makeEye(head, -0.16);
  const eyeR = makeEye(head, 0.16);

  /* ── Hair bun ── */
  const bun = new THREE.Mesh(new THREE.TorusKnotGeometry(0.14, 0.035, 64, 8, 2, 3), armor);
  bun.position.set(0, 0.52, -0.22);
  bun.rotation.x = 0.4;
  head.add(bun);

  const hairSweep = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.35, 4, 12), armor);
  hairSweep.position.set(0.22, 0.35, -0.18);
  hairSweep.rotation.set(0.3, -0.5, 0.2);
  const hairSweep2 = hairSweep.clone();
  hairSweep2.position.x = -0.22;
  hairSweep2.rotation.y = 0.5;
  head.add(hairSweep, hairSweep2);

  /* ── Circuit traces (tube geometry = real 3D lines) ── */
  const circuits = [];
  const traces = [
    [[-0.2, 0.15, 0.46], [-0.12, -0.05, 0.42], [0, -0.18, 0.38]],
    [[0.2, 0.15, 0.46], [0.12, -0.05, 0.42], [0, -0.18, 0.38]],
    [[-0.32, 0.0, 0.34], [-0.38, -0.25, 0.28], [-0.42, -0.45, 0.2]],
    [[0.32, 0.0, 0.34], [0.38, -0.25, 0.28], [0.42, -0.45, 0.2]],
  ];
  for (const pts of traces) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const tube = circuitTube(curve);
    head.add(tube);
    circuits.push(tube);
  }

  /* ── Neck ── */
  const neck = new THREE.Group();
  neck.position.y = -0.42;
  head.add(neck);

  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.2 - i * 0.015, 0.025, 12, 32),
      i % 2 === 0 ? armor : matGlow(0.5)
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -i * 0.07;
    neck.add(ring);
  }

  const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 24), skin);
  neckCol.position.y = -0.12;
  neck.add(neckCol);

  /* ── Shoulders / collar ── */
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.12, 6), armor);
  collar.position.y = -0.58;
  head.add(collar);

  function pauldron(side) {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.38), armor);
    plate.position.set(side * 0.48, -0.02, 0.02);
    plate.rotation.z = side * -0.12;
    plate.rotation.y = side * 0.18;
    g.add(plate);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), armor);
    cap.scale.set(1.2, 0.7, 1);
    cap.position.set(side * 0.62, 0.06, 0);
    g.add(cap);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.06), matGlow(0.65));
    strip.position.set(side * 0.44, -0.05, 0.22);
    g.add(strip);

    return g;
  }

  const shoulderL = pauldron(-1);
  const shoulderR = pauldron(1);
  shoulderL.position.y = -0.62;
  shoulderR.position.y = -0.62;
  head.add(shoulderL, shoulderR);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.28), armor);
  chest.position.set(0, -0.78, 0.08);
  head.add(chest);

  const chestGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.22), matGlow(0.4));
  chestGlow.position.set(0, -0.75, 0.23);
  head.add(chestGlow);

  root.scale.setScalar(1.15);
  root.position.y = -0.15;

  return { root, head, eyeL, eyeR, visor, circuits, shoulderL, shoulderR };
}

/** Build emissive map: only bright/green pixels emit — no full-body wash. */
export function buildEmissiveMapFromTexture(map) {
  const img = map.image;
  if (!img?.width) return null;

  const w = img.width;
  const h = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);

  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const r = src.data[o];
    const g = src.data[o + 1];
    const b = src.data[o + 2];
    const greenLead = g - Math.max(r, b);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    let e = 0;
    if (greenLead > 10 && g > 40 && g > r * 1.08 && g > b * 1.08) {
      e = Math.min(1, (greenLead / 70) * Math.pow(g / 255, 0.75));
    }
    if (g > 90 && greenLead > 22) {
      e = Math.max(e, Math.min(1, greenLead / 55));
    }
    if (lum > 0.78 && g >= r && greenLead > 8) {
      e = Math.max(e, Math.min(1, (lum - 0.55) * 1.8));
    }

    const v = (e * 255) | 0;
    out.data[o] = out.data[o + 1] = out.data[o + 2] = v;
    out.data[o + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function fixTextureColorSpace(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m?.emissiveMap) m.emissiveMap.colorSpace = THREE.NoColorSpace;
    }
  });
}

const EMIT_INTENSITY = 3.1;

/**
 * Native glow: emissive only where texture (or GLB) already has light.
 */
export function applyNativeGlowMaterials(root, envMap = null) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const upgrade = (old) => {
      if (!old) {
        return new THREE.MeshPhysicalMaterial({
          color: 0x0a100e,
          metalness: 0.88,
          roughness: 0.3,
          envMap,
          envMapIntensity: 1.1,
        });
      }

      if (old.emissiveMap || old.emissive?.getHex?.() > 0x080808) {
        old.metalness = Math.max(old.metalness ?? 0, 0.82);
        old.roughness = Math.min(old.roughness ?? 1, 0.32);
        old.envMap = envMap;
        old.envMapIntensity = 1.2;
        old.emissive = old.emissive ?? new THREE.Color(NEON);
        old.emissiveIntensity = Math.max(old.emissiveIntensity ?? 0, EMIT_INTENSITY);
        old.userData.baseEmit = old.emissiveIntensity;
        if (old.map) old.color = new THREE.Color(0x666666);
        return old;
      }

      const map = old.map;
      if (!map) {
        old.metalness = 0.9;
        old.roughness = 0.28;
        old.envMap = envMap;
        old.envMapIntensity = 1.15;
        old.emissive = new THREE.Color(0x000000);
        old.emissiveIntensity = 0;
        return old;
      }

      const emissiveMap = buildEmissiveMapFromTexture(map);
      const mat = new THREE.MeshPhysicalMaterial({
        map,
        emissiveMap,
        emissive: new THREE.Color(NEON),
        emissiveIntensity: EMIT_INTENSITY,
        color: new THREE.Color(0x5a5a5a),
        metalness: 0.9,
        roughness: 0.3,
        clearcoat: 0.55,
        clearcoatRoughness: 0.18,
        envMap,
        envMapIntensity: 1.05,
      });
      mat.userData.baseEmit = EMIT_INTENSITY;
      return mat;
    };

    if (Array.isArray(child.material)) {
      child.material = child.material.map(upgrade);
    } else {
      child.material = upgrade(child.material);
    }
  });
}

function findHeadBone(root) {
  let head = null;
  let neck = null;
  root.traverse((o) => {
    if (!o.isBone) return;
    const n = o.name.toLowerCase();
    if (!head && (n.includes("head") || n.endsWith("head"))) head = o;
    if (!neck && n.includes("neck")) neck = o;
  });
  return head || neck;
}

/** Scale + position GLB for bust hero framing (head + shoulders in view). */
export function stageGlbBust(model, opts = {}) {
  const targetH = opts.targetHeight ?? 2.55;
  const offsetX = opts.offsetX ?? 0.38;
  // Tripo exports often face +X; rotate to face the camera (-Z).
  const faceYaw = opts.faceYaw ?? -Math.PI / 2;

  model.rotation.set(0, faceYaw, 0);
  model.updateMatrixWorld(true);

  const box0 = new THREE.Box3().setFromObject(model);
  const size0 = box0.getSize(new THREE.Vector3());
  const scale = targetH / Math.max(size0.y, 0.001);
  model.scale.setScalar(scale);

  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());

  model.position.x = -center.x + offsetX;
  model.position.z = -center.z;
  model.position.y = -box.min.y - targetH * 0.4;

  model.updateMatrixWorld(true);
  const finalBox = new THREE.Box3().setFromObject(model);
  const finalCenter = finalBox.getCenter(new THREE.Vector3());
  const finalSize = finalBox.getSize(new THREE.Vector3());

  return {
    scale,
    headBone: findHeadBone(model),
    bbox: finalBox,
    center: finalCenter,
    size: finalSize,
  };
}

/**
 * Load GLB, apply cyber materials, frame as bust.
 * @returns {{ root, headBone, mixer, clips, visor: null, eyeL: null, eyeR: null }}
 */
export async function loadCyborgGlb(url, envMap = null) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;

  fixTextureColorSpace(root);
  applyNativeGlowMaterials(root, envMap);
  const staged = stageGlbBust(root, { targetHeight: 2.55, offsetX: 0.38, faceYaw: -Math.PI / 2 });

  let mixer = null;
  if (gltf.animations?.length) {
    mixer = new THREE.AnimationMixer(root);
    const clip = gltf.animations.find((c) => /idle|breath|stand/i.test(c.name)) || gltf.animations[0];
    const action = mixer.clipAction(clip);
    action.play();
    action.setEffectiveTimeScale(0.35);
  }

  return {
    root,
    headBone: staged.headBone,
    mixer,
    clips: gltf.animations,
    bbox: staged.bbox,
    center: staged.center,
    size: staged.size,
    visor: null,
    eyeL: null,
    eyeR: null,
  };
}
