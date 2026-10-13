(function () {
  const buttons = document.querySelectorAll("#frame-categories button");
  const panels = document.querySelectorAll("#frame-right .panel");

  document.querySelectorAll("#frame-right .project").forEach((item) => {
    const name = item.querySelector(".project-name");
    name.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      item.parentElement.querySelectorAll(".project").forEach((p) => {
        p.classList.remove("open");
        p.querySelector(".project-name").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        name.setAttribute("aria-expanded", "true");
      }
    });
  });

  function show(name) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.category === name));
    panels.forEach((p) => p.classList.toggle("active", p.dataset.content === name));
    document.getElementById("frame-right").scrollTop = 0;
  }

  try {
    const saved = localStorage.getItem("category");
    if (saved && document.querySelector(`.panel[data-content="${saved}"]`)) show(saved);
  } catch (e) {}

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) return;
      show(btn.dataset.category);
      try {
        localStorage.setItem("category", btn.dataset.category);
      } catch (e) {}
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
      try {
        localStorage.setItem("theme", name);
      } catch (e) {}
      window.dispatchEvent(
        new CustomEvent("theme-change", { detail: name }),
      );
    });
  });
})();
