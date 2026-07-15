import { resizeCanvas, scheduleCanvasResize } from "./canvas.js";
import {
  initHoverInteractions,
  initPointerSpawns,
  initScrollGuards,
} from "./interactions.js";
import { step, tintExistingLines, updateStrokeStyle } from "./walkers.js";

window.addEventListener("resize", scheduleCanvasResize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", scheduleCanvasResize);
}
window.addEventListener("orientationchange", scheduleCanvasResize);
window.addEventListener("themechange", () => {
  updateStrokeStyle();
  tintExistingLines();
});

resizeCanvas();
initHoverInteractions();
initPointerSpawns();
initScrollGuards();
requestAnimationFrame(step);
