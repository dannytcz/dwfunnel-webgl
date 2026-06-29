import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import {
  createDepthParallaxMesh,
  depthFromColor,
  loadTexture,
} from "./depth-parallax.js";

/** Drop cyborg-hero.webp/png here — see assets/images/README.md */
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
  heroT: 0,
  hoverCyborg: false,
  scroll: 0,
  mode: "procedural",
  popIn: false,
};

const mouse = { x: 0, y: 0, tx: 0, ty: 0, ndc: new THREE.Vector2() };
const lookMouse = new THREE.Vector3(0, 0.1, 5);
const lookSection2 = new THREE.Vector3(-1.8, 0.35, 4);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

const life = {
  breath: 1,
  blink: 0,
  nextBlink: 3.5,
  visorBase: 0.85,
  visorGlitch: 0,
};

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

/* ── Cyborg root ── */
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
let portraitPlane = null;
let depthParallax = null;
const proceduralParts = [];

const cyborgHit = new THREE.Mesh(
  new THREE.SphereGeometry(1.05, 16, 16),
  new THREE.MeshBasicMaterial({ visible: false })
);
cyborg.add(cyborgHit);

function makeEyeGlow(parent, scale = 1) {
  const g = new THREE.Group();
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 16, 16), glowMat);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 12, 12), coreMat);
  core.position.z = 0.035;
  g.add(glow, core);
  parent.add(g);
  return { group: g, glow, core, glowMat, coreMat };
}

function buildProcedural() {
  state.mode = "procedural";
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

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 32), skinMat);
  skull.scale.set(1, 1.08, 0.92);
  head.add(skull);
  proceduralParts.push(skull);

  const wireSkull = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 16), wireMat);
  wireSkull.scale.copy(skull.scale);
  head.add(wireSkull);
  proceduralParts.push(wireSkull);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.28), skinMat);
  jaw.position.set(0, -0.38, 0.18);
  head.add(jaw);
  proceduralParts.push(jaw);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 16), skinMat);
  neck.position.y = -0.72;
  head.add(neck);
  proceduralParts.push(neck);

  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 0.45), skinMat);
  shoulders.position.y = -0.95;
  head.add(shoulders);
  proceduralParts.push(shoulders);

  visorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.14, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x001a0a,
      emissive: 0x39ff14,
      emissiveIntensity: 0.85,
      metalness: 0.9,
      roughness: 0.05,
    })
  );
  visorMesh.position.set(0, 0.08, 0.52);
  head.add(visorMesh);

  const eyeGroup = new THREE.Group();
  eyeGroup.position.set(0, 0.05, 0.48);
  head.add(eyeGroup);

  const socketL = new THREE.Group();
  socketL.position.set(-0.18, 0, 0);
  const socketR = new THREE.Group();
  socketR.position.set(0.18, 0, 0);
  eyeGroup.add(socketL, socketR);

  eyeL = makeEyeGlow(socketL);
  eyeR = makeEyeGlow(socketR);
  eyeL.socket = socketL;
  eyeR.socket = socketR;

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
}

async function buildDepthPortrait(colorTex, depthTex) {
  state.mode = "portrait";
  while (head.children.length) head.remove(head.children[0]);
  proceduralParts.length = 0;
  depthParallax?.dispose();
  depthParallax = null;
  eyeL = null;
  eyeR = null;
  visorMesh = null;

  depthParallax = createDepthParallaxMesh({
    colorMap: colorTex,
    depthMap: depthTex,
    planeHeight: PORTRAIT_CFG.planeHeight,
    segments: PORTRAIT_CFG.segments,
    displacement: PORTRAIT_CFG.displacement,
    parallax: PORTRAIT_CFG.parallax,
    rimStrength: PORTRAIT_CFG.rimStrength,
  });

  portraitPlane = depthParallax.mesh;
  head.add(portraitPlane);
}

async function tryLoadDepthMap(image) {
  for (const url of PORTRAIT_CFG.depthUrls) {
    try {
      return await loadTexture(url, THREE.NoColorSpace);
    } catch {
      /* try next */
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
      /* try next */
    }
  }
  return false;
}

buildProcedural();
tryLoadPortrait();

/* ── Logo intro particles ── */
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

/* ── Environment ── */
const COUNT = reducedMotion ? 500 : 2200;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 28;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
}
const particles = new THREE.Points(
  new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
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

/* ── Intro ── */
const INTRO_MS = 4500;
const introStart = performance.now();
let introFinished = false;

function finishIntro(instant = false) {
  if (introFinished) return;
  introFinished = true;
  state.phase = "hero";
  state.heroT = 1;
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
  if (instant) {
    rig.scale.set(1, 1, 1);
  } else {
    rig.scale.setScalar(0.001);
  }
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
    onUpdate: (self) => {
      state.scroll = self.progress;
    },
  });

  if (heroCopy) {
    gsap.to(heroCopy, {
      opacity: 0,
      y: -40,
      ease: "none",
      scrollTrigger: {
        trigger: "#act2",
        start: "top 85%",
        end: "top 45%",
        scrub: 0.5,
      },
    });
  }

  gsap.from("#act2 .section__inner > *", {
    opacity: 0,
    y: 48,
    stagger: 0.08,
    scrollTrigger: { trigger: "#act2", start: "top 75%" },
  });
}

