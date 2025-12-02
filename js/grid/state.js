const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");
const viewport = document.getElementById("viewport");
const root = document.documentElement;

export const dom = {
  canvas,
  ctx,
  viewport,
  root,
};

export const config = {
  BASE_GRID_SIZE: 26,
  EDGE_EPSILON: 0.5,
  SPEED: 1,
  INITIAL_WALKER_COUNT: 5,
  QUARTER_TURN: Math.PI / 2, // changing this value has interesting effects
  GRID_INTERACTION_ATTR: "data-grid-interacting",
  INTERACTIVE_SELECTOR: [
    ".card",
    ".panel-content",
    ".quadrant-nav",
    ".card-actions",
    ".card-nav",
    "[data-theme-toggle]",
    "button",
    "a",
  ].join(", "),
  CARDINAL_DIRECTIONS: [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ],
  BLOCKED_SCROLL_KEYS: new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "PageUp",
    "PageDown",
    "Home",
    "End",
    " ",
  ]),
};

export const state = {
  gridSize: config.BASE_GRID_SIZE,
  width: 0,
  height: 0,
  dpr: window.devicePixelRatio || 1,
  lineColor: "#000",
  resizeHandle: null,
  pointerSpawnInitialized: false,
  hoverState: {
    marker: null,
    point: null,
    pointer: null,
  },
  gridInteractionActive: false,
  walkers: [],
};
