const body = document.body;
const themeToggle = document.querySelector("[data-theme-toggle]");
const THEME_KEY = "theme-preference";

function applyTheme(mode) {
  if (mode === "dark") {
    body.dataset.theme = "dark";
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    body.removeAttribute("data-theme");
    localStorage.removeItem(THEME_KEY);
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
  if (storedTheme === "dark") {
    applyTheme("dark");
  } else {
    updateToggleIcon();
  }

  themeToggle.addEventListener("click", () => {
    const nextTheme = body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}
