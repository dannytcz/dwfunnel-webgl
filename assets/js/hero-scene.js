import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createCyborgBust, loadCyborgGlb } from "./cyborg-mesh.js";
import {
  createDepthParallaxMesh,
  depthFromColor,
  loadTexture,
} from "./depth-parallax.js";

/** glb = real skinned mesh (default) | mesh3d | portrait (legacy flat image) */
const HERO_MODE = "glb";
const BUILD_TAG = "glb-v2";

const GLB_URLS = [
  "assets/models/cyborg-bust.glb",
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb",
];

const PORTRAIT_CFG = {
  urls: ["assets/images/cyborg-hero.webp", "assets/images/cyborg-hero.png"],
  depthUrls: ["assets/images/cyborg-hero-depth.webp", "assets/images/cyborg-hero-depth.png"],
  planeHeight: 2.55,
  segments: 96,
  displacement: 0.38,
  parallax: 0.032,
  rimStrength: 0.6,
};

const canvas = document.getElementById("hero-canvas");
const introEl = document.getElementById("act0");
const introSkip = document.getElementById("intro-skip");
const heroUi = document.getElementById("act1");
const heroHud = document.getElementById("hero-hud");
const heroHint = document.getElementById("hero-hint");
const heroCopy = document.querySelector("#act1 .hero-copy");
const vignette = document.querySelector(".hero-vignette");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  phase: reducedMotion ? "hero" : "intro",
  hoverCyborg: false,
  scroll: 0,
  mode: "mesh3d",
  popIn: false,
};

const mouse = { x: 0, y: 0, tx: 0, ty: 0, ndc: new THREE.Vector2() };
const lookMouse = new THREE.Vector3(0, 0.1, 5);
const lookSection2 = new THREE.Vector3(-1.8, 0.35, 4);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

const life = { breath: 1, blink: 0, nextBlink: 3.5, visorGlitch: 0 };

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x030508, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030508, 0.028);

const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envMap;

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 0.12, 4.9);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.5, 0.2);
composer.addPass(bloom);

scene.add(new THREE.AmbientLight(0x0a1a0f, 0.4));
scene.add(new THREE.HemisphereLight(0x39ff14, 0x030508, 0.35));

const key = new THREE.DirectionalLight(0xffffff, 2);
key.position.set(2.5, 3, 4);
scene.add(key);

const fill = new THREE.DirectionalLight(0x88ffaa, 0.55);
fill.position.set(-2.5, 0.5, 2);
scene.add(fill);

const rim = new THREE.DirectionalLight(0x39ff14, 2.8);
rim.position.set(-2, 2, -2);
scene.add(rim);

const eyeLight = new THREE.PointLight(0x39ff14, 6, 10);
eyeLight.position.set(0, 0.5, 1.8);
scene.add(eyeLight);

const cyborg = new THREE.Group();
cyborg.visible = false;
cyborg.scale.setScalar(0.001);
scene.add(cyborg);

const rig = new THREE.Group();
cyborg.add(rig);

const head = new THREE.Group();
rig.add(head);

let visorMesh = null;
let eyeL = null;
let eyeR = null;
let depthParallax = null;
let meshBust = null;
let glbRoot = null;
let headBone = null;
let glbMixer = null;

const cyborgHit = new THREE.Mesh(
  new THREE.SphereGeometry(1.15, 16, 16),
  new THREE.MeshBasicMaterial({ visible: false })
);
cyborg.add(cyborgHit);

function clearHead() {
  while (head.children.length) head.remove(head.children[0]);
  depthParallax?.dispose();
  depthParallax = null;
  eyeL = null;
  eyeR = null;
  visorMesh = null;
  meshBust = null;
  glbRoot = null;
  headBone = null;
  glbMixer = null;
}

function buildMesh3d() {
  state.mode = "mesh3d";
  clearHead();
  meshBust = createCyborgBust();
  head.add(meshBust.root);
  eyeL = meshBust.eyeL;
  eyeR = meshBust.eyeR;
  visorMesh = meshBust.visor;
}

async function buildGlb(glbData) {
  state.mode = "glb";
  clearHead();
  glbRoot = glbData.root;
  headBone = glbData.headBone;
  glbMixer = glbData.mixer;
  head.add(glbRoot);
}

