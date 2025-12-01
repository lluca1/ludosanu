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
let gridColor = "rgba(91, 75, 58, 0.18)";
const GRID_LINE_WIDTH = 1;
const hoverState = {
  marker: null,
  point: null,
  pointer: null,
};
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

function isInteractiveElement(element) {
  if (!element) {
    return false;
  }
  return Boolean(element.closest(INTERACTIVE_SELECTOR));
}

function resizeCanvas() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

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
  drawGridBackground();
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  initWalkers();
  refreshHoverMarker();
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
    const allowedEdges = [0, 2];
    const edge = allowedEdges[Math.floor(Math.random() * allowedEdges.length)];
    let x = 0;
    let y = 0;
    let dir = { dx: 0, dy: 0 };
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    if (edge === 0) {
      x = snapToRange(Math.random() * halfWidth, 0, halfWidth);
      y = 0;
      dir = { dx: 0, dy: 1 };
    } else if (edge === 2) {
      x = 0;
      y = snapToRange(Math.random() * halfHeight, 0, halfHeight);
      dir = { dx: 1, dy: 0 };
    }

    const walker = {
      x,
      y,
      dir,
      angle: 0,
      arc: null,
    };

    if (prepareNextArc(walker)) {
      return walker;
    }
  }

  const fallback = {
    x: snapToRange(Math.random() * (width / 2), 0, width / 2),
    y: 0,
    dir: { dx: 0, dy: 1 },
    angle: 0,
    arc: null,
  };
  prepareNextArc(fallback);
  return fallback;
}

function spawnWalkerAtIntersection(x, y) {
  const alignedX = alignToGrid(x, 0, width);
  const alignedY = alignToGrid(y, 0, height);
  const cardinalDirections = shuffle([
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ]);

  for (let i = 0; i < cardinalDirections.length; i += 1) {
    const walker = {
      x: alignedX,
      y: alignedY,
      dir: cardinalDirections[i],
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
  const styles = getComputedStyle(document.documentElement);
  lineColor = styles.getPropertyValue("--line").trim() || "#5b4b3a";
  gridColor = styles.getPropertyValue("--grid").trim() || "rgba(91, 75, 58, 0.18)";
  ctx.strokeStyle = lineColor;
}

function tintExistingLines() {
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = lineColor;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawGridBackground(compositeMode = "source-over") {
  ctx.save();
  ctx.globalCompositeOperation = compositeMode;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = GRID_LINE_WIDTH;
  ctx.beginPath();
  for (let x = 0; x <= width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function removeGridBackground() {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = GRID_LINE_WIDTH + 0.5;
  ctx.beginPath();
  for (let x = 0; x <= width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function initHoverInteractions() {
  if (hoverState.marker) {
    return;
  }

  hoverState.marker = document.createElement("div");
  hoverState.marker.className = "hover-marker";
  hoverState.marker.setAttribute("aria-hidden", "true");
  document.body.appendChild(hoverState.marker);

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("blur", hideHoverMarker);
  document.addEventListener("pointerleave", handlePointerLeave);
}

function handlePointerMove(event) {
  updateHoverPoint(event.clientX, event.clientY);
}

function handlePointerDown(event) {
  if (event.button !== 0 || !hoverState.point) {
    return;
  }

  const topElement = document.elementFromPoint(event.clientX, event.clientY);
  if (isInteractiveElement(topElement)) {
    return;
  }

  spawnWalkerAtIntersection(hoverState.point.x, hoverState.point.y);
}

function handlePointerLeave() {
  hoverState.pointer = null;
  hideHoverMarker();
}

function updateHoverPoint(clientX, clientY) {
  hoverState.pointer = { clientX, clientY };

  const topElement = document.elementFromPoint(clientX, clientY);
  if (!topElement || isInteractiveElement(topElement)) {
    hideHoverMarker();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (x < 0 || x > width || y < 0 || y > height) {
    hideHoverMarker();
    return;
  }

  const alignedX = alignToGrid(x, 0, width);
  const alignedY = alignToGrid(y, 0, height);

  hoverState.point = { x: alignedX, y: alignedY };
  setHoverMarkerPosition(alignedX, alignedY);
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
  viewport.addEventListener("touchmove", blockScroll, { passive: false });

  window.addEventListener(
    "keydown",
    (event) => {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "];
      if (keys.includes(event.key)) {
        event.preventDefault();
      }
    },
    true
  );
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("themechange", () => {
  removeGridBackground();
  updateStrokeStyle();
  tintExistingLines();
  drawGridBackground("destination-over");
});
resizeCanvas();
initHoverInteractions();
initScrollGuards();
requestAnimationFrame(step);
