(function () {
  const buttons = document.querySelectorAll("#frame-categories button");
  const panels = document.querySelectorAll("#frame-right .panel");

  const projects = [
    {
      name: "kana trainer",
      url: "https://github.com/lluca1/jp",
      description:
        "A flashcard site for learning hiragana and katakana, styled after the retro Japanese web.",
    },
    {
      name: "studentious",
      url: "https://github.com/lluca1/studentious",
      description:
        "A web app for collaborative learning through group study sessions.",
    },
    {
      name: "openxzbt",
      url: "https://github.com/lluca1/openxzbt",
      description:
        "An open-source platform for creating and exploring interactive 3D expositions.",
    },
  ];

  const projectList = document.getElementById("project-list");
  projects.forEach((project) => {
    const item = document.createElement("div");
    item.className = "project";

    const name = document.createElement("button");
    name.type = "button";
    name.className = "project-name";
    name.textContent = project.name;
    name.setAttribute("aria-expanded", "false");

    const body = document.createElement("div");
    body.className = "project-body";
    const inner = document.createElement("div");
    inner.className = "project-body-inner";
    inner.innerHTML =
      "<p>" +
      project.description +
      '</p><p><a href="' +
      project.url +
      '" target="_blank" rel="noopener noreferrer">github</a></p>';
    body.appendChild(inner);

    name.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      projectList.querySelectorAll(".project").forEach((p) => {
        p.classList.remove("open");
        p.querySelector(".project-name").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        name.setAttribute("aria-expanded", "true");
      }
    });

    item.appendChild(name);
    item.appendChild(body);
    projectList.appendChild(item);
  });

  function show(name) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.category === name));
    panels.forEach((p) => p.classList.toggle("active", p.dataset.content === name));
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) return;
      show(btn.dataset.category);
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