async function buildDepthPortrait(colorTex, depthTex) {
  state.mode = "portrait";
  clearHead();
  depthParallax = createDepthParallaxMesh({
    colorMap: colorTex,
    depthMap: depthTex,
    planeHeight: PORTRAIT_CFG.planeHeight,
    segments: PORTRAIT_CFG.segments,
    displacement: PORTRAIT_CFG.displacement,
    parallax: PORTRAIT_CFG.parallax,
    rimStrength: PORTRAIT_CFG.rimStrength,
  });
  head.add(depthParallax.mesh);
}

async function tryLoadDepthMap(image) {
  for (const url of PORTRAIT_CFG.depthUrls) {
    try {
      return await loadTexture(url, THREE.NoColorSpace);
    } catch {
      /* next */
    }
  }
  return depthFromColor(image);
}

async function tryLoadPortrait() {
  for (const url of PORTRAIT_CFG.urls) {
    try {
      const colorTex = await loadTexture(url);
      const depthTex = await tryLoadDepthMap(colorTex.image);
      await buildDepthPortrait(colorTex, depthTex);
      return true;
    } catch {
      /* next */
    }
  }
  return false;
}

async function tryLoadGlb() {
  for (const url of GLB_URLS) {
    try {
      const data = await loadCyborgGlb(url, envMap);
      await buildGlb(data);
      console.info("[DW Funnel] Hero GLB loaded:", url);
      return true;
    } catch (e) {
      console.warn("[DW Funnel] GLB failed:", url, e?.message || e);
    }
  }
  return false;
}

function setBuildLabel(text) {
  const el = document.getElementById("hero-build");
  if (el) el.textContent = `Build: ${BUILD_TAG} — ${text}`;
}

async function initHero() {
  setBuildLabel("loading hero…");

  if (HERO_MODE === "portrait") {
    if (await tryLoadPortrait()) {
      setBuildLabel("mode: portrait (2D image)");
      return;
    }
    buildMesh3d();
    setBuildLabel("mode: mesh3d (fallback)");
    return;
  }

  if (HERO_MODE === "glb") {
    if (await tryLoadGlb()) {
      setBuildLabel("mode: glb (real 3D mesh)");
      return;
    }
    buildMesh3d();
    setBuildLabel("mode: mesh3d (GLB failed)");
    return;
  }

  buildMesh3d();
  setBuildLabel("mode: mesh3d");
}

initHero();

/* ── Intro particles ── */
const LOGO_N = 320;
const logoTargets = new Float32Array(LOGO_N * 3);
const logoStart = new Float32Array(LOGO_N * 3);
const logoPos = new Float32Array(LOGO_N * 3);
for (let i = 0; i < LOGO_N; i++) {
  const a = (i / LOGO_N) * Math.PI * 2;
  const r = 2.5 + Math.random() * 3;
  logoStart[i * 3] = Math.cos(a) * r;
  logoStart[i * 3 + 1] = (Math.random() - 0.5) * 4;
  logoStart[i * 3 + 2] = (Math.random() - 0.5) * 3 - 2;
  logoTargets[i * 3] = Math.sin(i * 0.7) * 0.9;
  logoTargets[i * 3 + 1] = Math.cos(i * 0.5) * 0.35;
  logoTargets[i * 3 + 2] = 0;
  logoPos.set(logoStart.subarray(i * 3, i * 3 + 3), i * 3);
}
const logoGeo = new THREE.BufferGeometry();
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

