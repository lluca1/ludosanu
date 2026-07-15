import { config, dom, state } from "./state.js";
import { alignToGrid } from "./utils.js";
import { spawnWalkerAtIntersection } from "./walkers.js";

export function initHoverInteractions() {
  if (state.hoverState.marker || !supportsHoverInteractions()) {
    return;
  }

  state.hoverState.marker = document.createElement("div");
  state.hoverState.marker.className = "hover-marker";
  state.hoverState.marker.setAttribute("aria-hidden", "true");
  document.body.appendChild(state.hoverState.marker);

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("blur", hideHoverMarker);
  document.addEventListener("pointerleave", handlePointerLeave);
}

export function initPointerSpawns() {
  if (state.pointerSpawnInitialized) {
    return;
  }
  state.pointerSpawnInitialized = true;
  window.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointerup", handleGridPointerRelease);
  window.addEventListener("pointercancel", handleGridPointerRelease);
  window.addEventListener("blur", handleGridPointerRelease);
}

export function initScrollGuards() {
  if (!dom.viewport) {
    return;
  }

  const blockScroll = (event) => {
    event.preventDefault();
  };

  dom.viewport.addEventListener("wheel", blockScroll, { passive: false });

  const allowsCoarseScroll = window.matchMedia
    ? window.matchMedia("(pointer: coarse)").matches
    : false;
  if (!allowsCoarseScroll) {
    dom.viewport.addEventListener("touchmove", blockScroll, { passive: false });
  }

  window.addEventListener(
    "keydown",
    (event) => {
      if (config.BLOCKED_SCROLL_KEYS.has(event.key)) {
        event.preventDefault();
      }
    },
    true
  );
}

export function refreshHoverMarker() {
  if (!state.hoverState.marker || !state.hoverState.pointer) {
    return;
  }

  updateHoverPoint(state.hoverState.pointer.clientX, state.hoverState.pointer.clientY);
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

  let spawnPoint = state.hoverState.point;
  if (!spawnPoint) {
    spawnPoint = getAlignedPointFromClientCoords(event.clientX, event.clientY);
  }

  if (spawnPoint) {
    spawnWalkerAtIntersection(spawnPoint.x, spawnPoint.y);
  }
}

function handlePointerLeave() {
  state.hoverState.pointer = null;
  handleGridPointerRelease();
  hideHoverMarker();
}

function handleGridPointerRelease() {
  setGridInteractionState(false);
}

function updateHoverPoint(clientX, clientY) {
  state.hoverState.pointer = { clientX, clientY };

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

  state.hoverState.point = alignedPoint;
  setHoverMarkerPosition(alignedPoint.x, alignedPoint.y);
}

function getAlignedPointFromClientCoords(clientX, clientY) {
  const rect = dom.canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || x > state.width || y < 0 || y > state.height) {
    return null;
  }
  return {
    x: alignToGrid(x, 0, state.width),
    y: alignToGrid(y, 0, state.height),
  };
}

function setHoverMarkerPosition(x, y) {
  if (!state.hoverState.marker) {
    return;
  }

  const offsetX = x - (dom.viewport ? dom.viewport.scrollLeft : 0);
  const offsetY = y - (dom.viewport ? dom.viewport.scrollTop : 0);

  state.hoverState.marker.style.left = `${offsetX}px`;
  state.hoverState.marker.style.top = `${offsetY}px`;
  state.hoverState.marker.dataset.visible = "true";
}

function hideHoverMarker() {
  state.hoverState.point = null;
  if (state.hoverState.marker) {
    state.hoverState.marker.dataset.visible = "false";
  }
}

function isInteractiveElement(element) {
  if (!element) {
    return false;
  }
  return Boolean(element.closest(config.INTERACTIVE_SELECTOR));
}

function setGridInteractionState(isActive) {
  const body = document.body;
  if (!body) {
    return;
  }

  if (isActive) {
    if (state.gridInteractionActive) {
      return;
    }
    state.gridInteractionActive = true;
    body.setAttribute(config.GRID_INTERACTION_ATTR, "true");
    return;
  }

  if (!state.gridInteractionActive) {
    return;
  }

  state.gridInteractionActive = false;
  body.removeAttribute(config.GRID_INTERACTION_ATTR);
}
