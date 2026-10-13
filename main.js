import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { settings } from "./settings.js";

const params = { ...settings };

const GLOW_OPACITY = 0.46;
const INK_OPACITY = 0.9;

const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches ||
  "ontouchstart" in window;
const isSmallViewport = Math.min(window.innerWidth, window.innerHeight) <= 900;
const mobileOptimizedMode = isTouchDevice || isSmallViewport;

const quality = Math.min(
  1,
  Math.max(
    0.2,
    (Number.isFinite(params.quality) ? params.quality : 1) *
      (mobileOptimizedMode ? 0.78 : 1),
  ),
);

const scene = new THREE.Scene();

const cameraTarget = new THREE.Vector3(
  params.targetX,
  params.targetY,
  params.targetZ,
);

const frame = document.getElementById("frame");

const camera = new THREE.PerspectiveCamera(
  params.fov,
  frame.clientWidth / frame.clientHeight,
  0.1,
  500,
);
camera.position.set(params.cameraX, params.cameraY, params.cameraZ);

const mobileLayoutQuery = window.matchMedia("(max-width: 640px)");
const MOBILE_TARGET_Y_OFFSET = 2.5;
function applyViewportTarget() {
  cameraTarget.y = mobileLayoutQuery.matches
    ? params.targetY + MOBILE_TARGET_Y_OFFSET
    : params.targetY;
  camera.lookAt(cameraTarget);
}
mobileLayoutQuery.addEventListener("change", applyViewportTarget);

const maxPixelRatio = isTouchDevice ? 1.5 : 2;
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setSize(frame.clientWidth, frame.clientHeight);
applyViewportTarget();

function updateRendererQuality() {
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, maxPixelRatio),
  );
}

updateRendererQuality();
renderer.setClearColor(0x080808, 1);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.inset = "0";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.display = "block";
frame.appendChild(renderer.domElement);

const deformPos = new THREE.Vector3(
  params.deformX,
  params.deformY,
  params.deformZ,
);

const MARKER_RADIUS = 0.045;
const markerMaterial = new THREE.PointsMaterial({
  size: (2 * MARKER_RADIUS) / Math.tan(THREE.MathUtils.degToRad(params.fov) / 2),
  sizeAttenuation: true,
  color: 0xb8b8b8,
  transparent: true,
});
markerMaterial.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    `#include <color_fragment>
    float dM = length(gl_PointCoord - vec2(0.5));
    diffuseColor.a *= 1.0 - smoothstep(0.5 - fwidth(dM), 0.5, dM);
    `,
  );
};
const marker = new THREE.Points(
  new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(3), 3),
  ),
  markerMaterial,
);
marker.position.copy(deformPos);
scene.add(marker);

const chunkHeight = params.wavePeriod * params.cyclesPerChunk;
const numChunks = Math.max(2, params.numChunks);
const stackHeight = numChunks * chunkHeight;
const halfStack = stackHeight * 0.5;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pointsPerChunk = Math.max(
  1,
  Math.floor(params.pointsPerChunk * quality),
);

