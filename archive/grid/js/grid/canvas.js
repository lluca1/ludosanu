import { config, dom, state } from "./state.js";
import { initWalkers, updateStrokeStyle } from "./walkers.js";
import { refreshHoverMarker } from "./interactions.js";

function getViewportMetrics() {
  const visualViewport = window.visualViewport;
  const width = Math.round(
    visualViewport
      ? visualViewport.width
      : window.innerWidth || document.documentElement.clientWidth || 1
  );
  const height = Math.round(
    visualViewport
      ? visualViewport.height
      : window.innerHeight || document.documentElement.clientHeight || 1
  );
  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
  };
}

function applyViewportMetrics(metrics) {
  dom.root.style.setProperty("--viewport-width", `${metrics.width}px`);
  dom.root.style.setProperty("--viewport-height", `${metrics.height}px`);
}

function updateGridSize() {
  const minColumns = Math.max(3, Math.round(state.width / config.BASE_GRID_SIZE));
  state.gridSize = state.width / minColumns;
  dom.root.style.setProperty("--grid-size", `${state.gridSize}px`);
}

export function resizeCanvas() {
  const metrics = getViewportMetrics();
  applyViewportMetrics(metrics);
  const viewportWidth = metrics.width;
  const viewportHeight = metrics.height;

  state.width = viewportWidth * 2;
  state.height = viewportHeight * 2;
  state.dpr = window.devicePixelRatio || 1;

  dom.canvas.width = state.width * state.dpr;
  dom.canvas.height = state.height * state.dpr;
  dom.canvas.style.width = `${state.width}px`;
  dom.canvas.style.height = `${state.height}px`;

  updateGridSize();

  dom.ctx.setTransform(1, 0, 0, 1, 0, 0);
  dom.ctx.scale(state.dpr, state.dpr);
  dom.ctx.clearRect(0, 0, state.width, state.height);
  updateStrokeStyle();
  dom.ctx.lineCap = "round";
  dom.ctx.lineJoin = "round";

  initWalkers();
  refreshHoverMarker();
}

export function scheduleCanvasResize() {
  if (state.resizeHandle !== null) {
    cancelAnimationFrame(state.resizeHandle);
  }
  state.resizeHandle = requestAnimationFrame(() => {
    state.resizeHandle = null;
    resizeCanvas();
  });
}
