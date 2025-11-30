const body = document.body;
const themeToggle = document.querySelector("[data-theme-toggle]");
const THEME_KEY = "theme-preference";

function applyTheme(mode) {
  if (mode === "dark") {
    body.dataset.theme = "dark";
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    body.removeAttribute("data-theme");
    if (mode === "light") {
      localStorage.setItem(THEME_KEY, "light");
    } else {
      localStorage.removeItem(THEME_KEY);
    }
  }
  updateToggleIcon();
  window.dispatchEvent(new Event("themechange"));
}

function updateToggleIcon() {
  if (!themeToggle) return;
  const isDark = body.dataset.theme === "dark";
  themeToggle.textContent = isDark ? "☀︎" : "☾";
  themeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
}

if (themeToggle) {
  const storedTheme = localStorage.getItem(THEME_KEY);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const prefersDark = media.matches;

  if (storedTheme === "dark" || (!storedTheme && prefersDark)) {
    applyTheme("dark");
  } else if (storedTheme === "light") {
    applyTheme("light");
  } else {
    updateToggleIcon();
  }

  media.addEventListener("change", (event) => {
    if (localStorage.getItem(THEME_KEY)) {
      return;
    }
    applyTheme(event.matches ? "dark" : "light");
  });

  themeToggle.addEventListener("click", () => {
    const nextTheme = body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}