function makeChunkGeometry(seed) {
  const rnd = mulberry32(seed);
  const positions = new Float32Array(pointsPerChunk * 3);

  for (let i = 0; i < pointsPerChunk; i++) {
    const x = rnd() - 0.5;
    const y = rnd() * chunkHeight - chunkHeight * 0.5;
    const z = rnd() - 0.5;

    const j = i * 3;
    positions[j + 0] = x;
    positions[j + 1] = y;
    positions[j + 2] = z;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.userData.positions = positions;
  geo.computeBoundingSphere();
  return geo;
}

function regenerateChunkGeometry(geo, seed) {
  const rnd = mulberry32(seed);
  const positions = geo.userData.positions;
  const count = positions.length / 3;

  for (let i = 0; i < count; i++) {
    const x = rnd() - 0.5;
    const y = rnd() * chunkHeight - chunkHeight * 0.5;
    const z = rnd() - 0.5;

    const j = i * 3;
    positions[j + 0] = x;
    positions[j + 1] = y;
    positions[j + 2] = z;
  }

  geo.attributes.position.needsUpdate = true;
  geo.computeBoundingSphere();
}

const glowMaterial = new THREE.PointsMaterial({
  size: params.pointSize * 1.65,
  sizeAttenuation: true,
  color: 0xb8b8b8,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  opacity: GLOW_OPACITY,
});

const inkMaterial = new THREE.PointsMaterial({
  size: params.pointSize * 1.65,
  sizeAttenuation: true,
  color: 0x404040,
  transparent: true,
  depthWrite: false,
  opacity: 0,
});

const THEME_COLORS = {
  dark: { bg: 0x080808, particle: 0xb8b8b8, mix: 0 },
  light: { bg: 0xf4f4f4, particle: 0x404040, mix: 1 },
};
const GLOW_ACCENT = 0xffc296;
const INK_ACCENT = 0x36457f;
const THEME_DURATION = 0.6;
const initialTheme =
  document.documentElement.dataset.theme === "light" ? "light" : "dark";
const themeFromBg = new THREE.Color(THEME_COLORS[initialTheme].bg);
const themeToBg = new THREE.Color(THEME_COLORS[initialTheme].bg);
const themeFromParticle = new THREE.Color(
  THEME_COLORS[initialTheme].particle,
);
const themeToParticle = new THREE.Color(
  THEME_COLORS[initialTheme].particle,
);
const themeCurrentBg = new THREE.Color(THEME_COLORS[initialTheme].bg);
const themeCurrentParticle = new THREE.Color(
  THEME_COLORS[initialTheme].particle,
);
let themeMixFrom = THEME_COLORS[initialTheme].mix;
let themeMixTo = THEME_COLORS[initialTheme].mix;
let themeMixCurrent = THEME_COLORS[initialTheme].mix;
let themeStartTime = -Infinity;

renderer.setClearColor(themeCurrentBg, 1);
marker.material.color.copy(themeCurrentParticle);

window.addEventListener("theme-change", (e) => {
  const target = THEME_COLORS[e.detail] || THEME_COLORS.dark;
  themeFromBg.copy(themeCurrentBg);
  themeFromParticle.copy(themeCurrentParticle);
  themeMixFrom = themeMixCurrent;
  themeToBg.setHex(target.bg);
  themeToParticle.setHex(target.particle);
  themeMixTo = target.mix;
  themeStartTime = performance.now() / 1000;
});

function applyColumnShader(material, accentHex) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBase = { value: params.base };
    shader.uniforms.uAmp = { value: params.amplitude };
    shader.uniforms.uPeriod = { value: params.wavePeriod };
    shader.uniforms.uChunkH = { value: chunkHeight };

    shader.uniforms.uTime = { value: 0.0 };
    shader.uniforms.uDeformPos = { value: deformPos.clone() };
    shader.uniforms.uDeformRadius = { value: params.deformRadius };
    shader.uniforms.uSwirl = { value: params.swirlStrength };
    shader.uniforms.uRadial = { value: params.radialStrength };
    shader.uniforms.uChaos = { value: params.chaosStrength };
    shader.uniforms.uChaosFreq = { value: params.chaosFreq };
    shader.uniforms.uAccent = { value: new THREE.Color(accentHex) };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `
        #include <common>

        uniform float uBase;
        uniform float uAmp;
        uniform float uPeriod;
        uniform float uChunkH;

        uniform float uTime;
        uniform vec3  uDeformPos;
        uniform float uDeformRadius;
        uniform float uSwirl;
        uniform float uRadial;
        uniform float uChaos;
        uniform float uChaosFreq;

        varying float vRand;
        varying float vDepth;
        varying float vGlow;

        float triangleWave(float y, float period) {
          float t = y / period;
          return 2.0 * abs(2.0 * (t - floor(t + 0.5))) - 1.0;
        }

        float squareSize(float y) {
          return uBase * (1.0 + uAmp * triangleWave(y, uPeriod));
        }

        vec3 hashNoise3(vec3 p) {
          return vec3(
            sin(dot(p, vec3(127.1, 311.7, 74.7))),
            sin(dot(p, vec3(269.5, 183.3, 246.1))),
            sin(dot(p, vec3(113.5, 271.9, 124.6)))
          );
        }
        `,
      )
      .replace(
        "#include <begin_vertex>",
        `
        vec3 p = position;

        vRand = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453);

        float yForWave = p.y + 0.5 * uChunkH;
        float s = squareSize(yForWave);

        vec3 transformed = vec3(p.x * s, p.y, p.z * s);
        `,
      )
      .replace(
        "#include <project_vertex>",
        `
        vec4 worldPos = modelMatrix * vec4(transformed, 1.0);

        vec3 d = worldPos.xyz - uDeformPos;
        float dist = length(d);
        float r = max(uDeformRadius, 1e-4);
        float falloff = exp(-(dist * dist) / (2.0 * r * r));

        vec2 rel = worldPos.xz - uDeformPos.xz;

        float inv = 1.0 / (dist + 0.2);
        float wobble = 1.0 + 0.35 * sin(uTime * 2.0 + dist * 6.0);
        float angle = uSwirl * falloff * inv * wobble;

        float c = cos(angle);
        float sA = sin(angle);
        rel = mat2(c, -sA, sA, c) * rel;
        worldPos.xz = uDeformPos.xz + rel;

        vec3 dir = d / (dist + 1e-4);
        float pulse = 0.6 + 0.4 * sin(uTime * 3.0 - dist * 7.0);
        worldPos.xyz += dir * (uRadial * falloff * pulse);

        vec3 timeVec = vec3(cos(uTime), sin(uTime), cos(uTime * 2.0));
        vec3 n = hashNoise3(worldPos.xyz * uChaosFreq + timeVec);
        vec3 swirlBias = vec3(-dir.z, 0.15, dir.x);
        worldPos.xyz += (0.7 * n + 0.3 * swirlBias) * (uChaos * falloff);

        vGlow = falloff;

        vec4 mvPosition = viewMatrix * worldPos;
        vDepth = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
        `,
      );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <logdepthbuf_vertex>",
      `gl_PointSize *= mix(0.6, 1.8, vRand);
      gl_PointSize = max(gl_PointSize, 1.3);
      #include <logdepthbuf_vertex>`,
    );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        uniform vec3 uAccent;
        varying float vRand;
        varying float vDepth;
        varying float vGlow;
        `,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float dCoord = length(gl_PointCoord - vec2(0.5));
        float aSoft = exp(-10.0 * dCoord * dCoord) + 0.65 * exp(-55.0 * dCoord * dCoord);
        float tw = 0.8 + 0.2 * sin(uTime * (18.0 + floor(vRand * 14.0)) + vRand * 40.0);
        float aFade = mix(0.4, 1.0, exp(-0.06 * max(vDepth - 3.0, 0.0)));
        diffuseColor.rgb = mix(diffuseColor.rgb, uAccent, vGlow * 0.75);
        diffuseColor.rgb *= 0.8 + 0.4 * vRand;
        diffuseColor.a = min(
          1.0,
          diffuseColor.a * aSoft * tw * aFade * (1.0 + 1.4 * vGlow)
        );
        `,
      );

    material.userData.shader = shader;
  };
}

