import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("hero-canvas");
const introEl = document.getElementById("act0");
const introSkip = document.getElementById("intro-skip");
const heroUi = document.getElementById("act1");
const heroHud = document.getElementById("hero-hud");
const heroHint = document.getElementById("hero-hint");
const vignette = document.querySelector(".hero-vignette");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  phase: reducedMotion ? "hero" : "intro",
  introT: 0,
  heroT: 0,
  hoverCyborg: false,
};

const mouse = { x: 0, y: 0, tx: 0, ty: 0, ndc: new THREE.Vector2() };
const lookTarget = new THREE.Vector3(0, 0.15, 4);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x030508, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030508, 0.038);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.05, 5.4);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.4, 0.12);
composer.addPass(bloom);

scene.add(new THREE.AmbientLight(0x0a1a0f, 0.3));
const key = new THREE.PointLight(0x39ff14, 14, 22);
key.position.set(1.5, 1.2, 4);
scene.add(key);
const fill = new THREE.PointLight(0x00ffaa, 6, 18);
fill.position.set(-2, 0.2, 2);
scene.add(fill);

/* ── Logo particles (Act 0) ── */
const LOGO_N = 320;
const logoGeo = new THREE.BufferGeometry();
const logoStart = new Float32Array(LOGO_N * 3);
const logoPos = new Float32Array(LOGO_N * 3);
for (let i = 0; i < LOGO_N; i++) {
  const a = (i / LOGO_N) * Math.PI * 2;
  const r = 2.5 + Math.random() * 3;
  logoStart[i * 3] = Math.cos(a) * r;
  logoStart[i * 3 + 1] = (Math.random() - 0.5) * 4;
  logoStart[i * 3 + 2] = (Math.random() - 0.5) * 3 - 2;
  logoPos.set(logoStart.subarray(i * 3, i * 3 + 3), i * 3);
}
logoGeo.setAttribute("position", new THREE.BufferAttribute(logoPos, 3));
const logoParticles = new THREE.Points(
  logoGeo,
  new THREE.PointsMaterial({
    color: 0x39ff14,
    size: 0.045,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
scene.add(logoParticles);

const logoRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.15, 0.012, 8, 80),
  new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0 })
);
scene.add(logoRing);

/* ── Cyborg (Act 1) ── */
const cyborg = new THREE.Group();
cyborg.visible = false;
cyborg.scale.setScalar(0.001);
scene.add(cyborg);

const skinMat = new THREE.MeshStandardMaterial({
  color: 0x0a120e,
  emissive: 0x1a4d28,
  emissiveIntensity: 0.65,
  metalness: 0.85,
  roughness: 0.3,
});

const glowMat = new THREE.MeshStandardMaterial({
  color: 0x020403,
  emissive: 0x39ff14,
  emissiveIntensity: 1,
  metalness: 1,
  roughness: 0.1,
});

const wireMat = new THREE.MeshBasicMaterial({
  color: 0x39ff14,
  wireframe: true,
  transparent: true,
  opacity: 0.22,
});

const head = new THREE.Group();
cyborg.add(head);

const skull = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 32), skinMat);
skull.scale.set(1, 1.08, 0.92);
head.add(skull);

const wireSkull = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 16), wireMat);
wireSkull.scale.copy(skull.scale);
head.add(wireSkull);

const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.28), skinMat);
jawMesh.position.set(0, -0.38, 0.18);
head.add(jawMesh);

const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 16), skinMat);
neck.position.y = -0.72;
head.add(neck);

const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.45), skinMat);
shoulders.position.y = -0.95;
head.add(shoulders);

const visor = new THREE.Mesh(
  new THREE.BoxGeometry(0.72, 0.14, 0.08),
  new THREE.MeshStandardMaterial({
    color: 0x001a0a,
    emissive: 0x39ff14,
    emissiveIntensity: state.hoverCyborg ? 2 : 0.9,
    metalness: 0.9,
    roughness: 0.05,
  })
);
visor.position.set(0, 0.08, 0.52);
head.add(visor);

const eyeGroup = new THREE.Group();
eyeGroup.position.set(0, 0.05, 0.48);
head.add(eyeGroup);

const eyeSocketL = new THREE.Group();
eyeSocketL.position.set(-0.18, 0, 0);
const eyeSocketR = new THREE.Group();
eyeSocketR.position.set(0.18, 0, 0);
eyeGroup.add(eyeSocketL, eyeSocketR);

const eyeCoreMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
const eyeGlowMat = new THREE.MeshBasicMaterial({
  color: 0x39ff14,
  transparent: true,
  opacity: 0.35,
});

function makeEye(parent) {
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), eyeGlowMat);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), eyeCoreMat);
  core.position.z = 0.04;
  parent.add(glow, core);
  return { glow, core };
}

const eyeL = makeEye(eyeSocketL);
const eyeR = makeEye(eyeSocketR);

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.88 + i * 0.14, 0.014, 8, 64),
    glowMat.clone()
  );
  ring.rotation.x = Math.PI / 2 + i * 0.12;
  ring.rotation.y = i * 0.35;
  ring.userData.spin = 0.12 + i * 0.05;
  head.add(ring);
}

const headset = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 8, 48, Math.PI), glowMat);
headset.rotation.z = Math.PI;
headset.position.set(0, 0.42, -0.05);
head.add(headset);

