const body = document.body;
body.classList.add("js-enabled");

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

const getFocusable = (root) => Array.from(root.querySelectorAll(focusableSelector))
  .filter((element) => element.offsetParent !== null || element === document.activeElement);

const trapFocus = (event, container) => {
  if (event.key !== "Tab") return;

  const focusable = getFocusable(container);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!container.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  const desktopNavQuery = window.matchMedia("(min-width: 921px)");
  const firstMenuLink = siteNav.querySelector("a");

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!siteNav.classList.contains("is-open")) return;
    siteNav.classList.remove("is-open");
    body.classList.remove("is-menu-open");
    navToggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) navToggle.focus();
  };

  const openMenu = () => {
    siteNav.classList.add("is-open");
    body.classList.add("is-menu-open");
    navToggle.setAttribute("aria-expanded", "true");
    if (firstMenuLink) firstMenuLink.focus();
  };

  navToggle.addEventListener("click", () => {
    if (siteNav.classList.contains("is-open")) {
      closeMenu({ restoreFocus: true });
    } else {
      openMenu();
    }
  });

  siteNav.addEventListener("click", (event) => {
    if (event.target.matches("a")) closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (
      siteNav.classList.contains("is-open") &&
      !siteNav.contains(event.target) &&
      !navToggle.contains(event.target)
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!siteNav.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeMenu({ restoreFocus: true });
      return;
    }

    trapFocus(event, siteNav);
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

const stickyCta = document.querySelector(".mobile-sticky-cta");
if (stickyCta) {
  const blockers = [
    document.querySelector(".site-footer"),
    document.querySelector(".contact-layout"),
    ...document.querySelectorAll(".cta-band")
  ].filter(Boolean);
  const visibleBlockers = new Set();
  let isBlocked = false;

  const isInViewport = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  };

  const updateStickyCta = () => {
    const hasVisibleBlocker = isBlocked || blockers.some(isInViewport);
    const shouldShow = window.scrollY > 160 && !hasVisibleBlocker;
    stickyCta.classList.toggle("is-visible", shouldShow);
    stickyCta.setAttribute("aria-hidden", String(!shouldShow));
  };

  if ("IntersectionObserver" in window && blockers.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleBlockers.add(entry.target);
        else visibleBlockers.delete(entry.target);
      });
      isBlocked = visibleBlockers.size > 0;
      updateStickyCta();
    }, { rootMargin: "0px", threshold: 0.01 });
    blockers.forEach((element) => observer.observe(element));
  }

  window.addEventListener("scroll", updateStickyCta, { passive: true });
  updateStickyCta();
}

const preloadImage = (src) => {
  if (!src) return;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
};

const largestSrcFromPicture = (container) => {
  const source = container.querySelector("source[type='image/webp']");
  if (source && source.srcset) {
    const candidates = source.srcset.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]);
    const lastCandidate = candidates[candidates.length - 1];
    if (lastCandidate) return new URL(lastCandidate, document.baseURI).href;
  }

  const image = container.querySelector("img");
  return image ? image.src : "";
};

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

    const preloadNextSlide = () => {
      const nextSlide = slides[(activeIndex + 1) % slides.length];
      preloadImage(largestSrcFromPicture(nextSlide));
    };

    function showSlide(index) {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === activeIndex;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });
      updateDots();
      preloadNextSlide();
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
      if (
        autoplayId ||
        reduceMotion.matches ||
        slides.length < 2 ||
        isPointerInside ||
        isFocusInside ||
        document.hidden
      ) return;
      autoplayId = window.setInterval(nextSlide, 5000);
    };

    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    if (slides.length < 2) {
      [previousButton, nextButton, dotsWrapper].forEach((control) => {
        if (control) control.hidden = true;
      });
    } else if (previousButton && nextButton) {
      previousButton.addEventListener("click", () => {
        previousSlide();
        restartAutoplay();
      });
      nextButton.addEventListener("click", () => {
        nextSlide();
        restartAutoplay();
      });
    }

    heroCarousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        previousSlide();
        restartAutoplay();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextSlide();
        restartAutoplay();
      }
    });

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

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    if (typeof reduceMotion.addEventListener === "function") {
      reduceMotion.addEventListener("change", restartAutoplay);
    } else {
      reduceMotion.addListener(restartAutoplay);
    }

    showSlide(activeIndex);
    startAutoplay();
  }
}

