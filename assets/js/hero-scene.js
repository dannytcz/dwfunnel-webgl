import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const canvas = document.getElementById("hero-canvas");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x030508, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030508, 0.045);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0.2, 5.2);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.35, 0.15);
composer.addPass(bloom);

/* ── Lights ── */
scene.add(new THREE.AmbientLight(0x0a1a0f, 0.35));
const key = new THREE.PointLight(0x39ff14, 12, 20);
key.position.set(2, 1.5, 3);
scene.add(key);
const rim = new THREE.PointLight(0x00ffaa, 8, 16);
rim.position.set(-2.5, 0.5, -1);
scene.add(rim);

/* ── Robot core group ── */
const core = new THREE.Group();
scene.add(core);

const neonMat = new THREE.MeshStandardMaterial({
  color: 0x051008,
  emissive: 0x39ff14,
  emissiveIntensity: 0.85,
  metalness: 0.9,
  roughness: 0.25,
});

const wireMat = new THREE.MeshBasicMaterial({
  color: 0x39ff14,
  wireframe: true,
  transparent: true,
  opacity: 0.35,
});

const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 2), neonMat);
core.add(head);

const wireHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.88, 1), wireMat);
core.add(wireHead);

const eyeGeo = new THREE.SphereGeometry(0.08, 16, 16);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
eyeL.position.set(-0.22, 0.12, 0.62);
const eyeR = eyeL.clone();
eyeR.position.x = 0.22;
core.add(eyeL, eyeR);

const ringMat = new THREE.MeshStandardMaterial({
  color: 0x020403,
  emissive: 0x1aff66,
  emissiveIntensity: 1.2,
  metalness: 1,
  roughness: 0.15,
});

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95 + i * 0.12, 0.018, 8, 64), ringMat);
  ring.rotation.x = Math.PI / 2 + i * 0.15;
  ring.rotation.y = i * 0.4;
  ring.userData.spin = 0.15 + i * 0.08;
  core.add(ring);
}

const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.35), neonMat);
jaw.position.set(0, -0.45, 0.35);
core.add(jaw);

const headset = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 48, Math.PI), ringMat);
headset.rotation.z = Math.PI;
headset.position.set(0, 0.55, 0);
core.add(headset);

/* ── Particles ── */
const COUNT = reducedMotion ? 400 : 1800;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 24;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 4;
}
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const particles = new THREE.Points(
  particleGeo,
  new THREE.PointsMaterial({
    color: 0x39ff14,
    size: 0.035,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
scene.add(particles);

/* ── Grid floor ── */
const grid = new THREE.GridHelper(16, 32, 0x39ff14, 0x0d2a14);
grid.material.opacity = 0.22;
grid.material.transparent = true;
grid.position.y = -1.35;
scene.add(grid);

/* ── Input ── */
if (!reducedMotion) {
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
}

window.addEventListener("resize", resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  mouse.x += (mouse.tx - mouse.x) * 0.06;
  mouse.y += (mouse.ty - mouse.y) * 0.06;

  if (!reducedMotion) {
    core.rotation.y = t * 0.22 + mouse.x * 0.35;
    core.rotation.x = Math.sin(t * 0.4) * 0.08 + mouse.y * 0.12;
    core.position.y = Math.sin(t * 0.8) * 0.06;

    core.children.forEach((child) => {
      if (child.userData.spin) {
        child.rotation.z += child.userData.spin * 0.016;
      }
    });

    particles.rotation.y = t * 0.015;
    eyeL.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    eyeR.scale.copy(eyeL.scale);
  }

  camera.position.x = mouse.x * 0.35;
  camera.position.y = 0.2 + mouse.y * 0.2;
  camera.lookAt(0, 0, 0);

  composer.render();
}

animate();