cyborg.position.set(0, -0.05, 0);

const cyborgHit = new THREE.Mesh(
  new THREE.SphereGeometry(1.05, 16, 16),
  new THREE.MeshBasicMaterial({ visible: false })
);
cyborg.add(cyborgHit);

/* ── Environment ── */
const COUNT = reducedMotion ? 500 : 2200;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 28;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
}
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const particles = new THREE.Points(
  particleGeo,
  new THREE.PointsMaterial({
    color: 0x39ff14,
    size: 0.028,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
scene.add(particles);

const grid = new THREE.GridHelper(18, 36, 0x39ff14, 0x0a2010);
grid.material.opacity = 0.18;
grid.material.transparent = true;
grid.position.y = -1.5;
scene.add(grid);

/* ── Intro → Hero ── */
function finishIntro(instant = false) {
  if (state.phase === "hero") return;
  state.phase = "hero";
  state.heroT = instant ? 1 : 0;
  introEl?.classList.add("is-done");
  heroUi?.classList.remove("is-hidden");
  heroHud?.classList.remove("is-hidden");
  heroHint?.classList.remove("is-hidden");
  vignette?.classList.remove("is-intro");
  vignette?.classList.add("is-hero");
  logoParticles.visible = false;
  logoRing.visible = false;
  cyborg.visible = true;
  if (instant) cyborg.scale.setScalar(1);
}

introSkip?.addEventListener("click", () => finishIntro(true));
if (reducedMotion) finishIntro();

window.addEventListener("pointermove", (e) => {
  mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  mouse.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
  const offset = w >= 960 ? 0.55 : 0;
  cyborg.position.x = offset;
}

window.addEventListener("resize", resize);
resize();

function updateLogoIntro(t, progress) {
  logoParticles.visible = true;
  const attr = logoGeo.attributes.position;
  for (let i = 0; i < LOGO_N; i++) {
    const tx = (Math.random() - 0.5) * 0.15 + Math.sin(i * 0.7) * 0.9;
    const ty = (Math.random() - 0.5) * 0.15 + Math.cos(i * 0.5) * 0.35;
    const tz = (Math.random() - 0.5) * 0.1;
    const ease = 1 - Math.pow(1 - Math.min(progress * 1.2, 1), 3);
    attr.array[i * 3] = THREE.MathUtils.lerp(logoStart[i * 3], tx, ease);
    attr.array[i * 3 + 1] = THREE.MathUtils.lerp(logoStart[i * 3 + 1], ty, ease);
    attr.array[i * 3 + 2] = THREE.MathUtils.lerp(logoStart[i * 3 + 2], tz, ease);
  }
  attr.needsUpdate = true;
  logoRing.material.opacity = Math.min(progress * 1.5, 0.7);
  logoRing.rotation.z = t * 0.4;
  logoRing.scale.setScalar(0.8 + progress * 0.35);
}

function updateCyborgLook(dt) {
  mouse.x += (mouse.tx - mouse.x) * 0.08;
  mouse.y += (mouse.ty - mouse.y) * 0.08;

  lookTarget.set(mouse.tx * 1.8, -mouse.ty * 1.2 + 0.2, 5);
  eyeSocketL.lookAt(lookTarget);
  eyeSocketR.lookAt(lookTarget);

  const headYaw = mouse.tx * 0.42;
  const headPitch = -mouse.ty * 0.28;
  head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, headYaw, 0.07);
  head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, headPitch, 0.07);

  raycaster.setFromCamera(mouse.ndc, camera);
  state.hoverCyborg = raycaster.intersectObject(cyborgHit, true).length > 0;

  const visorMat = visor.material;
  visorMat.emissiveIntensity = THREE.MathUtils.lerp(
    visorMat.emissiveIntensity,
    state.hoverCyborg ? 2.2 : 0.85,
    0.1
  );

  eyeL.core.scale.setScalar(state.hoverCyborg ? 1.3 : 1);
  eyeR.core.scale.copy(eyeL.core.scale);
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  if (state.phase === "intro") {
    state.introT += dt;
    const progress = Math.min(state.introT / 3.2, 1);
    updateLogoIntro(t, progress);
    camera.position.z = THREE.MathUtils.lerp(5.4, 4.8, progress);
    if (state.introT >= 3.4) finishIntro();
  } else {
    state.heroT += dt;
    const reveal = Math.min(state.heroT / 1.1, 1);
    const base = 0.001 + (1 - Math.pow(1 - reveal, 3)) * 0.999;
    const targetScale = base * (state.hoverCyborg ? 1.04 : 1);
    cyborg.scale.setScalar(THREE.MathUtils.lerp(cyborg.scale.x, targetScale, 0.12));

    updateCyborgLook(dt);

    head.children.forEach((child) => {
      if (child.userData.spin) child.rotation.z += child.userData.spin * 0.012;
    });

    cyborg.position.y = -0.05 + Math.sin(t * 0.7) * 0.025;
    particles.rotation.y = t * 0.01;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 0.15, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.y * 0.1, 0.05);
    camera.position.z = 5.1;
    camera.lookAt(cyborg.position.x * 0.5, 0, 0);
  }

  composer.render();
}

vignette?.classList.add("is-intro");
animate();