let scrollSetup = false;

/* ── Life: breath, blink, visor ── */
function updateLife(t, dt) {
  if (reducedMotion) {
    life.breath = 1;
    return;
  }

  life.breath = 1 + Math.sin(t * 1.15) * 0.014;
  if (!state.popIn) {
    rig.scale.set(1, life.breath, 1);
  }

  if (t >= life.nextBlink && life.blink <= 0) life.blink = 1;
  if (life.blink > 0) {
    life.blink -= dt / 0.14;
    const shut = life.blink > 0 ? 1 - life.blink : 1;
    const eyeOpen = Math.max(0.05, shut);
    if (eyeL) {
      eyeL.group.scale.y = eyeOpen;
      eyeR.group.scale.y = eyeOpen;
    }
    if (life.blink <= 0) life.nextBlink = t + 2.5 + Math.random() * 3.5;
  } else if (eyeL) {
    eyeL.group.scale.y = THREE.MathUtils.lerp(eyeL.group.scale.y, 1, 0.2);
    eyeR.group.scale.y = eyeL.group.scale.y;
  }

  if (Math.random() > 0.992) life.visorGlitch = 1;
  life.visorGlitch = Math.max(0, life.visorGlitch - dt * 4);

  if (visorMesh?.material) {
    const m = visorMesh.material;
    const pulse = 0.75 + Math.sin(t * 3.5) * 0.08;
    const glitch = life.visorGlitch * 1.4;
    const hover = state.hoverCyborg ? 0.5 : 0;
    if (m.emissiveIntensity !== undefined) {
      m.emissiveIntensity = pulse + glitch + hover;
    } else {
      m.opacity = 0.08 + pulse * 0.12 + glitch * 0.25 + hover * 0.1;
    }
  }

  if (depthParallax?.uniforms) {
    depthParallax.uniforms.uBreath.value = life.breath;
    const hoverRim = state.hoverCyborg ? 0.22 : 0;
    depthParallax.uniforms.uRimStrength.value = PORTRAIT_CFG.rimStrength + hoverRim;
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
  const yaw = mouse.tx * 0.38 * scrollDamp;
  const pitch = -mouse.ty * 0.22 * scrollDamp;
  head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, yaw, 0.07);
  head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, pitch, 0.07);

  if (depthParallax?.uniforms) {
    depthParallax.uniforms.uMouse.value.set(mouse.tx * 0.018, mouse.ty * 0.012);
    depthParallax.uniforms.uTilt.value.set(yaw * 0.15, pitch * 0.15);
  }

  raycaster.setFromCamera(mouse.ndc, camera);
  state.hoverCyborg = raycaster.intersectObject(cyborgHit, true).length > 0;

  if (eyeL && life.blink <= 0) {
    const s = state.hoverCyborg ? 1.25 : 1;
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
  bloom.strength = THREE.MathUtils.lerp(0.9, 0.55, s);
  particles.position.y = s * 0.8;
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

  if (state.phase === "intro") {
    const elapsed = (performance.now() - introStart) / 1000;
    updateLogoIntro(t, Math.min(elapsed / (INTRO_MS / 1000), 1));
    camera.position.z = THREE.MathUtils.lerp(5.4, 4.8, Math.min(elapsed / (INTRO_MS / 1000), 1));
    if (elapsed >= INTRO_MS / 1000) finishIntro(false);
  } else {
    updateLife(t, dt);
    updateEnterPop();
    updateLook();
    applyScrollLayout();

    const scrollScale = 1 - state.scroll * 0.42;
    const hoverScale = state.hoverCyborg ? 1.03 : 1;
    const target = scrollScale * hoverScale;
    cyborg.scale.setScalar(THREE.MathUtils.lerp(cyborg.scale.x, target, 0.1));

    head.children.forEach((child) => {
      if (child.userData.spin) child.rotation.z += child.userData.spin * 0.012;
    });

    rig.position.y = Math.sin(t * 0.7) * 0.02;
    particles.rotation.y = t * 0.01;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.x * 0.12 * (1 - state.scroll), 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.05 + mouse.y * 0.08 * (1 - state.scroll), 0.05);
    camera.position.z = 5.1;
    camera.lookAt(cyborg.position.x * 0.4, cyborg.position.y * 0.3, 0);
  }

  composer.render();
}

vignette?.classList.add("is-intro");
animate();
