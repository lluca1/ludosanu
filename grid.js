const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 26;
const speed = 2;
const maxWalkers = 2;
const walkers = [];
let width = 0;
let height = 0;
let dpr = window.devicePixelRatio || 1;
const quarterTurn = Math.PI / 2;
let lineColor = "#000";

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  updateStrokeStyle();
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  initWalkers();
}

function initWalkers() {
  walkers.length = 0;
  for (let i = 0; i < maxWalkers; i += 1) {
    walkers.push(spawnWalker());
  }
}

function spawnWalker() {
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    let dir = { dx: 0, dy: 0 };

    if (edge === 0) {
      x = snapToRange(Math.random() * width, 0, width);
      y = 0;
      dir = { dx: 0, dy: 1 };
    } else if (edge === 1) {
      x = snapToRange(Math.random() * width, 0, width);
      y = height;
      dir = { dx: 0, dy: -1 };
    } else if (edge === 2) {
      x = 0;
      y = snapToRange(Math.random() * height, 0, height);
      dir = { dx: 1, dy: 0 };
    } else {
      x = width;
      y = snapToRange(Math.random() * height, 0, height);
      dir = { dx: -1, dy: 0 };
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
    x: width / 2,
    y: height / 2,
    dir: { dx: 0, dy: 1 },
    angle: 0,
    arc: null,
  };
  prepareNextArc(fallback);
  return fallback;
}

function snapToRange(value, min, max) {
  const span = max - min;
  if (span <= 0) return min;
  const snappedOffset = Math.round((value - min) / gridSize) * gridSize;
  const clampedOffset = Math.min(Math.max(snappedOffset, 0), span);
  return min + clampedOffset;
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
  walker.x = walker.arc.endX;
  walker.y = walker.arc.endY;
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

  if (endX < 0 || endX > width || endY < 0 || endY > height) {
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

window.addEventListener("resize", resizeCanvas);
window.addEventListener("themechange", () => {
  updateStrokeStyle();
  tintExistingLines();
});
resizeCanvas();
requestAnimationFrame(step);
