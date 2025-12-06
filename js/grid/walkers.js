import { config, dom, state } from "./state.js";
import { alignToGrid, randomItem, shuffle, snapToRange } from "./utils.js";

const EDGE_SPAWNERS = [
  () => ({
    x: snapToRange(Math.random() * (state.width / 2), 0, state.width / 2),
    y: 0,
    dir: { dx: 0, dy: 1 },
  }),
  () => ({
    x: 0,
    y: snapToRange(Math.random() * (state.height / 2), 0, state.height / 2),
    dir: { dx: 1, dy: 0 },
  }),
];

function createWalkerFromSpawn(spawnPoint) {
  return {
    x: spawnPoint.x,
    y: spawnPoint.y,
    dir: { dx: spawnPoint.dir.dx, dy: spawnPoint.dir.dy },
    angle: 0,
    arc: null,
  };
}

export function initWalkers() {
  state.walkers.length = 0;
  for (let i = 0; i < config.INITIAL_WALKER_COUNT; i += 1) {
    state.walkers.push(spawnWalker());
  }
}

export function spawnWalkerAtIntersection(x, y) {
  const alignedX = alignToGrid(x, 0, state.width);
  const alignedY = alignToGrid(y, 0, state.height);
  const cardinalDirections = shuffle(config.CARDINAL_DIRECTIONS.slice());

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
      state.walkers.push(walker);
      return true;
    }
  }

  return false;
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

export function step() {
  state.walkers.forEach((walker, index) => {
    advanceWalker(walker, index);
  });
  requestAnimationFrame(step);
}

function advanceWalker(walker, index) {
  if (!walker.arc) {
    state.walkers[index] = spawnWalker();
    return;
  }

  const orientation = walker.arc.turnDir === 1 ? -1 : 1;
  const angleStep = (config.SPEED / walker.arc.radius) * orientation;
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
  walker.x = alignToGrid(walker.arc.endX, 0, state.width);
  walker.y = alignToGrid(walker.arc.endY, 0, state.height);
  walker.dir = walker.arc.turnDir === 1 ? rotateCW(walker.dir) : rotateCCW(walker.dir);

  if (!prepareNextArc(walker)) {
    state.walkers[index] = spawnWalker();
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
  const centerX = walker.x + normal.dx * state.gridSize;
  const centerY = walker.y + normal.dy * state.gridSize;
  const startAngle = Math.atan2(walker.y - centerY, walker.x - centerX);
  const angleDelta = -turnDir * config.QUARTER_TURN;
  const endAngle = startAngle + angleDelta;
  const endX = centerX + state.gridSize * Math.cos(endAngle);
  const endY = centerY + state.gridSize * Math.sin(endAngle);

  const boundaryMargin = config.EDGE_EPSILON;
  if (
    endX < -boundaryMargin ||
    endX > state.width + boundaryMargin ||
    endY < -boundaryMargin ||
    endY > state.height + boundaryMargin
  ) {
    return null;
  }

  return {
    centerX,
    centerY,
    radius: state.gridSize,
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

function drawSegment(x1, y1, x2, y2) {
  dom.ctx.beginPath();
  dom.ctx.moveTo(x1, y1);
  dom.ctx.lineTo(x2, y2);
  dom.ctx.stroke();
}

export function updateStrokeStyle() {
  const target = document.body || dom.root;
  const styles = getComputedStyle(target);
  state.lineColor = styles.getPropertyValue("--line").trim() || "#5b4b3a";
  const borderWidth = parseFloat(styles.getPropertyValue("--border-width"));
  dom.ctx.strokeStyle = state.lineColor;
  dom.ctx.lineWidth = Number.isFinite(borderWidth) ? borderWidth : 2;
}

export function tintExistingLines() {
  dom.ctx.save();
  dom.ctx.globalCompositeOperation = "source-atop";
  dom.ctx.fillStyle = state.lineColor;
  dom.ctx.fillRect(0, 0, state.width, state.height);
  dom.ctx.restore();
}
