const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");
const viewport = document.getElementById("viewport");

const BASE_GRID_SIZE = 26;
let gridSize = BASE_GRID_SIZE;
const EDGE_EPSILON = 0.5;
const speed = 1;
const maxWalkers = 8;
const walkers = [];
let width = 0;
let height = 0;
let dpr = window.devicePixelRatio || 1;
const root = document.documentElement;
const quarterTurn = Math.PI / 2;
let lineColor = "#000";
let resizeHandle = null;
let pointerSpawnInitialized = false;
const hoverState = {
  marker: null,
  point: null,
  pointer: null,
};
const GRID_INTERACTION_ATTR = "data-grid-interacting";
let gridInteractionActive = false;
const INTERACTIVE_SELECTOR = [
  ".card",
  ".panel-content",
  ".quadrant-nav",
  ".card-actions",
  ".card-nav",
  "[data-theme-toggle]",
  "button",
  "a",
].join(", ");
const CARDINAL_DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];
const EDGE_SPAWNERS = [
  () => ({
    x: snapToRange(Math.random() * (width / 2), 0, width / 2),
    y: 0,
    dir: { dx: 0, dy: 1 },
  }),
  () => ({
    x: 0,
    y: snapToRange(Math.random() * (height / 2), 0, height / 2),
    dir: { dx: 1, dy: 0 },
  }),
];
const BLOCKED_SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

function setGridInteractionState(isActive) {
  const body = document.body;
  if (!body) {
    return;
  }

  if (isActive) {
    if (gridInteractionActive) {
      return;
    }
    gridInteractionActive = true;
    body.setAttribute(GRID_INTERACTION_ATTR, "true");
    return;
  }

  if (!gridInteractionActive) {
    return;
  }

  gridInteractionActive = false;
  body.removeAttribute(GRID_INTERACTION_ATTR);
}

function handleGridPointerRelease() {
  setGridInteractionState(false);
}

function getViewportMetrics() {
  const visualViewport = window.visualViewport;
  const width = Math.round(visualViewport ? visualViewport.width : window.innerWidth || document.documentElement.clientWidth || 1);
  const height = Math.round(visualViewport ? visualViewport.height : window.innerHeight || document.documentElement.clientHeight || 1);
  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
  };
}

function applyViewportMetrics(metrics) {
  root.style.setProperty("--viewport-width", `${metrics.width}px`);
  root.style.setProperty("--viewport-height", `${metrics.height}px`);
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getAlignedPointFromClientCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || x > width || y < 0 || y > height) {
    return null;
  }
  return {
    x: alignToGrid(x, 0, width),
    y: alignToGrid(y, 0, height),
  };
}

function createWalkerFromSpawn(spawnPoint) {
  return {
    x: spawnPoint.x,
    y: spawnPoint.y,
    dir: { dx: spawnPoint.dir.dx, dy: spawnPoint.dir.dy },
    angle: 0,
    arc: null,
  };
}

function isInteractiveElement(element) {
  if (!element) {
    return false;
  }
  return Boolean(element.closest(INTERACTIVE_SELECTOR));
}

function resizeCanvas() {
  const metrics = getViewportMetrics();
  applyViewportMetrics(metrics);
  const viewportWidth = metrics.width;
  const viewportHeight = metrics.height;

  width = viewportWidth * 2;
  height = viewportHeight * 2;
  dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  updateGridSize();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  updateStrokeStyle();
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  initWalkers();
  refreshHoverMarker();
}

function scheduleCanvasResize() {
  if (resizeHandle !== null) {
    cancelAnimationFrame(resizeHandle);
  }
  resizeHandle = requestAnimationFrame(() => {
    resizeHandle = null;
    resizeCanvas();
  });
}

function updateGridSize() {
  const minColumns = Math.max(3, Math.round(width / BASE_GRID_SIZE));
  gridSize = width / minColumns;
  root.style.setProperty("--grid-size", `${gridSize}px`);
}

function initWalkers() {
  walkers.length = 0;
  for (let i = 0; i < maxWalkers; i += 1) {
    walkers.push(spawnWalker());
  }
}

function spawnWalker() {
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const walker = createWalkerFromSpawn(randomItem(EDGE_SPAWNERS)());
    if (prepareNextArc(walker)) {
      return walker;
    }
  }

  const fallback = createWalkerFromSpawn(EDGE_SPAWNERS[0]());
  prepareNextArc(fallback);
  return fallback;
}

