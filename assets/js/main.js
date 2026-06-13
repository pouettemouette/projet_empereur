const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  const desktopNavQuery = window.matchMedia("(min-width: 921px)");

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!siteNav.classList.contains("is-open")) return;
    siteNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) navToggle.focus();
  };

  navToggle.addEventListener("click", () => {
    const shouldOpen = !siteNav.classList.contains("is-open");
    siteNav.classList.toggle("is-open", shouldOpen);
    navToggle.setAttribute("aria-expanded", String(shouldOpen));
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu({ restoreFocus: true });
    }
  });

  const closeMenuOnDesktop = () => {
    if (desktopNavQuery.matches) closeMenu();
  };

  if (typeof desktopNavQuery.addEventListener === "function") {
    desktopNavQuery.addEventListener("change", closeMenuOnDesktop);
  } else {
    desktopNavQuery.addListener(closeMenuOnDesktop);
  }
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
  if (slides.length && dotsWrapper) {
    let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
    let autoplayId;
    let isPointerInside = false;
    let isFocusInside = false;
    let touchStartX = 0;
    let touchStartY = 0;

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
        dot.setAttribute("aria-pressed", String(isActive));
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
    heroCarousel.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      stopAutoplay();
    }, { passive: true });
    heroCarousel.addEventListener("touchend", (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) nextSlide();
        else previousSlide();
      }

      restartAutoplay();
    }, { passive: true });

    if (typeof reduceMotion.addEventListener === "function") {
      reduceMotion.addEventListener("change", restartAutoplay);
    } else {
      reduceMotion.addListener(restartAutoplay);
    }

    showSlide(activeIndex);
    startAutoplay();
  }
}

const galleryButtons = document.querySelectorAll(".gallery-item");
if (galleryButtons.length) {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Photo agrandie");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Fermer la photo");
  closeButton.textContent = "×";

  const lightboxImage = document.createElement("img");
  lightboxImage.alt = "";

  lightbox.append(closeButton, lightboxImage);
  document.body.appendChild(lightbox);

  let activeLightboxTrigger;

  const closeLightbox = ({ restoreFocus = true } = {}) => {
    if (!lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    body.classList.remove("is-lightbox-open");
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
    if (restoreFocus && activeLightboxTrigger) activeLightboxTrigger.focus();
    activeLightboxTrigger = undefined;
  };

  galleryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const image = button.querySelector("img");
      if (!image) return;
      activeLightboxTrigger = button;
      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt;
      lightbox.classList.add("is-open");
      body.classList.add("is-lightbox-open");
      closeButton.focus();
    });
  });

  closeButton.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeLightbox();
    }

    if (event.key === "Tab") {
      event.preventDefault();
      closeButton.focus();
    }
  });
}
