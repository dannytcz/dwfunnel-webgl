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

  const group = new THREE.Group();
  const glowMat = new THREE.MeshBasicMaterial({
    color: NEON,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: NEON,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), glowMat);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), coreMat);
  core.position.z = 0.02;
  group.add(glow, core);
  socket.add(group);

  parent.add(socket);
  return { socket, group, glow, core, glowMat, coreMat };
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

/**
 * Re-skin any GLB with DW Funnel cyber chrome + neon traces.
 */
export function applyCyberMaterials(root, envMap = null) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => m?.dispose?.());

    const cyber = new THREE.MeshPhysicalMaterial({
      color: 0x0a100e,
      metalness: 0.88,
      roughness: 0.26,
      clearcoat: 0.75,
      clearcoatRoughness: 0.12,
      emissive: 0x39ff14,
      emissiveIntensity: 0.14,
      envMap,
      envMapIntensity: 1.5,
    });
    child.material = cyber;
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
  const targetH = opts.targetHeight ?? 2.35;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetH / size.y;
  model.scale.setScalar(scale);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x = -center.x;
  model.position.z = -center.z;
  model.position.y = -box.min.y - targetH * 0.38;

  return { scale, headBone: findHeadBone(model) };
}

/**
 * Load GLB, apply cyber materials, frame as bust.
 * @returns {{ root, headBone, mixer, clips, visor: null, eyeL: null, eyeR: null }}
 */
export async function loadCyborgGlb(url, envMap = null) {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;

  applyCyberMaterials(root, envMap);
  const { headBone } = stageGlbBust(root);

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
    headBone,
    mixer,
    clips: gltf.animations,
    visor: null,
    eyeL: null,
    eyeR: null,
  };
}