function spawnWalkerAtIntersection(x, y) {
  const alignedX = alignToGrid(x, 0, width);
  const alignedY = alignToGrid(y, 0, height);
  const cardinalDirections = shuffle(CARDINAL_DIRECTIONS.slice());

  for (let i = 0; i < cardinalDirections.length; i += 1) {
    const dir = cardinalDirections[i];
    const walker = {
      x: alignedX,
      y: alignedY,
      dir: { dx: dir.dx, dy: dir.dy },
      angle: 0,
      arc: null,
    };

    if (prepareNextArc(walker)) {
      walkers.push(walker);
      return true;
    }
  }

  return false;
}

function snapToRange(value, min, max) {
  const span = max - min;
  if (span <= 0) return min;
  const snappedOffset = Math.round((value - min) / gridSize) * gridSize;
  const gridMaxOffset = Math.floor(span / gridSize) * gridSize;
  const clampedOffset = Math.min(Math.max(snappedOffset, 0), gridMaxOffset);
  return min + clampedOffset;
}

function alignToGrid(value, min = 0, max = Infinity) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const span = upper - lower;
  if (!Number.isFinite(span) || span <= 0) {
    return lower;
  }

  if (value <= lower + EDGE_EPSILON) {
    return lower;
  }
  if (value >= upper - EDGE_EPSILON) {
    return upper;
  }

  const snapped = Math.round((value - lower) / gridSize) * gridSize + lower;
  const gridMax = upper - ((span % gridSize) || 0);
  return Math.min(Math.max(snapped, lower), gridMax);
}

function step() {
  walkers.forEach((walker, index) => {
    advanceWalker(walker, index);
  });
  requestAnimationFrame(step);
}

function advanceWalker(walker, index) {
  if (!walker.arc) {
    walkers[index] = spawnWalker();
    return;
  }

  const orientation = walker.arc.turnDir === 1 ? -1 : 1;
  const angleStep = (speed / walker.arc.radius) * orientation;
  let nextAngle = walker.angle + angleStep;
  const reachedEnd =
    (orientation < 0 && nextAngle <= walker.arc.endAngle) ||
    (orientation > 0 && nextAngle >= walker.arc.endAngle);

  if (reachedEnd) {
    nextAngle = walker.arc.endAngle;
  }

  const nx = walker.arc.centerX + walker.arc.radius * Math.cos(nextAngle);
  const ny = walker.arc.centerY + walker.arc.radius * Math.sin(nextAngle);

  drawSegment(walker.x, walker.y, nx, ny);
  walker.x = nx;
  walker.y = ny;
  walker.angle = nextAngle;

  if (reachedEnd) {
    finalizeArc(walker, index);
  }
}

function finalizeArc(walker, index) {
  walker.x = alignToGrid(walker.arc.endX, 0, width);
  walker.y = alignToGrid(walker.arc.endY, 0, height);
  walker.dir = walker.arc.turnDir === 1 ? rotateCW(walker.dir) : rotateCCW(walker.dir);

  if (!prepareNextArc(walker)) {
    walkers[index] = spawnWalker();
  }

  if (Math.random() < 0.2 && walkers.length < maxWalkers) {
    walkers.push(spawnWalker());
  }
}

function prepareNextArc(walker) {
  const turnOptions = shuffle([-1, 1]);
  for (let i = 0; i < turnOptions.length; i += 1) {
    const turnDir = turnOptions[i];
    const arc = createArc(walker, turnDir);
    if (arc) {
      walker.arc = arc;
      walker.angle = arc.startAngle;
      return true;
    }
  }
  return false;
}

function createArc(walker, turnDir) {
  const normal = turnDir === 1 ? rotateCW(walker.dir) : rotateCCW(walker.dir);
  const centerX = walker.x + normal.dx * gridSize;
  const centerY = walker.y + normal.dy * gridSize;
  const startAngle = Math.atan2(walker.y - centerY, walker.x - centerX);
  const angleDelta = -turnDir * quarterTurn;
  const endAngle = startAngle + angleDelta;
  const endX = centerX + gridSize * Math.cos(endAngle);
  const endY = centerY + gridSize * Math.sin(endAngle);

  const boundaryMargin = EDGE_EPSILON;
  if (
    endX < -boundaryMargin ||
    endX > width + boundaryMargin ||
    endY < -boundaryMargin ||
    endY > height + boundaryMargin
  ) {
    return null;
  }

  return {
    centerX,
    centerY,
    radius: gridSize,
    startAngle,
    endAngle,
    turnDir,
    endX,
    endY,
  };
}

