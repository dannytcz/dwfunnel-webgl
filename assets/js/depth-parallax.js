import * as THREE from "three";

const VOID = new THREE.Color(0x030508);

/**
 * Build a depth texture from a color image when no depth map is supplied.
 * Uses luminance + center-weighted falloff so the face reads closer than the void.
 */
export function depthFromColor(image) {
  const w = image.width;
  const h = image.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const src = ctx.getImageData(0, 0, w, h).data;
  const out = ctx.createImageData(w, h);
  const cx = w * 0.5;
  const cy = h * 0.42;
  const maxR = Math.hypot(cx, cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];

      const voidDist = Math.hypot(r - 3, g - 5, b - 8);
      if (voidDist < 18) {
        out.data[i] = out.data[i + 1] = out.data[i + 2] = 0;
        out.data[i + 3] = 255;
        continue;
      }

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const greenBoost = Math.max(0, (g - Math.max(r, b)) / 255) * 0.35;
      const center = 1 - Math.hypot(x - cx, y - cy) / maxR;
      const centerW = Math.pow(Math.max(0, center), 0.55);

      let depth = lum * 0.55 + greenBoost + centerW * 0.45;
      depth = Math.pow(Math.min(1, depth), 1.15);

      const v = (depth * 255) | 0;
      out.data[i] = out.data[i + 1] = out.data[i + 2] = v;
      out.data[i + 3] = 255;
    }
  }

  blurDepthPass(out.data, w, h, 2);
  ctx.putImageData(out, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function blurDepthPass(data, w, h, radius) {
  const copy = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          sum += copy[(ny * w + nx) * 4];
          n++;
        }
      }
      const i = (y * w + x) * 4;
      const v = (sum / n) | 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }
}

const vertexShader = /* glsl */ `
uniform sampler2D uDepth;
uniform float uDisplacement;
uniform vec2 uTilt;
uniform float uBreath;

varying vec2 vUv;
varying float vDepth;
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  float depth = texture2D(uDepth, uv).r;
  vDepth = depth;

  vec3 pos = position;
  pos.z += depth * uDisplacement * uBreath;
  pos.x += uTilt.x * depth * 0.12;
  pos.y += uTilt.y * depth * 0.1;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  vNormalW = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2 uMouse;
uniform float uParallax;
uniform float uRimStrength;
uniform vec3 uRimColor;
uniform vec3 uVoidColor;
uniform float uVoidThreshold;

varying vec2 vUv;
varying float vDepth;
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  float depth = texture2D(uDepth, vUv).r;
  vec2 parallax = uMouse * depth * uParallax;
  vec2 uv = clamp(vUv + parallax, 0.001, 0.999);

  vec4 col = texture2D(uColor, uv);

  float voidDist = distance(col.rgb, uVoidColor);
  if (voidDist < uVoidThreshold && depth < 0.04) discard;

  float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.4);
  float rim = fresnel * uRimStrength * (0.35 + depth * 0.65);
  vec3 lit = col.rgb + uRimColor * rim;

  float edge = smoothstep(0.02, 0.12, depth);
  gl_FragColor = vec4(lit, col.a * edge);
}
`;

/**
 * @param {object} opts
 * @param {THREE.Texture} opts.colorMap
 * @param {THREE.Texture} opts.depthMap
 * @param {number} opts.planeHeight
 */
export function createDepthParallaxMesh(opts) {
  const {
    colorMap,
    depthMap,
    planeHeight,
    segments = 96,
    displacement = 0.38,
    parallax = 0.028,
    rimStrength = 0.55,
  } = opts;

  const aspect = colorMap.image.width / colorMap.image.height;
  const w = planeHeight * aspect;
  const h = planeHeight;

  const geo = new THREE.PlaneGeometry(w, h, segments, segments);

  const uniforms = {
    uColor: { value: colorMap },
    uDepth: { value: depthMap },
    uDisplacement: { value: displacement },
    uTilt: { value: new THREE.Vector2() },
    uBreath: { value: 1 },
    uMouse: { value: new THREE.Vector2() },
    uParallax: { value: parallax },
    uRimStrength: { value: rimStrength },
    uRimColor: { value: new THREE.Color(0x39ff14) },
    uVoidColor: { value: VOID },
    uVoidThreshold: { value: 0.08 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: true,
    depthTest: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;

  return {
    mesh,
    uniforms,
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

export async function loadTexture(url, colorSpace = THREE.SRGBColorSpace) {
  const loader = new THREE.TextureLoader();
  const tex = await loader.loadAsync(url);
  tex.colorSpace = colorSpace;
  return tex;
}
