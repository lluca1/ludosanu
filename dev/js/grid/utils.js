import { config, state } from "./state.js";

export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function snapToRange(value, min, max) {
  const span = max - min;
  if (span <= 0) {
    return min;
  }
  const snappedOffset = Math.round((value - min) / state.gridSize) * state.gridSize;
  const gridMaxOffset = Math.floor(span / state.gridSize) * state.gridSize;
  const clampedOffset = Math.min(Math.max(snappedOffset, 0), gridMaxOffset);
  return min + clampedOffset;
}

export function alignToGrid(value, min = 0, max = Infinity) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const span = upper - lower;
  if (!Number.isFinite(span) || span <= 0) {
    return lower;
  }

  if (value <= lower + config.EDGE_EPSILON) {
    return lower;
  }
  if (value >= upper - config.EDGE_EPSILON) {
    return upper;
  }

  const snapped = Math.round((value - lower) / state.gridSize) * state.gridSize + lower;
  const gridMax = upper - ((span % state.gridSize) || 0);
  return Math.min(Math.max(snapped, lower), gridMax);
}