function rotateCW(dir) {
  return { dx: dir.dy, dy: -dir.dx };
}

function rotateCCW(dir) {
  return { dx: -dir.dy, dy: dir.dx };
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function drawSegment(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function updateStrokeStyle() {
  lineColor = getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#5b4b3a";
  ctx.strokeStyle = lineColor;
}

function tintExistingLines() {
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = lineColor;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}


function initHoverInteractions() {
  if (hoverState.marker || !supportsHoverInteractions()) {
    return;
  }

  hoverState.marker = document.createElement("div");
  hoverState.marker.className = "hover-marker";
  hoverState.marker.setAttribute("aria-hidden", "true");
  document.body.appendChild(hoverState.marker);

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("blur", hideHoverMarker);
  document.addEventListener("pointerleave", handlePointerLeave);
}

function initPointerSpawns() {
  if (pointerSpawnInitialized) {
    return;
  }
  pointerSpawnInitialized = true;
  window.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointerup", handleGridPointerRelease);
  window.addEventListener("pointercancel", handleGridPointerRelease);
  window.addEventListener("blur", handleGridPointerRelease);
}

function supportsHoverInteractions() {
  if (!window.matchMedia) {
    return true;
  }
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function handlePointerMove(event) {
  updateHoverPoint(event.clientX, event.clientY);
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  const topElement = document.elementFromPoint(event.clientX, event.clientY);
  if (isInteractiveElement(topElement)) {
    handleGridPointerRelease();
    return;
  }

  setGridInteractionState(true);

  let spawnPoint = hoverState.point;
  if (!spawnPoint) {
    spawnPoint = getAlignedPointFromClientCoords(event.clientX, event.clientY);
  }

  if (spawnPoint) {
    spawnWalkerAtIntersection(spawnPoint.x, spawnPoint.y);
  }
}

function handlePointerLeave() {
  hoverState.pointer = null;
  handleGridPointerRelease();
  hideHoverMarker();
}

function updateHoverPoint(clientX, clientY) {
  hoverState.pointer = { clientX, clientY };

  const topElement = document.elementFromPoint(clientX, clientY);
  if (!topElement || isInteractiveElement(topElement)) {
    hideHoverMarker();
    return;
  }

  const alignedPoint = getAlignedPointFromClientCoords(clientX, clientY);
  if (!alignedPoint) {
    hideHoverMarker();
    return;
  }

  hoverState.point = alignedPoint;
  setHoverMarkerPosition(alignedPoint.x, alignedPoint.y);
}

function setHoverMarkerPosition(x, y) {
  if (!hoverState.marker) {
    return;
  }

  const offsetX = x - (viewport ? viewport.scrollLeft : 0);
  const offsetY = y - (viewport ? viewport.scrollTop : 0);

  hoverState.marker.style.left = `${offsetX}px`;
  hoverState.marker.style.top = `${offsetY}px`;
  hoverState.marker.dataset.visible = "true";
}

function hideHoverMarker() {
  hoverState.point = null;
  if (hoverState.marker) {
    hoverState.marker.dataset.visible = "false";
  }
}

function refreshHoverMarker() {
  if (!hoverState.marker || !hoverState.pointer) {
    return;
  }

  updateHoverPoint(hoverState.pointer.clientX, hoverState.pointer.clientY);
}

function initScrollGuards() {
  if (!viewport) {
    return;
  }

  const blockScroll = (event) => {
    event.preventDefault();
  };

  viewport.addEventListener("wheel", blockScroll, { passive: false });

  const allowsCoarseScroll = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
  if (!allowsCoarseScroll) {
    viewport.addEventListener("touchmove", blockScroll, { passive: false });
  }

  window.addEventListener(
    "keydown",
    (event) => {
      if (BLOCKED_SCROLL_KEYS.has(event.key)) {
        event.preventDefault();
      }
    },
    true
  );
}

window.addEventListener("resize", scheduleCanvasResize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", scheduleCanvasResize);
}
window.addEventListener("themechange", () => {
  updateStrokeStyle();
  tintExistingLines();
});
resizeCanvas();
initHoverInteractions();
initPointerSpawns();
initScrollGuards();
requestAnimationFrame(step);
