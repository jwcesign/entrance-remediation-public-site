const slides = [
  { src: "slides/slide-1.png", title: "项目主入口优化事项", alt: "第 1 页：项目主入口优化事项封面" },
  { src: "slides/slide-2.png", title: "入口体验", alt: "第 2 页：销售展示中的入口体验" },
  { src: "slides/slide-3.png", title: "后续优化可能涉及的入口位置", alt: "第 3 页：后续优化可能涉及的入口位置" },
  { src: "slides/slide-4.png", title: "销售沙盘展示与目前大门方案存在差异", alt: "第 4 页：销售沙盘展示与目前大门方案存在差异" },
  { src: "slides/slide-5.png", title: "销售展示与后续优化的矛盾，有法可依", alt: "第 5 页：销售展示与后续优化的法律依据" },
  { src: "slides/slide-6.png", title: "小区车道紧邻大门出口，车辆与行人存在交叉风险", alt: "第 6 页：小区车道车辆与大门出口行人的交叉风险" },
  { src: "slides/slide-7.png", title: "优先方案：优化内部车行路线，采用纵向花坛", alt: "第 7 页：优化小区内部车行路线并采用纵向花坛与丰富造景" },
  { src: "slides/slide-8.png", title: "保底方案：车道无法优化时，采用横向小花坛", alt: "第 8 页：车道无法优化时采用横向小花坛的保底方案" },
  { src: "slides/slide-9.png", title: "核心诉求：保持入口整体造景品质", alt: "第 9 页：保持入口整体造景品质的核心诉求" },
];

const image = document.querySelector("#active-slide");
const title = document.querySelector("#slide-title");
const indicator = document.querySelector("#page-indicator");
const caption = document.querySelector("#slide-caption");
const stage = document.querySelector("#slide-stage");
const loading = document.querySelector("#slide-loading");
const error = document.querySelector("#slide-error");
const previous = document.querySelector("#previous-slide");
const next = document.querySelector("#next-slide");
const fullscreen = document.querySelector("#fullscreen-slide");
const retry = document.querySelector("#retry-slide");
const thumbnails = [...document.querySelectorAll(".thumbnail")];

let activeIndex = 0;

function setLoading(isLoading) {
  stage.setAttribute("aria-busy", String(isLoading));
  loading.hidden = !isLoading;
  if (isLoading) image.classList.remove("is-loaded");
}

function showSlide(index, { updateHash = true } = {}) {
  activeIndex = Math.max(0, Math.min(index, slides.length - 1));
  const slide = slides[activeIndex];

  setLoading(true);
  error.hidden = true;
  image.src = slide.src;
  image.alt = slide.alt;
  title.textContent = slide.title;
  indicator.textContent = `${activeIndex + 1} / ${slides.length}`;
  caption.textContent = `第 ${activeIndex + 1} 页，共 ${slides.length} 页`;
  previous.disabled = activeIndex === 0;
  next.disabled = activeIndex === slides.length - 1;

  thumbnails.forEach((button, buttonIndex) => {
    const selected = buttonIndex === activeIndex;
    button.classList.toggle("is-active", selected);
    if (selected) {
      button.setAttribute("aria-current", "page");
      button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    } else {
      button.removeAttribute("aria-current");
    }
  });

  if (updateHash) history.replaceState(null, "", `#page-${activeIndex + 1}`);

  const nextSlide = slides[activeIndex + 1];
  if (nextSlide) new Image().src = nextSlide.src;
}

image.addEventListener("load", () => {
  setLoading(false);
  image.classList.add("is-loaded");
});

image.addEventListener("error", () => {
  setLoading(false);
  error.hidden = false;
});

thumbnails.forEach((button) => {
  button.addEventListener("click", () => showSlide(Number(button.dataset.slide)));
});

previous.addEventListener("click", () => showSlide(activeIndex - 1));
next.addEventListener("click", () => showSlide(activeIndex + 1));
retry.addEventListener("click", () => {
  const currentSrc = image.src;
  image.src = "";
  requestAnimationFrame(() => { image.src = currentSrc; });
  error.hidden = true;
  setLoading(true);
});

fullscreen.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await stage.requestFullscreen();
    }
  } catch {
    fullscreen.textContent = "浏览器不支持全屏";
  }
});

document.addEventListener("fullscreenchange", () => {
  fullscreen.textContent = document.fullscreenElement ? "退出全屏" : "全屏查看";
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" && activeIndex > 0) showSlide(activeIndex - 1);
  if (event.key === "ArrowRight" && activeIndex < slides.length - 1) showSlide(activeIndex + 1);
});

const hashMatch = window.location.hash.match(/^#page-(\d+)$/);
const initialIndex = hashMatch ? Number(hashMatch[1]) - 1 : 0;
showSlide(initialIndex, { updateHash: false });