applyColumnShader(glowMaterial, GLOW_ACCENT);
applyColumnShader(inkMaterial, INK_ACCENT);

const group = new THREE.Group();
scene.add(group);
group.rotation.x = THREE.MathUtils.degToRad(params.tiltX);
group.rotation.z = THREE.MathUtils.degToRad(params.tiltZ);

const chunks = [];
const glowLayers = [];
const inkLayers = [];
let seedCounter = 1;

for (let i = 0; i < numChunks; i++) {
  const seed = seedCounter++;
  const geo = makeChunkGeometry(seed);

  const glowPts = new THREE.Points(geo, glowMaterial);
  glowPts.frustumCulled = false;
  const inkPts = new THREE.Points(geo, inkMaterial);
  inkPts.frustumCulled = false;
  inkPts.renderOrder = 1;

  const chunk = new THREE.Group();
  chunk.add(glowPts);
  chunk.add(inkPts);

  const baseY = (i - (numChunks - 1) / 2) * chunkHeight;
  chunk.position.y = baseY;
  chunk.userData.baseY = baseY;
  chunk.userData.seedOffset = i;
  chunk.userData.seed = seed;
  chunk.userData.geo = geo;
  group.add(chunk);
  chunks.push(chunk);
  glowLayers.push(glowPts);
  inkLayers.push(inkPts);
}

const loopDuration = Math.max(1, Number(params.loopDuration || 60));
const timeScale = (Math.PI * 2) / loopDuration;
const scrollSpeed = params.scrollSpeed;

