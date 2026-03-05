const SCROLL_DURATION = 700;
const COARSE_SCROLL_DURATION = 420;
let scrollAnimation = null;

function goToPage(x, y) {
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return;
  }

  const { width: viewportWidth, height: viewportHeight } = getPageSize(viewport);
  const targetX = x * viewportWidth;
  const targetY = y * viewportHeight;
  smoothScrollTo(viewport, targetX, targetY, getScrollDuration());
}

function getScrollDuration() {
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    return COARSE_SCROLL_DURATION;
  }
  return SCROLL_DURATION;
}

function getPageSize(viewport) {
  const grid = document.getElementById("grid");
  const styles = getComputedStyle(document.documentElement);
  const cssWidth = parseFloat(styles.getPropertyValue("--viewport-width"));
  const cssHeight = parseFloat(styles.getPropertyValue("--viewport-height"));
  const rect = viewport.getBoundingClientRect();
  const gridRect = grid ? grid.getBoundingClientRect() : null;
  const gridWidth = gridRect ? gridRect.width / 2 : 0;
  const gridHeight = gridRect ? gridRect.height / 2 : 0;
  const scrollWidth = viewport.scrollWidth ? viewport.scrollWidth / 2 : 0;
  const scrollHeight = viewport.scrollHeight ? viewport.scrollHeight / 2 : 0;
  const gridStyleWidth = grid ? parseFloat(getComputedStyle(grid).width) / 2 : 0;
  const gridStyleHeight = grid ? parseFloat(getComputedStyle(grid).height) / 2 : 0;

  const width =
    (Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : 0) ||
    (Number.isFinite(scrollWidth) && scrollWidth > 0 ? scrollWidth : 0) ||
    (Number.isFinite(gridWidth) && gridWidth > 0 ? gridWidth : 0) ||
    (Number.isFinite(gridStyleWidth) && gridStyleWidth > 0 ? gridStyleWidth : 0) ||
    rect.width ||
    viewport.clientWidth ||
    window.innerWidth ||
    1;
  const height =
    (Number.isFinite(cssHeight) && cssHeight > 0 ? cssHeight : 0) ||
    (Number.isFinite(scrollHeight) && scrollHeight > 0 ? scrollHeight : 0) ||
    (Number.isFinite(gridHeight) && gridHeight > 0 ? gridHeight : 0) ||
    (Number.isFinite(gridStyleHeight) && gridStyleHeight > 0 ? gridStyleHeight : 0) ||
    rect.height ||
    viewport.clientHeight ||
    window.innerHeight ||
    1;

  return { width, height };
}

function smoothScrollTo(element, targetX, targetY, duration = 600) {
  const startX = element.scrollLeft;
  const startY = element.scrollTop;
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;
  if (deltaX === 0 && deltaY === 0) {
    return;
  }
  // const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2; // cosine easing
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // cubic easing
  let startTime = null;

  if (scrollAnimation) {
    cancelAnimationFrame(scrollAnimation.frame);
    if (scrollAnimation.cleanup) {
      scrollAnimation.cleanup();
    }
  }

  if (element.classList) {
    element.classList.add("is-animating");
  }

  const cleanup = () => {
    if (element.classList) {
      element.classList.remove("is-animating");
    }
  };

  const state = { frame: null, cleanup, element };
  scrollAnimation = state;

  const step = (timestamp) => {
    if (scrollAnimation !== state) {
      return;
    }
    if (startTime === null) {
      startTime = timestamp;
    }
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = ease(progress);

    const nextLeft = startX + deltaX * eased;
    const nextTop = startY + deltaY * eased;
    if (typeof element.scrollTo === "function") {
      element.scrollTo(nextLeft, nextTop);
    } else {
      element.scrollLeft = nextLeft;
      element.scrollTop = nextTop;
    }

    if (progress < 1) {
      state.frame = requestAnimationFrame(step);
    } else {
      cleanup();
      if (typeof element.scrollTo === "function") {
        element.scrollTo(targetX, targetY);
      } else {
        element.scrollLeft = targetX;
        element.scrollTop = targetY;
      }
      if (scrollAnimation === state) {
        scrollAnimation = null;
      }
    }
  };

  state.frame = requestAnimationFrame(step);
}

window.goToPage = goToPage;
