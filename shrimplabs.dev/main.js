(() => {
  // Rotating hero word
  const words = ["next?", "for you?", "together?", "this week?", "to save you time?"];
  const el = document.getElementById("rotate");
  let i = 0;
  setInterval(() => {
    el.classList.add("out");
    setTimeout(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i];
      el.classList.remove("out");
    }, 300);
  }, 2600);

  // Case list: accordion + hover blob
  const blob = document.getElementById("blob");
  document.querySelectorAll(".case").forEach((c) => {
    const color = c.dataset.color;
    c.style.setProperty("--case-color", color);
    const row = c.querySelector(".case-row");
    row.addEventListener("click", () => {
      const open = c.classList.toggle("open");
      row.setAttribute("aria-expanded", open);
    });
    c.addEventListener("mouseenter", () => {
      blob.style.setProperty("--blob", color);
      blob.classList.add("on");
    });
    c.addEventListener("mouseleave", () => blob.classList.remove("on"));
  });
  window.addEventListener("mousemove", (e) => {
    blob.style.left = e.clientX + "px";
    blob.style.top = e.clientY + "px";
  });

  // Shop filters
  const filters = document.querySelectorAll(".filter");
  const products = document.querySelectorAll(".product");
  filters.forEach((f) =>
    f.addEventListener("click", () => {
      filters.forEach((x) => {
        x.classList.toggle("active", x === f);
        x.setAttribute("aria-selected", x === f);
      });
      const cat = f.dataset.filter;
      products.forEach((p) => {
        const show = cat === "all" || p.dataset.cat === cat || p.dataset.cat === "all";
        p.classList.toggle("hide", !show);
      });
    })
  );

  // "Get it" links preselect the product in the form
  const select = document.getElementById("f-app");
  document.querySelectorAll("[data-product]").forEach((a) =>
    a.addEventListener("click", () => {
      const name = a.dataset.product;
      [...select.options].forEach((o) => { if (o.text === name) select.value = o.value; });
    })
  );

  // Copy email
  const copy = document.getElementById("copy");
  const hint = document.getElementById("copy-hint");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copy.dataset.mail);
      hint.textContent = "copied ✓";
    } catch {
      window.location.href = "mailto:" + copy.dataset.mail;
    }
    setTimeout(() => (hint.textContent = "click to copy"), 2000);
  });

  // Scroll reveal
  const targets = document.querySelectorAll(".section-head, .lead, .case, .product, .tier, .steps li, .faq details, .about > *, .form");
  targets.forEach((t) => t.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  targets.forEach((t) => io.observe(t));

  document.getElementById("year").textContent = new Date().getFullYear();
})();
