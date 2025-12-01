const SCROLL_DURATION = 800;
let scrollAnimation = null;

function goToPage(x, y) {
  const viewport = document.getElementById("viewport");
  if (!viewport) {
    return;
  }

  const viewportWidth = viewport.clientWidth || window.innerWidth;
  const viewportHeight = viewport.clientHeight || window.innerHeight;
  const targetX = x * viewportWidth;
  const targetY = y * viewportHeight;
  smoothScrollTo(viewport, targetX, targetY, SCROLL_DURATION);
}

function smoothScrollTo(element, targetX, targetY, duration = 600) {
  const startX = element.scrollLeft;
  const startY = element.scrollTop;
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;
  if (deltaX === 0 && deltaY === 0) {
    return;
  }

  const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
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

    element.scrollLeft = startX + deltaX * eased;
    element.scrollTop = startY + deltaY * eased;

    if (progress < 1) {
      state.frame = requestAnimationFrame(step);
    } else {
      cleanup();
      element.scrollLeft = targetX;
      element.scrollTop = targetY;
      if (scrollAnimation === state) {
        scrollAnimation = null;
      }
    }
  };

  state.frame = requestAnimationFrame(step);
}

window.goToPage = goToPage;