const COUNT = reducedMotion ? 500 : 2200;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 28;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
}
scene.add(
  new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
    new THREE.PointsMaterial({
      color: 0x39ff14,
      size: 0.028,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
);

const grid = new THREE.GridHelper(18, 36, 0x39ff14, 0x0a2010);
grid.material.opacity = 0.12;
grid.material.transparent = true;
grid.position.y = -1.5;
scene.add(grid);

const INTRO_MS = 4500;
const introStart = performance.now();
let introFinished = false;

function finishIntro(instant = false) {
  if (introFinished) return;
  introFinished = true;
  state.phase = "hero";
  introEl?.classList.add("is-done");
  heroUi?.classList.remove("is-hidden");
  heroHud?.classList.remove("is-hidden");
  heroHint?.classList.remove("is-hidden");
  vignette?.classList.remove("is-intro");
  vignette?.classList.add("is-hero");
  logoParticles.visible = false;
  logoRing.visible = false;
  cyborg.visible = true;
  cyborg.scale.setScalar(1);
  state.popIn = !instant;
  rig.scale.setScalar(instant ? 1 : 0.001);
  setupScrollHandoff();
}

introSkip?.addEventListener("click", () => finishIntro(true));
if (reducedMotion) finishIntro(true);
setTimeout(() => finishIntro(false), INTRO_MS);

window.addEventListener("pointermove", (e) => {
  mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  mouse.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});

let scrollSetup = false;

function setupScrollHandoff() {
  if (!window.gsap?.ScrollTrigger || reducedMotion || scrollSetup) return;
  scrollSetup = true;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({
    trigger: "#act2",
    start: "top 90%",
    end: "top 35%",
    scrub: 0.65,
    onUpdate: (self) => { state.scroll = self.progress; },
  });

  if (heroCopy) {
    gsap.to(heroCopy, {
      opacity: 0,
      y: -40,
      ease: "none",
      scrollTrigger: { trigger: "#act2", start: "top 85%", end: "top 45%", scrub: 0.5 },
    });
  }

  gsap.from("#act2 .section__inner > *", {
    opacity: 0,
    y: 48,
    stagger: 0.08,
    scrollTrigger: { trigger: "#act2", start: "top 75%" },
  });
}

function updateLife(t, dt) {
  if (reducedMotion) {
    life.breath = 1;
    return;
  }

  life.breath = 1 + Math.sin(t * 1.15) * 0.018;
  if (!state.popIn) rig.scale.set(1, life.breath, 1);

  if (state.mode === "mesh3d") {
    if (t >= life.nextBlink && life.blink <= 0) life.blink = 1;
    if (life.blink > 0) {
      life.blink -= dt / 0.14;
      const eyeOpen = Math.max(0.05, life.blink > 0 ? 1 - life.blink : 1);
      if (eyeL?.group) {
        eyeL.group.scale.y = eyeOpen;
        eyeR.group.scale.y = eyeOpen;
      }
      if (life.blink <= 0) life.nextBlink = t + 2.5 + Math.random() * 3.5;
    } else if (eyeL?.group) {
      eyeL.group.scale.y = THREE.MathUtils.lerp(eyeL.group.scale.y, 1, 0.2);
      eyeR.group.scale.y = eyeL.group.scale.y;
    }
  }

  if (Math.random() > 0.992) life.visorGlitch = 1;
  life.visorGlitch = Math.max(0, life.visorGlitch - dt * 4);

  if (visorMesh?.material?.emissiveIntensity !== undefined) {
    const pulse = 0.75 + Math.sin(t * 3.5) * 0.08;
    visorMesh.material.emissiveIntensity = pulse + life.visorGlitch * 1.4 + (state.hoverCyborg ? 0.5 : 0);
  }

  if (glbRoot) {
    glbRoot.traverse((o) => {
      if (o.isMesh && o.material?.emissiveIntensity !== undefined) {
        o.material.emissiveIntensity = 0.12 + Math.sin(t * 2.2) * 0.04 + (state.hoverCyborg ? 0.12 : 0);
      }
    });
  }

  if (depthParallax?.uniforms) {
    depthParallax.uniforms.uBreath.value = life.breath;
    depthParallax.uniforms.uRimStrength.value = PORTRAIT_CFG.rimStrength + (state.hoverCyborg ? 0.22 : 0);
  }

  if (meshBust?.circuits) {
    for (const tube of meshBust.circuits) {
      if (tube.material?.emissiveIntensity !== undefined) {
        tube.material.emissiveIntensity = 0.85 + Math.sin(t * 4 + tube.id) * 0.15;
      }
    }
  }
}

function updateLook() {
  mouse.x += (mouse.tx - mouse.x) * 0.08;
  mouse.y += (mouse.ty - mouse.y) * 0.08;

  lookMouse.set(mouse.tx * 1.6, -mouse.ty * 1.1 + 0.15, 5);
  const look = lookMouse.clone().lerp(lookSection2, state.scroll * 0.85);

  if (eyeL?.socket) {
    eyeL.socket.lookAt(look);
    eyeR.socket.lookAt(look);
  }

  const scrollDamp = 1 - state.scroll * 0.6;
  const yaw = mouse.tx * 0.55 * scrollDamp;
  const pitch = -mouse.ty * 0.32 * scrollDamp;

  if (headBone && state.mode === "glb") {
    headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, yaw * 0.45, 0.08);
    headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, pitch * 0.35, 0.08);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, yaw * 0.25, 0.06);
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, pitch * 0.15, 0.06);
  } else {
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, yaw, 0.08);
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, pitch, 0.08);
  }

  rig.rotation.y = THREE.MathUtils.lerp(rig.rotation.y, mouse.tx * 0.14 * scrollDamp, 0.05);
  rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, -mouse.ty * 0.07 * scrollDamp, 0.05);

  if (depthParallax?.uniforms) {
    depthParallax.uniforms.uMouse.value.set(mouse.tx * 0.018, mouse.ty * 0.012);
    depthParallax.uniforms.uTilt.value.set(yaw * 0.15, pitch * 0.15);
  }

  raycaster.setFromCamera(mouse.ndc, camera);
  state.hoverCyborg = raycaster.intersectObject(cyborgHit, true).length > 0;

  if (eyeL?.core && life.blink <= 0) {
    const s = state.hoverCyborg ? 1.35 : 1;
    eyeL.core.scale.setScalar(s);
    eyeR.core.scale.setScalar(s);
  }
}