const galleryButtons = Array.from(document.querySelectorAll(".gallery-item"));
if (galleryButtons.length) {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Photo agrandie");
  lightbox.setAttribute("aria-hidden", "true");

  const closeButton = document.createElement("button");
  closeButton.className = "lightbox-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Fermer la photo");
  closeButton.textContent = "\u00d7";

  const previousButton = document.createElement("button");
  previousButton.className = "lightbox-nav lightbox-prev";
  previousButton.type = "button";
  previousButton.setAttribute("aria-label", "Afficher la photo précédente");
  previousButton.textContent = "\u2039";

  const nextButton = document.createElement("button");
  nextButton.className = "lightbox-nav lightbox-next";
  nextButton.type = "button";
  nextButton.setAttribute("aria-label", "Afficher la photo suivante");
  nextButton.textContent = "\u203a";

  const frame = document.createElement("div");
  frame.className = "lightbox-frame";

  const lightboxImage = document.createElement("img");
  lightboxImage.alt = "";

  const counter = document.createElement("p");
  counter.className = "lightbox-counter";
  counter.setAttribute("aria-live", "polite");

  frame.append(lightboxImage, counter);
  lightbox.append(closeButton, previousButton, frame, nextButton);
  document.body.appendChild(lightbox);

  const images = galleryButtons.map((button) => {
    const image = button.querySelector("img");
    return {
      alt: image ? image.alt : "",
      button,
      src: largestSrcFromPicture(button)
    };
  });

  let activeLightboxTrigger;
  let activeIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  const preloadLightboxNeighbors = () => {
    if (images.length < 2) return;
    preloadImage(images[(activeIndex + 1) % images.length].src);
    preloadImage(images[(activeIndex - 1 + images.length) % images.length].src);
  };

  const updateLightbox = () => {
    const image = images[activeIndex];
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    counter.textContent = `${activeIndex + 1} / ${images.length}`;
    preloadLightboxNeighbors();
  };

  const openLightbox = (index, trigger) => {
    activeIndex = index;
    activeLightboxTrigger = trigger;
    updateLightbox();
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    body.classList.add("is-lightbox-open");

    const hasSeveralImages = images.length > 1;
    previousButton.hidden = !hasSeveralImages;
    nextButton.hidden = !hasSeveralImages;
    closeButton.focus();
  };

  const closeLightbox = ({ restoreFocus = true } = {}) => {
    if (!lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    body.classList.remove("is-lightbox-open");
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
    if (restoreFocus && activeLightboxTrigger) activeLightboxTrigger.focus();
    activeLightboxTrigger = undefined;
  };

  const showLightboxImage = (index) => {
    activeIndex = (index + images.length) % images.length;
    updateLightbox();
  };

  galleryButtons.forEach((button, index) => {
    button.addEventListener("click", () => openLightbox(index, button));
  });

  closeButton.addEventListener("click", closeLightbox);
  previousButton.addEventListener("click", () => showLightboxImage(activeIndex - 1));
  nextButton.addEventListener("click", () => showLightboxImage(activeIndex + 1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  lightbox.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  lightbox.addEventListener("touchend", (event) => {
    if (images.length < 2) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) showLightboxImage(activeIndex + 1);
      else showLightboxImage(activeIndex - 1);
    }
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeLightbox();
      return;
    }

    if (event.key === "ArrowLeft" && images.length > 1) {
      event.preventDefault();
      showLightboxImage(activeIndex - 1);
      return;
    }

    if (event.key === "ArrowRight" && images.length > 1) {
      event.preventDefault();
      showLightboxImage(activeIndex + 1);
      return;
    }

    trapFocus(event, lightbox);
  });
}
