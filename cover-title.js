function wrapTitleWords(title) {
  const words = title.textContent.trim().split(/\s+/).map((text) => {
    const word = document.createElement("span");
    word.className = "title-word";
    word.textContent = text;
    return word;
  });
  title.replaceChildren(...words.flatMap((word, index) => index ? [" ", word] : [word]));
  return words;
}

function ease(progress) {
  return progress * progress * (3 - 2 * progress);
}

export function createCoverTitle(heading, brand) {
  const header = brand.closest(".site-header");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)");
  const flight = document.createElement("div");
  flight.className = "title-flight";
  flight.setAttribute("aria-hidden", "true");
  flight.hidden = true;
  header.append(flight);

  let coverWords = [];
  let menuWords = [];
  let movingWords = [];
  let frame = 0;

  function draw() {
    frame = 0;
    const headerBottom = header.getBoundingClientRect().bottom;
    const titleBounds = heading.getBoundingClientRect();
    const transitionStart = headerBottom + 42;
    const distance = Math.min(100, Math.max(72, titleBounds.height * 0.7));
    const progress = Math.min(1, Math.max(0, (transitionStart - titleBounds.top) / distance));
    const animate = !reducedMotion.matches;
    const moving = animate && progress > 0 && progress < 1;

    header.classList.toggle("title-on-cover", animate && progress < 1);
    heading.classList.toggle("title-off-cover", animate && progress > 0);
    flight.hidden = !moving;
    if (!moving) return;

    const start = coverWords.map((word) => word.getBoundingClientRect());
    const end = menuWords.map((word) => word.getBoundingClientRect());
    // Set the final word sizes and spacing before bringing them onto one line.
    const align = ease(Math.min(1, progress / 0.76));
    const rise = ease(Math.max(0, (progress - 0.18) / 0.82));
    flight.style.setProperty("--title-progress", align);
    for (const [index, word] of movingWords.entries()) {
      const x = start[index].left + (end[index].left - start[index].left) * align;
      const y = start[index].top + (end[index].top - start[index].top) * rise;
      word.style.transform = `translate(${x}px, ${y}px)`;
      word.style.setProperty("--ink-change", `${headerBottom - y}px`);
    }
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(draw);
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("pageshow", schedule);
  reducedMotion.addEventListener("change", schedule);
  const resize = new ResizeObserver(schedule);
  resize.observe(heading);
  resize.observe(header);

  return () => {
    coverWords = wrapTitleWords(heading);
    menuWords = wrapTitleWords(brand);
    movingWords = coverWords.map((word) => word.cloneNode(true));
    flight.replaceChildren(...movingWords);
    schedule();
  };
}