const useOrbit = params.orbitEnabled >= 0.5;
const orbitYawBase = THREE.MathUtils.degToRad(params.orbitYaw);
const orbitPitch = THREE.MathUtils.degToRad(params.orbitPitch);
const orbitRadius = Math.max(0.1, params.orbitRadius);
const orbitCosPitch = Math.cos(orbitPitch);
const orbitSinPitch = Math.sin(orbitPitch);
const orbitSpeed = params.orbitSpeed;

let isVisible = !document.hidden;
let inView = true;
let pausedAt = 0;
let totalPaused = 0;

function onPauseStateChange() {
  const shouldRun = isVisible && inView;
  if (!shouldRun && !pausedAt) {
    pausedAt = performance.now() / 1000;
  } else if (shouldRun && pausedAt) {
    totalPaused += performance.now() / 1000 - pausedAt;
    pausedAt = 0;
  }
}

document.addEventListener("visibilitychange", () => {
  isVisible = !document.hidden;
  onPauseStateChange();
});

const io = new IntersectionObserver(
  ([entry]) => {
    inView = entry.isIntersecting;
    onPauseStateChange();
  },
  { threshold: 0 },
);
io.observe(frame);

const startTime = performance.now() / 1000;

function wrap(value, range) {
  return ((value % range) + range) % range;
}

function getElapsed() {
  return performance.now() / 1000 - startTime - totalPaused;
}

function getChunkWraps(baseY, scrollOffset) {
  const distance = scrollOffset + (halfStack - baseY);
  if (distance <= 0) return 0;
  return Math.floor(distance / stackHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (!isVisible || !inView) return;

  const elapsed = getElapsed();
  const timePhase = wrap(elapsed, loopDuration) * timeScale;

  const themeRaw =
    (performance.now() / 1000 - themeStartTime) / THEME_DURATION;
  const themeT = Math.min(1, Math.max(0, themeRaw));
  const themeEased = 1 - Math.pow(1 - themeT, 3);
  themeCurrentBg.copy(themeFromBg).lerp(themeToBg, themeEased);
  themeCurrentParticle
    .copy(themeFromParticle)
    .lerp(themeToParticle, themeEased);
  themeMixCurrent = themeMixFrom + (themeMixTo - themeMixFrom) * themeEased;

  renderer.setClearColor(themeCurrentBg, 1);
  document.body.style.backgroundColor = "#" + themeCurrentBg.getHexString();
  marker.material.color.copy(themeCurrentParticle);

  glowMaterial.opacity = GLOW_OPACITY * (1 - themeMixCurrent);
  inkMaterial.opacity = INK_OPACITY * themeMixCurrent;
  const glowVisible = glowMaterial.opacity > 0.003;
  const inkVisible = inkMaterial.opacity > 0.003;
  for (const pts of glowLayers) pts.visible = glowVisible;
  for (const pts of inkLayers) pts.visible = inkVisible;

  for (const m of [glowMaterial, inkMaterial]) {
    const sh = m.userData.shader;
    if (sh) {
      sh.uniforms.uTime.value = timePhase;
    }
  }

  if (useOrbit) {
    const yaw = orbitYawBase + elapsed * orbitSpeed;
    camera.position.set(
      cameraTarget.x + Math.cos(yaw) * orbitCosPitch * orbitRadius,
      cameraTarget.y + orbitSinPitch * orbitRadius,
      cameraTarget.z + Math.sin(yaw) * orbitCosPitch * orbitRadius,
    );
    camera.lookAt(cameraTarget);
  }

  const scrollOffset = wrap(scrollSpeed * elapsed, stackHeight);

  for (const chunk of chunks) {
    const baseY = chunk.userData.baseY;
    const wraps = getChunkWraps(baseY, scrollOffset);
    const seed = 1 + chunk.userData.seedOffset + wraps;

    if (seed !== chunk.userData.seed) {
      regenerateChunkGeometry(chunk.userData.geo, seed);
      chunk.userData.seed = seed;
    }

    const unwrappedY = baseY - scrollOffset;
    chunk.position.y =
      wrap(unwrappedY + halfStack, stackHeight) - halfStack;
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = frame.clientWidth / frame.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(frame.clientWidth, frame.clientHeight);
  updateRendererQuality();
  applyViewportTarget();
});

animate();