function updateEnterPop() {
  if (!state.popIn) return;
  const target = new THREE.Vector3(1, life.breath, 1);
  rig.scale.lerp(target, 0.06);
  if (rig.scale.x > 0.97) {
    state.popIn = false;
    rig.scale.copy(target);
  }
}

function applyScrollLayout() {
  const s = state.scroll;
  const baseX = window.innerWidth >= 960 ? 0.55 : 0;
  cyborg.position.x = baseX + s * 1.35;
  cyborg.position.y = -0.05 + s * 0.35;
  bloom.strength = THREE.MathUtils.lerp(0.85, 0.45, s);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
  applyScrollLayout();
}

window.addEventListener("resize", resize);
resize();

function updateLogoIntro(t, progress) {
  logoParticles.visible = true;
  const attr = logoGeo.attributes.position;
  const ease = 1 - Math.pow(1 - Math.min(progress * 1.2, 1), 3);
  for (let i = 0; i < LOGO_N; i++) {
    attr.array[i * 3] = THREE.MathUtils.lerp(logoStart[i * 3], logoTargets[i * 3], ease);
    attr.array[i * 3 + 1] = THREE.MathUtils.lerp(logoStart[i * 3 + 1], logoTargets[i * 3 + 1], ease);
    attr.array[i * 3 + 2] = THREE.MathUtils.lerp(logoStart[i * 3 + 2], logoTargets[i * 3 + 2], ease);
  }
  attr.needsUpdate = true;
  logoRing.material.opacity = Math.min(progress * 1.5, 0.7);
  logoRing.rotation.z = t * 0.4;
  logoRing.scale.setScalar(0.8 + progress * 0.35);
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = clock.getDelta();

  if (glbMixer && !reducedMotion) glbMixer.update(dt);

  if (state.phase === "intro") {
    const elapsed = (performance.now() - introStart) / 1000;
    updateLogoIntro(t, Math.min(elapsed / (INTRO_MS / 1000), 1));
    camera.position.z = THREE.MathUtils.lerp(4.9, 4.4, Math.min(elapsed / (INTRO_MS / 1000), 1));
    if (elapsed >= INTRO_MS / 1000) finishIntro(false);
  } else {
    updateLife(t, dt);
    updateEnterPop();
    updateLook();
    applyScrollLayout();

    const scrollScale = 1 - state.scroll * 0.42;
    const hoverScale = state.hoverCyborg ? 1.04 : 1;
    cyborg.scale.setScalar(THREE.MathUtils.lerp(cyborg.scale.x, scrollScale * hoverScale, 0.1));

    rig.position.y = Math.sin(t * 0.7) * 0.025;

    const camDamp = 1 - state.scroll;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 0.4 * camDamp, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.12 + mouse.y * 0.28 * camDamp, 0.06);
    camera.position.z = 4.65;
    camera.lookAt(cyborg.position.x * 0.3 + mouse.x * 0.2, cyborg.position.y * 0.38, 0);
  }

  composer.render();
}

vignette?.classList.add("is-intro");
animate();
