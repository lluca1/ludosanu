(function () {
  const buttons = document.querySelectorAll("#frame-categories button");
  const panels = document.querySelectorAll("#frame-right .panel");

  function show(name) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.category === name));
    panels.forEach((p) => p.classList.toggle("active", p.dataset.content === name));
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) return;
      show(btn.dataset.category);
      // category transition - window.dispatchEvent(new CustomEvent("column-fx-burst"));
    });
  });

  const themeButtons = document.querySelectorAll("#theme-toggle button");
  function setActiveTheme(name) {
    themeButtons.forEach((b) =>
      b.classList.toggle("active", b.dataset.theme === name),
    );
  }
  setActiveTheme(document.documentElement.dataset.theme || "dark");

  themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) return;
      const name = btn.dataset.theme;
      setActiveTheme(name);
      document.documentElement.setAttribute("data-theme", name);
      localStorage.setItem("theme", name);
      window.dispatchEvent(
        new CustomEvent("theme-change", { detail: name }),
      );
    });
  });
})();
