const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const currentPage = body.dataset.page;
if (currentPage) {
  document.querySelectorAll(`[data-nav="${currentPage}"]`).forEach((link) => {
    link.classList.add("is-active");
    link.setAttribute("aria-current", "page");
  });
}

const heroCarousel = document.querySelector(".hero-carousel");
if (heroCarousel) {
  const slides = Array.from(heroCarousel.querySelectorAll(".hero-slide"));
  const previousButton = heroCarousel.querySelector(".hero-carousel-prev");
  const nextButton = heroCarousel.querySelector(".hero-carousel-next");
  const dotsWrapper = heroCarousel.querySelector(".hero-carousel-dots");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  let autoplayId;
  let isPointerInside = false;
  let isFocusInside = false;

  if (activeIndex < 0) activeIndex = 0;

  const dots = slides.map((slide, index) => {
    slide.setAttribute("aria-hidden", String(index !== activeIndex));

    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Afficher la photo ${index + 1}`);
    dot.addEventListener("click", () => {
      showSlide(index);
      restartAutoplay();
    });
    dotsWrapper.appendChild(dot);
    return dot;
  });

  const updateDots = () => {
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });
  };

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });
    updateDots();
  }

  const nextSlide = () => showSlide(activeIndex + 1);
  const previousSlide = () => showSlide(activeIndex - 1);

  const stopAutoplay = () => {
    if (autoplayId) {
      window.clearInterval(autoplayId);
      autoplayId = undefined;
    }
  };

  const startAutoplay = () => {
    if (reduceMotion.matches || slides.length < 2 || isPointerInside || isFocusInside) return;
    stopAutoplay();
    autoplayId = window.setInterval(nextSlide, 5000);
  };

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  if (previousButton && nextButton && slides.length > 1) {
    previousButton.addEventListener("click", () => {
      previousSlide();
      restartAutoplay();
    });
    nextButton.addEventListener("click", () => {
      nextSlide();
      restartAutoplay();
    });
  }

  heroCarousel.addEventListener("mouseenter", () => {
    isPointerInside = true;
    stopAutoplay();
  });
  heroCarousel.addEventListener("mouseleave", () => {
    isPointerInside = false;
    startAutoplay();
  });
  heroCarousel.addEventListener("focusin", () => {
    isFocusInside = true;
    stopAutoplay();
  });
  heroCarousel.addEventListener("focusout", (event) => {
    isFocusInside = heroCarousel.contains(event.relatedTarget);
    startAutoplay();
  });
  reduceMotion.addEventListener("change", restartAutoplay);

  showSlide(activeIndex);
  startAutoplay();
}

const galleryButtons = document.querySelectorAll(".gallery-item");
if (galleryButtons.length) {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.innerHTML = '<button type="button" aria-label="Fermer la photo">×</button><img alt="">';
  document.body.appendChild(lightbox);

  const lightboxImage = lightbox.querySelector("img");
  const closeButton = lightbox.querySelector("button");

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightboxImage.removeAttribute("src");
  };

  galleryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const image = button.querySelector("img");
      lightboxImage.src = image.src;
      lightboxImage.alt = image.alt;
      lightbox.classList.add("is-open");
      closeButton.focus();
    });
  });

  closeButton.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
  });
}
