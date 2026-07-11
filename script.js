const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const searchToggle = document.querySelector("[data-search-toggle]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const headerSearch = document.querySelector("[data-header-search]");
const searchForm = document.querySelector("[data-search-form]");
const searchInput = document.querySelector("[data-search-input]");
const searchResults = document.querySelector("[data-search-results]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const shouldStartAtTop = !window.location.hash;

if (shouldStartAtTop) {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  window.scrollTo(0, 0);
  window.addEventListener(
    "pageshow",
    () => {
      if (!window.location.hash) window.scrollTo(0, 0);
    },
    { once: true }
  );
}

document.documentElement.classList.add("reveal-ready");

const touchPointer = window.matchMedia("(pointer: coarse)").matches;
const woodDustConfig = {
  colors: {
    light: ["#e2dcd3", "#d6b98c", "#b96842", "#c88b54", "#8f5a34"],
    dark: ["#f2ece3", "#e2dcd3", "#e5b887", "#d98b59", "#c97b4f"],
  },
  maxParticlesPerMove: 2,
  minTimeBetweenBursts: 34,
  maxParticlesOnScreen: 80,
};

let lastDustTime = 0;
let activeDustParticles = 0;

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const isDarkDustSurface = (target) => {
  let element = target instanceof Element ? target : document.body;

  while (element) {
    const colorValues = getComputedStyle(element).backgroundColor.match(/[\d.]+/g);

    if (colorValues && Number(colorValues[3] ?? 1) > 0.08) {
      const [red, green, blue] = colorValues.slice(0, 3).map((value) => Number(value) / 255);
      const toLinear = (channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      const luminance =
        0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);

      return luminance < 0.18;
    }

    element = element.parentElement;
  }

  return false;
};

const createWoodParticle = (x, y, isDarkSurface) => {
  if (activeDustParticles >= woodDustConfig.maxParticlesOnScreen) return;

  const particle = document.createElement("span");
  const size = randomBetween(3, 8);
  const duration = randomBetween(620, 980);
  const palette = isDarkSurface ? woodDustConfig.colors.dark : woodDustConfig.colors.light;

  particle.className = `wood-particle${isDarkSurface ? " wood-particle--on-dark" : ""}`;
  particle.style.setProperty("--particle-x", `${x + randomBetween(-8, 8)}px`);
  particle.style.setProperty("--particle-y", `${y + randomBetween(-8, 8)}px`);
  particle.style.setProperty("--particle-width", `${size * randomBetween(1.2, 2.2)}px`);
  particle.style.setProperty("--particle-height", `${Math.max(2, size * randomBetween(0.45, 0.8))}px`);
  particle.style.setProperty("--particle-drift-x", `${randomBetween(-22, 22)}px`);
  particle.style.setProperty("--particle-fall", `${randomBetween(26, 58)}px`);
  particle.style.setProperty("--particle-rotation", `${randomBetween(0, 180)}deg`);
  particle.style.setProperty("--particle-spin", `${randomBetween(-150, 150)}deg`);
  particle.style.setProperty("--particle-duration", `${duration}ms`);
  particle.style.setProperty(
    "--particle-opacity",
    `${isDarkSurface ? randomBetween(0.42, 0.72) : randomBetween(0.28, 0.58)}`
  );
  particle.style.setProperty(
    "--particle-color",
    palette[Math.floor(Math.random() * palette.length)]
  );

  activeDustParticles += 1;
  document.body.appendChild(particle);

  particle.addEventListener(
    "animationend",
    () => {
      particle.remove();
      activeDustParticles -= 1;
    },
    { once: true }
  );
};

const handleWoodDust = (event) => {
  const now = performance.now();

  if (now - lastDustTime < woodDustConfig.minTimeBetweenBursts) return;

  lastDustTime = now;
  const isDarkSurface = isDarkDustSurface(event.target);

  for (let index = 0; index < woodDustConfig.maxParticlesPerMove; index += 1) {
    createWoodParticle(event.clientX, event.clientY, isDarkSurface);
  }
};

if (!reducedMotion && !touchPointer) {
  window.addEventListener("pointermove", handleWoodDust, { passive: true });
}

document.querySelectorAll('.footer-back-top, .brand[href="#inicio"]').forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  });
});

const setHeaderState = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
};

if (searchToggle && headerSearch && searchForm && searchInput && searchResults) {
  const normalizeSearchText = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const quickLinks = [...nav.querySelectorAll("a")].map((link) => ({
    label: link.textContent.trim(),
    href: link.getAttribute("href"),
    keywords: normalizeSearchText(link.textContent),
    type: "Navegación",
  }));

  const sectionLinks = [...document.querySelectorAll("main section")]
    .map((section, index) => {
      const heading = section.querySelector("h1, h2, h3");
      if (!heading) return null;

      if (!section.id && !heading.id) section.id = `seccion-${index + 1}`;
      const label = (heading.innerText || heading.textContent).replace(/\s+/g, " ").trim();

      return {
        label,
        href: section.id ? `#${section.id}` : `#${heading.id}`,
        keywords: normalizeSearchText(`${label} ${section.innerText || section.textContent}`),
        type: "En esta página",
      };
    })
    .filter(Boolean);

  const searchIndex = [...quickLinks, ...sectionLinks].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.href === item.href && candidate.label === item.label) === index
  );
  let closeSearchTimer = null;

  const closeSearch = (returnFocus = false) => {
    headerSearch.classList.remove("is-open");
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-label", "Abrir buscador");

    const finishClose = () => {
      headerSearch.hidden = true;
      if (returnFocus) searchToggle.focus();
    };

    if (reducedMotion) finishClose();
    else closeSearchTimer = window.setTimeout(finishClose, 260);
  };

  const renderSearchResults = (query = "") => {
    const normalizedQuery = normalizeSearchText(query);
    searchResults.replaceChildren();

    const renderedResults = normalizedQuery
      ? searchIndex
          .filter((item) => item.keywords.includes(normalizedQuery))
          .sort((a, b) => {
            const aLabel = normalizeSearchText(a.label);
            const bLabel = normalizeSearchText(b.label);
            return Number(!aLabel.startsWith(normalizedQuery)) - Number(!bLabel.startsWith(normalizedQuery));
          })
          .slice(0, 6)
      : quickLinks;

    if (!renderedResults.length) {
      const emptyMessage = document.createElement("p");
      emptyMessage.textContent = "No encontramos coincidencias. Probá con otra palabra.";
      searchResults.appendChild(emptyMessage);
      return;
    }

    renderedResults.forEach((item) => {
      const resultLink = document.createElement("a");
      const resultLabel = document.createElement("span");
      resultLink.className = "search-result";
      resultLink.href = item.href;
      resultLink.setAttribute("data-search-result", "");
      resultLink.setAttribute("aria-label", `${item.label}, ${item.type}`);
      resultLabel.textContent = item.label;
      resultLink.appendChild(resultLabel);
      resultLink.addEventListener("click", () => closeSearch());
      searchResults.appendChild(resultLink);
    });
  };

  const openSearch = () => {
    window.clearTimeout(closeSearchTimer);
    headerSearch.hidden = false;
    searchToggle.setAttribute("aria-expanded", "true");
    searchToggle.setAttribute("aria-label", "Cerrar buscador");
    renderSearchResults(searchInput.value);
    window.requestAnimationFrame(() => headerSearch.classList.add("is-open"));
    window.setTimeout(() => searchInput.focus(), reducedMotion ? 0 : 180);
  };

  searchToggle.addEventListener("click", () => {
    if (searchToggle.getAttribute("aria-expanded") === "true") closeSearch(true);
    else openSearch();
  });

  searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const firstResult = searchResults.querySelector("[data-search-result]");
    if (firstResult) firstResult.click();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchToggle.getAttribute("aria-expanded") === "true") {
      closeSearch(true);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      searchToggle.getAttribute("aria-expanded") === "true" &&
      !header.contains(event.target)
    ) {
      closeSearch();
    }
  });
}

if (menuToggle && nav) {
  const closeMenu = (returnFocus = false) => {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    if (returnFocus) menuToggle.focus();
  };

  const openMenu = () => {
    nav.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Cerrar menú");
  };

  menuToggle.addEventListener("click", () => {
    if (menuToggle.getAttribute("aria-expanded") === "true") closeMenu(true);
    else openMenu();
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      closeMenu(true);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      menuToggle.getAttribute("aria-expanded") === "true" &&
      !header.contains(event.target)
    ) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) closeMenu();
  });
}

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

const courseCarousel = document.querySelector("[data-course-carousel]");
const coursePagination = document.querySelector("[data-course-pagination]");
const valuesCarousel = document.querySelector("[data-values-carousel]");
const valuesPagination = document.querySelector("[data-values-pagination]");
const homePopupTrigger = document.querySelector("[data-home-popup-trigger]");
const homePopup = document.querySelector("[data-home-popup]");
const homePopupClose = document.querySelector("[data-home-popup-close]");
const homePopupLater = document.querySelector("[data-home-popup-later]");
const homePopupForm = document.querySelector("[data-home-popup-form]");
const materialCarousel = document.querySelector(".material-library-board");

if (homePopup && homePopupTrigger && homePopupClose && homePopupLater && homePopupForm) {
  let homePopupShown = false;
  let homePopupTimer = null;

  const clearHomePopupTimer = () => {
    window.clearTimeout(homePopupTimer);
    homePopupTimer = null;
  };

  const closeHomePopup = () => {
    clearHomePopupTimer();
    homePopup.classList.remove("is-open");
    homePopup.setAttribute("aria-hidden", "true");
    document.body.classList.remove("home-popup-open");
  };

  const openHomePopup = () => {
    if (homePopupShown) return;

    homePopupShown = true;
    homePopup.classList.add("is-open");
    homePopup.setAttribute("aria-hidden", "false");
    document.body.classList.add("home-popup-open");
  };

  const scheduleHomePopup = () => {
    if (homePopupShown || homePopupTimer) return;

    homePopupTimer = window.setTimeout(() => {
      homePopupTimer = null;
      openHomePopup();
    }, 1000);
  };

  homePopupClose.addEventListener("click", closeHomePopup);
  homePopupLater.addEventListener("click", closeHomePopup);
  homePopupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    closeHomePopup();
  });

  homePopup.addEventListener("click", (event) => {
    if (event.target === homePopup) closeHomePopup();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && homePopup.classList.contains("is-open")) {
      closeHomePopup();
    }
  });

  if ("IntersectionObserver" in window) {
    const homePopupObserver = new IntersectionObserver(
      ([entry], observer) => {
        if (homePopupShown) {
          observer.disconnect();
          return;
        }

        if (entry.isIntersecting) {
          scheduleHomePopup();
        } else {
          clearHomePopupTimer();
        }
      },
      { rootMargin: "-18% 0px -28%", threshold: 0.2 }
    );

    homePopupObserver.observe(homePopupTrigger);
  } else {
    const showHomePopupOnScroll = () => {
      const rect = homePopupTrigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      if (rect.top < viewportHeight * 0.74 && rect.bottom > viewportHeight * 0.18) {
        scheduleHomePopup();
        window.removeEventListener("scroll", showHomePopupOnScroll);
      }
    };

    window.addEventListener("scroll", showHomePopupOnScroll, { passive: true });
    showHomePopupOnScroll();
  }
}

if (courseCarousel && coursePagination) {
  const courseCards = [...courseCarousel.querySelectorAll(".course-card")];
  const courseDots = [...coursePagination.querySelectorAll("button")];
  let courseScrollFrame = null;

  const setActiveCourse = (activeIndex) => {
    courseDots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", String(isActive));
    });
  };

  const updateActiveCourse = () => {
    const carouselCenter = courseCarousel.scrollLeft + courseCarousel.clientWidth / 2;
    const closestIndex = courseCards.reduce((bestIndex, card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const bestCard = courseCards[bestIndex];
      const bestCenter = bestCard.offsetLeft + bestCard.offsetWidth / 2;
      return Math.abs(cardCenter - carouselCenter) < Math.abs(bestCenter - carouselCenter)
        ? index
        : bestIndex;
    }, 0);

    setActiveCourse(closestIndex);
  };

  courseDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const card = courseCards[index];
      const targetLeft = card.offsetLeft - (courseCarousel.clientWidth - card.offsetWidth) / 2;
      courseCarousel.scrollTo({
        left: targetLeft,
        behavior: reducedMotion ? "auto" : "smooth",
      });
      setActiveCourse(index);
    });
  });

  courseCarousel.addEventListener(
    "scroll",
    () => {
      window.cancelAnimationFrame(courseScrollFrame);
      courseScrollFrame = window.requestAnimationFrame(updateActiveCourse);
    },
    { passive: true }
  );

  window.addEventListener("resize", updateActiveCourse);
  updateActiveCourse();
}

if (materialCarousel && !reducedMotion) {
  const materialMobileQuery = window.matchMedia("(max-width: 760px)");
  const originalMaterials = [...materialCarousel.querySelectorAll(".material-item")];
  const materialSpeed = 50;
  let materialFrame = null;
  let previousMaterialTime = 0;
  let materialCycleWidth = 0;
  let materialVisible = false;
  let materialInteracting = false;
  let materialResumeTimer = null;

  const buildMaterialLoop = () => {
    if (materialCarousel.querySelector("[data-material-clone]")) return;

    originalMaterials.forEach((material) => {
      const clone = material.cloneNode(true);
      clone.dataset.materialClone = "";
      clone.setAttribute("aria-hidden", "true");
      clone.removeAttribute("tabindex");
      clone.classList.remove(
        "reveal-text",
        "reveal-delay-1",
        "reveal-delay-2",
        "reveal-delay-3",
        "is-visible"
      );
      materialCarousel.append(clone);
    });
  };

  const measureMaterialLoop = () => {
    const firstClone = materialCarousel.querySelector("[data-material-clone]");
    if (!firstClone || !originalMaterials[0]) return;
    materialCycleWidth = firstClone.offsetLeft - originalMaterials[0].offsetLeft;
  };

  const stopMaterialAutoplay = () => {
    if (materialFrame) window.cancelAnimationFrame(materialFrame);
    materialFrame = null;
    previousMaterialTime = 0;
  };

  const runMaterialAutoplay = (time) => {
    if (!materialMobileQuery.matches || !materialVisible || materialInteracting) {
      stopMaterialAutoplay();
      return;
    }

    if (previousMaterialTime && materialCycleWidth) {
      const elapsed = Math.min(time - previousMaterialTime, 32);
      materialCarousel.scrollLeft += (materialSpeed * elapsed) / 1000;

      if (materialCarousel.scrollLeft >= materialCycleWidth) {
        materialCarousel.scrollLeft -= materialCycleWidth;
      }
    }

    previousMaterialTime = time;
    materialFrame = window.requestAnimationFrame(runMaterialAutoplay);
  };

  const startMaterialAutoplay = () => {
    if (
      materialFrame ||
      !materialMobileQuery.matches ||
      !materialVisible ||
      materialInteracting
    ) {
      return;
    }

    materialFrame = window.requestAnimationFrame(runMaterialAutoplay);
  };

  const pauseMaterialAutoplay = () => {
    window.clearTimeout(materialResumeTimer);
    materialInteracting = true;
    stopMaterialAutoplay();
  };

  const resumeMaterialAutoplay = () => {
    window.clearTimeout(materialResumeTimer);
    materialResumeTimer = window.setTimeout(() => {
      materialInteracting = false;
      startMaterialAutoplay();
    }, 700);
  };

  buildMaterialLoop();
  measureMaterialLoop();
  materialCarousel.classList.add("is-auto-scrolling");

  materialCarousel.addEventListener("pointerdown", pauseMaterialAutoplay);
  materialCarousel.addEventListener("pointerup", resumeMaterialAutoplay);
  materialCarousel.addEventListener("pointercancel", resumeMaterialAutoplay);

  const materialObserver = new IntersectionObserver(
    ([entry]) => {
      materialVisible = entry.isIntersecting;
      if (materialVisible) startMaterialAutoplay();
      else stopMaterialAutoplay();
    },
    { threshold: 0.15 }
  );

  materialObserver.observe(materialCarousel);

  window.addEventListener("resize", () => {
    measureMaterialLoop();
    if (!materialMobileQuery.matches) {
      stopMaterialAutoplay();
      materialCarousel.scrollLeft = 0;
      return;
    }
    startMaterialAutoplay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopMaterialAutoplay();
    else startMaterialAutoplay();
  });
}

if (valuesCarousel && valuesPagination) {
  const valueCards = [...valuesCarousel.querySelectorAll("article")];
  const valueDots = [...valuesPagination.querySelectorAll("button")];
  const valuesMobileQuery = window.matchMedia("(max-width: 760px)");
  const autoplayDelay = 3600;
  let activeValueIndex = 0;
  let valuesScrollFrame = null;
  let autoplayTimer = null;
  let valuesCarouselVisible = !("IntersectionObserver" in window);

  const setActiveValue = (activeIndex) => {
    activeValueIndex = activeIndex;
    valueDots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", String(isActive));
    });
  };

  const scrollToValue = (index, behavior = "smooth") => {
    const card = valueCards[index];
    if (!card) return;

    const targetLeft = card.offsetLeft - (valuesCarousel.clientWidth - card.offsetWidth) / 2;
    valuesCarousel.scrollTo({
      left: targetLeft,
      behavior: reducedMotion ? "auto" : behavior,
    });
    setActiveValue(index);
  };

  const stopValuesAutoplay = () => {
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  };

  const startValuesAutoplay = () => {
    stopValuesAutoplay();
    if (
      !valuesMobileQuery.matches ||
      !valuesCarouselVisible ||
      reducedMotion ||
      document.hidden
    ) return;

    autoplayTimer = window.setInterval(() => {
      scrollToValue((activeValueIndex + 1) % valueCards.length);
    }, autoplayDelay);
  };

  const updateActiveValue = () => {
    const carouselCenter = valuesCarousel.scrollLeft + valuesCarousel.clientWidth / 2;
    const closestIndex = valueCards.reduce((bestIndex, card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const bestCard = valueCards[bestIndex];
      const bestCenter = bestCard.offsetLeft + bestCard.offsetWidth / 2;
      return Math.abs(cardCenter - carouselCenter) < Math.abs(bestCenter - carouselCenter)
        ? index
        : bestIndex;
    }, 0);

    setActiveValue(closestIndex);
  };

  valueDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      scrollToValue(index);
      startValuesAutoplay();
    });
  });

  valuesCarousel.addEventListener(
    "scroll",
    () => {
      window.cancelAnimationFrame(valuesScrollFrame);
      valuesScrollFrame = window.requestAnimationFrame(updateActiveValue);
    },
    { passive: true }
  );
  valuesCarousel.addEventListener("pointerdown", stopValuesAutoplay);
  valuesCarousel.addEventListener("pointerup", startValuesAutoplay);
  valuesCarousel.addEventListener("pointercancel", startValuesAutoplay);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopValuesAutoplay();
    else startValuesAutoplay();
  });

  if ("IntersectionObserver" in window) {
    const valuesVisibilityObserver = new IntersectionObserver(
      ([entry]) => {
        valuesCarouselVisible = entry.isIntersecting;
        if (valuesCarouselVisible) startValuesAutoplay();
        else stopValuesAutoplay();
      },
      { threshold: 0.35 }
    );

    valuesVisibilityObserver.observe(valuesCarousel);
  }

  window.addEventListener("resize", () => {
    if (!valuesMobileQuery.matches) {
      stopValuesAutoplay();
      valuesCarousel.scrollTo({ left: 0, behavior: "auto" });
      setActiveValue(0);
      return;
    }

    scrollToValue(activeValueIndex, "auto");
    startValuesAutoplay();
  });

  setActiveValue(0);
  startValuesAutoplay();
}

const revealImages = document.querySelectorAll(".reveal-image");
const collage = document.querySelector(".collage");
const mobileCollageQuery = window.matchMedia("(max-width: 760px)");
const collageNotePairs = [...document.querySelectorAll("[data-collage-note]")]
  .map((note) => ({
    note,
    tile: collage?.querySelector(`[data-collage-item="${note.dataset.collageNote}"]`),
    fallbackAnchorY: Number(note.dataset.anchorY) || 0,
  }))
  .filter(({ tile }) => tile);
const restorationSlider = document.querySelector("[data-restoration-slider]");
const restorationSteps = document.querySelectorAll("[data-restoration-step]");
const restorationViewport = restorationSlider?.querySelector(".restoration-viewport");
const restorationProgressItems = document.querySelectorAll("[data-restoration-progress] li");
const learningPath = document.querySelector("[data-learning-path]");
const learningPathCards = learningPath?.querySelectorAll(".learning-card") ?? [];
const learningCardsTrack = learningPath?.querySelector(".learning-cards");
const learningPagination = learningPath?.querySelector("[data-learning-pagination]");
const learningDots = learningPagination ? [...learningPagination.querySelectorAll(".learning-dot")] : [];
const learningStatus = learningPath?.querySelector("[data-learning-status]");
const learningPathHorizontalQuery = window.matchMedia("(max-width: 760px)");

if (collage && collageNotePairs.length) {
  collage.classList.add("has-aligned-notes");
}

if (learningPath && learningPathCards.length && !reducedMotion && !learningPathHorizontalQuery.matches) {
  learningPath.classList.add("is-scroll-ready");
}

if (learningCardsTrack && learningPathCards.length && learningDots.length) {
  let learningScrollFrame = null;

  const setActiveLearningCard = (activeIndex) => {
    learningDots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", String(isActive));
    });

    if (learningStatus) {
      learningStatus.textContent = `Etapa ${activeIndex + 1} de ${learningPathCards.length}`;
    }
  };

  const updateActiveLearningCard = () => {
    const trackCenter = learningCardsTrack.scrollLeft + learningCardsTrack.clientWidth / 2;
    const activeIndex = [...learningPathCards].reduce((bestIndex, card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const bestCard = learningPathCards[bestIndex];
      const bestCenter = bestCard.offsetLeft + bestCard.offsetWidth / 2;
      return Math.abs(cardCenter - trackCenter) < Math.abs(bestCenter - trackCenter) ? index : bestIndex;
    }, 0);

    setActiveLearningCard(activeIndex);
  };

  learningDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const card = learningPathCards[index];
      if (!card) return;

      const targetLeft = card.offsetLeft - (learningCardsTrack.clientWidth - card.offsetWidth) / 2;
      learningCardsTrack.scrollTo({
        left: targetLeft,
        behavior: reducedMotion ? "auto" : "smooth",
      });
      setActiveLearningCard(index);
    });
  });

  learningCardsTrack.addEventListener(
    "scroll",
    () => {
      window.cancelAnimationFrame(learningScrollFrame);
      learningScrollFrame = window.requestAnimationFrame(updateActiveLearningCard);
    },
    { passive: true },
  );

  window.addEventListener("resize", updateActiveLearningCard);
  updateActiveLearningCard();
}

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const smoothstep = (value) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};
let ticking = false;

const updateRestorationParallax = () => {
  if (!restorationSlider || !restorationSteps.length) return;

  const viewportHeight = window.innerHeight;
  const headerOffset = header.offsetHeight;
  const sliderRect = restorationSlider.getBoundingClientRect();
  const scrollDistance = Math.max(restorationSlider.offsetHeight - viewportHeight, 1);
  const sliderProgress = clamp((headerOffset - sliderRect.top) / scrollDistance);
  const entryProgress = smoothstep(
    clamp((viewportHeight - sliderRect.top) / Math.max(viewportHeight - headerOffset, 1)),
  );
  let slidePosition = 0;

  if (sliderProgress < 0.18) {
    slidePosition = 0;
  } else if (sliderProgress < 0.42) {
    slidePosition = smoothstep((sliderProgress - 0.18) / 0.24);
  } else if (sliderProgress < 0.58) {
    slidePosition = 1;
  } else if (sliderProgress < 0.82) {
    slidePosition = 1 + smoothstep((sliderProgress - 0.58) / 0.24);
  } else {
    slidePosition = 2;
  }

  const currentIndex = Math.round(slidePosition);

  restorationViewport.classList.toggle("is-final-step", currentIndex === restorationSteps.length - 1);
  restorationViewport.style.setProperty("--rail-y", `${slidePosition * 63}px`);
  restorationViewport.style.setProperty("--rail-x", `${slidePosition * 42}px`);

  restorationSteps.forEach((step, index) => {
    const slideOffset = reducedMotion ? index - currentIndex : index - slidePosition;

    step.style.zIndex = String(index + 1);
    step.style.visibility = Math.abs(slideOffset) >= 0.999 ? "hidden" : "visible";
    step.classList.toggle("is-current", index === currentIndex);
    step.setAttribute("aria-hidden", String(index !== currentIndex));
    step.querySelectorAll("a").forEach((link) => {
      link.tabIndex = index === currentIndex ? 0 : -1;
    });

    step.querySelectorAll("[data-depth]").forEach((layer) => {
      const depth = Number(layer.dataset.depth);
      const transitionDistance = Math.min(Math.abs(slideOffset), 1);
      const parallaxStrength = Math.sin(transitionDistance * Math.PI);
      const layerSpeed = 1.05 + depth * 3 * parallaxStrength;
      const entryOffset =
        index === 0 && !reducedMotion
          ? (1 - entryProgress) * viewportHeight * 0.18 * (1 + depth * 3)
          : 0;
      const layerOffset = slideOffset * viewportHeight * layerSpeed + entryOffset;
      layer.style.setProperty("--parallax-y", `${layerOffset}px`);
    });
  });

restorationProgressItems.forEach((item, index) => {
    const isCurrent = index === currentIndex;
    item.classList.toggle("is-active", isCurrent);

    if (isCurrent) {
      item.setAttribute("aria-current", "step");
    } else {
      item.removeAttribute("aria-current");
    }
  });
};

const capsule = document.querySelector(".capsule");
const capsulePhotos = capsule?.querySelectorAll(".capsule-photo") ?? [];
const capsulePreview = document.querySelector("[data-capsule-preview]");
const capsulePreviewImage = document.querySelector("[data-capsule-preview-image]");
const capsulePreviewTitle = document.querySelector("[data-capsule-preview-title]");
const capsulePreviewDescription = document.querySelector("[data-capsule-preview-description]");
const capsulePreviewOrigin = document.querySelector("[data-capsule-preview-origin]");
const capsulePreviewMaterial = document.querySelector("[data-capsule-preview-material]");
const capsulePreviewIntervention = document.querySelector("[data-capsule-preview-intervention]");
const capsuleClose = document.querySelector("[data-capsule-close]");
const capsuleMaterialLink = document.querySelector("[data-capsule-materials]");
const capsulePreviewDialog = document.querySelector("[data-capsule-dialog]");
const capsuleMobile = document.querySelector("[data-capsule-mobile]");
const capsuleMobileCarousel = document.querySelector("[data-capsule-carousel]");
const capsuleMobileViewport = document.querySelector("[data-capsule-viewport]");
const capsuleMobileTrack = document.querySelector("[data-capsule-track]");
const capsuleMobilePrev = document.querySelector("[data-capsule-prev]");
const capsuleMobileNext = document.querySelector("[data-capsule-next]");
const capsuleMobileAutoplay = document.querySelector("[data-capsule-autoplay]");
const capsuleMobileAutoplayIcon = document.querySelector("[data-capsule-autoplay-icon]");
const capsuleMobileCounter = document.querySelector("[data-capsule-counter]");
const capsuleMobileProgress = document.querySelector("[data-capsule-progress]");
const capsuleMobileName = document.querySelector("[data-capsule-mobile-name]");
const capsuleMobileDetail = document.querySelector("[data-capsule-detail]");
const capsuleMobileStatus = document.querySelector("[data-capsule-status]");
const capsuleMobileQuery = window.matchMedia("(max-width: 768px)");
let lastCapsuleTrigger = null;
let stopCapsuleMobileAutoplay = () => {};
let resumeCapsuleMobileAutoplay = () => {};

const capsulePieces = [
  {
    title: "Trama envolvente",
    description: "Una pieza liviana que explora el encuentro entre superficies tensadas y curvas continuas.",
    origin: "Estructura recuperada / Respaldo flexible",
    material: "Madera laminada / Textil técnico",
    intervention: "Curvado / Retapizado / Terminación mate",
  },
  {
    title: "Sillón cóncavo",
    description: "Pieza ensamblada a partir de fragmentos recuperados, con respaldo curvo y estructura restaurada.",
    origin: "Respaldo recuperado / Estructura de nogal",
    material: "Madera maciza / Textil recuperado",
    intervention: "Reensamble / Reparación / Terminación mate",
  },
  {
    title: "Arco ligero",
    description: "Una silueta de madera clara donde la continuidad formal define una presencia serena.",
    origin: "Silla de comedor / Década del 70",
    material: "Haya maciza / Fibras naturales",
    intervention: "Lijado fino / Curvado / Encerado",
  },
  {
    title: "Unión serena",
    description: "Detalle de apoyo reconstruido para conservar la proporción y el gesto original de la pieza.",
    origin: "Fragmento de respaldo / Autor desconocido",
    material: "Roble claro / Esterilla",
    intervention: "Injerto / Encastre / Protección natural",
  },
  {
    title: "Volumen terracota",
    description: "Un volumen bajo y envolvente renovado desde el color, la textura y el confort cotidiano.",
    origin: "Sillón modular / Producción nacional",
    material: "Espuma recuperada / Bouclé terracota",
    intervention: "Refuerzo / Retapizado / Reconfiguración",
  },
  {
    title: "Curva verde",
    description: "La estructura original vuelve a tomar protagonismo mediante un asiento de tono profundo.",
    origin: "Butaca nórdica / Mediados de siglo",
    material: "Nogal / Paño de lana",
    intervention: "Encolado / Tapicería / Aceitado",
  },
  {
    title: "Respaldo tallado",
    description: "Una geometría expresiva restaurada para recuperar su equilibrio sin borrar las marcas del tiempo.",
    origin: "Silla artesanal / Taller rioplatense",
    material: "Madera maciza / Fibra tejida",
    intervention: "Consolidación / Limpieza / Reintegración",
  },
  {
    title: "Oficio abierto",
    description: "El proceso queda visible como parte del diseño y revela la lógica constructiva de la pieza.",
    origin: "Estructura incompleta / Pieza de archivo",
    material: "Fresno / Cinchas de algodón",
    intervention: "Reensamble / Tensado / Acabado al aceite",
  },
  {
    title: "Perfil nocturno",
    description: "Una lectura íntima del respaldo, donde sombra, veta y proporción construyen el carácter.",
    origin: "Butaca de lectura / Serie limitada",
    material: "Nogal oscuro / Cuero vegetal",
    intervention: "Pulido / Nutrición / Protección mate",
  },
  {
    title: "Nube de roble",
    description: "Un asiento de líneas suaves que combina una base sólida con una superficie táctil y luminosa.",
    origin: "Sillón individual / Estructura recuperada",
    material: "Roble / Bouclé crudo",
    intervention: "Refuerzo / Modelado / Retapizado",
  },
  {
    title: "Ensamble visible",
    description: "La unión entre planos se conserva a la vista como testimonio del sistema constructivo original.",
    origin: "Banco bajo / Carpintería tradicional",
    material: "Petiribí / Lino encerado",
    intervention: "Ajuste / Injerto / Sellado",
  },
  {
    title: "Pliegue carmín",
    description: "Color y textura transforman una pieza compacta en un acento contemporáneo de fuerte presencia.",
    origin: "Módulo tapizado / Década del 80",
    material: "Madera multilaminada / Chenille",
    intervention: "Reparación / Retapizado / Ajuste formal",
  },
  {
    title: "Butaca umbral",
    description: "Una forma escultórica recuperada para habitar el límite entre mobiliario y objeto.",
    origin: "Prototipo de butaca / Colección privada",
    material: "Madera torneada / Tejido de lana",
    intervention: "Consolidación / Revestimiento / Acabado mate",
  },
  {
    title: "Línea suave",
    description: "La mínima intervención devuelve estabilidad y realza la continuidad del respaldo original.",
    origin: "Silla auxiliar / Diseño anónimo",
    material: "Guatambú / Tapizado natural",
    intervention: "Encolado / Limpieza / Retapizado",
  },
  {
    title: "Nudo suspendido",
    description: "Una pieza compacta donde el encuentro entre planos genera una silueta precisa y silenciosa.",
    origin: "Apoyabrazos recuperado / Pieza única",
    material: "Nogal / Textil de alto tránsito",
    intervention: "Reensamble / Calibrado / Protección",
  },
];

const resetCapsuleDepth = () => {
  capsulePhotos.forEach((photo) => {
    photo.style.setProperty("--mag-x", "0px");
    photo.style.setProperty("--mag-y", "0px");
    photo.style.setProperty("--mag-z", "0px");
    photo.style.setProperty("--mag-rx", "0deg");
    photo.style.setProperty("--mag-ry", "0deg");
  });
};

const openCapsulePreview = (trigger, index, providedImage = null) => {
  const image = providedImage ?? trigger.querySelector("img");
  const piece = capsulePieces[index] ?? capsulePieces[0];

  lastCapsuleTrigger = trigger;
  capsulePreviewImage.src = image.currentSrc || image.src;
  capsulePreviewImage.alt = image.alt;
  capsulePreviewTitle.textContent = piece.title;
  capsulePreviewDescription.textContent = piece.description;
  capsulePreviewOrigin.textContent = piece.origin;
  capsulePreviewMaterial.textContent = piece.material;
  capsulePreviewIntervention.textContent = piece.intervention;
  capsule.classList.add("is-previewing");
  capsulePreview.classList.add("is-open");
  capsulePreview.setAttribute("aria-hidden", "false");
  document.body.classList.add("capsule-modal-open");
  stopCapsuleMobileAutoplay();

  if (capsuleMobileQuery.matches) {
    requestAnimationFrame(() => capsulePreviewDialog.focus());
  } else {
    capsuleClose.focus();
  }
};

const closeCapsulePreview = () => {
  capsule.classList.remove("is-previewing");
  capsulePreview.classList.remove("is-open");
  capsulePreview.setAttribute("aria-hidden", "true");
  document.body.classList.remove("capsule-modal-open");
  lastCapsuleTrigger?.focus();
  resumeCapsuleMobileAutoplay();
};

if (
  capsuleMobile &&
  capsuleMobileCarousel &&
  capsuleMobileViewport &&
  capsuleMobileTrack &&
  capsulePhotos.length
) {
  const AUTOPLAY_DELAY = 3000;
  const INTERACTION_PAUSE = 3000;
  const capsuleImages = [...capsulePhotos].map((photo) => {
    const image = photo.querySelector("img");
    return {
      src: image.getAttribute("src"),
      alt: image.alt,
      element: image,
    };
  });
  const totalCapsulePieces = capsuleImages.length;
  let capsuleMobileIndex = 0;
  let capsuleTrackIndex = 1;
  let autoplayTimer = 0;
  let autoplayResumeTimer = 0;
  let activePointerId = null;
  let pointerStartX = 0;
  let pointerDeltaX = 0;
  let suppressCapsuleClick = false;
  let capsuleSectionVisible = !("IntersectionObserver" in window);
  let capsuleAutoplayPausedByUser = false;

  const createCapsuleSlide = (pieceIndex, isClone = false) => {
    const piece = capsulePieces[pieceIndex] ?? capsulePieces[0];
    const imageData = capsuleImages[pieceIndex];
    const slide = document.createElement("figure");
    const button = document.createElement("button");
    const image = document.createElement("img");

    slide.className = "capsule-mobile-slide";
    slide.dataset.capsuleSlideIndex = String(pieceIndex);
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "diapositiva");
    slide.setAttribute("aria-label", `${pieceIndex + 1} de ${totalCapsulePieces}`);

    button.type = "button";
    button.setAttribute("aria-label", `Ver detalle de ${piece.title}`);
    button.tabIndex = -1;

    image.src = imageData.src;
    image.alt = imageData.alt;
    image.decoding = "async";
    image.loading = pieceIndex === 0 && !isClone ? "eager" : "lazy";
    image.draggable = false;

    if (isClone) {
      slide.dataset.capsuleClone = "true";
      slide.setAttribute("aria-hidden", "true");
    }

    button.append(image);
    slide.append(button);

    button.addEventListener("click", (event) => {
      if (suppressCapsuleClick) {
        event.preventDefault();
        return;
      }
      openCapsulePreview(button, pieceIndex, image);
    });

    return slide;
  };

  const slideOrder = [
    { index: totalCapsulePieces - 1, clone: true },
    ...capsuleImages.map((_, index) => ({ index, clone: false })),
    { index: 0, clone: true },
  ];

  slideOrder.forEach(({ index, clone }) => {
    capsuleMobileTrack.append(createCapsuleSlide(index, clone));
  });

  const capsuleMobileSlides = [...capsuleMobileTrack.querySelectorAll(".capsule-mobile-slide")];
  const capsuleOriginalSlides = capsuleMobileSlides.filter((slide) => !slide.dataset.capsuleClone);

  const setCapsuleTrackPosition = (animate = true) => {
    capsuleMobileTrack.classList.toggle("is-jumping", !animate);
    capsuleMobileTrack.style.transform = `translate3d(${-capsuleTrackIndex * 100}%, 0, 0)`;

    if (!animate) {
      requestAnimationFrame(() => capsuleMobileTrack.classList.remove("is-jumping"));
    }
  };

  const resetCapsuleProgress = (run = false) => {
    capsuleMobileProgress?.classList.remove("is-running");
    if (!run || reducedMotion || !capsuleMobileQuery.matches || document.hidden) return;

    void capsuleMobileProgress.offsetWidth;
    requestAnimationFrame(() => capsuleMobileProgress.classList.add("is-running"));
  };

  const updateCapsuleMobileUI = (announce = false) => {
    const piece = capsulePieces[capsuleMobileIndex] ?? capsulePieces[0];

    capsuleMobileCounter.textContent =
      `${String(capsuleMobileIndex + 1).padStart(2, "0")} / ${String(totalCapsulePieces).padStart(2, "0")}`;
    capsuleMobileName.textContent = piece.title;

    capsuleMobileSlides.forEach((slide) => {
      const isCurrent =
        !slide.dataset.capsuleClone && Number(slide.dataset.capsuleSlideIndex) === capsuleMobileIndex;
      slide.classList.toggle("is-current", isCurrent);
      const button = slide.querySelector("button");
      button.tabIndex = isCurrent ? 0 : -1;
    });

    if (announce && capsuleMobileStatus) {
      capsuleMobileStatus.textContent = `${piece.title}. Pieza ${capsuleMobileIndex + 1} de ${totalCapsulePieces}.`;
    }
  };

  const normalizeCapsuleIndex = (index) =>
    (index + totalCapsulePieces) % totalCapsulePieces;

  const moveCapsuleMobile = (direction, announce = false) => {
    capsuleTrackIndex += direction;
    capsuleMobileIndex = normalizeCapsuleIndex(capsuleMobileIndex + direction);
    updateCapsuleMobileUI(announce);
    setCapsuleTrackPosition(true);
  };

  const clearCapsuleTimers = () => {
    window.clearTimeout(autoplayTimer);
    window.clearTimeout(autoplayResumeTimer);
    autoplayTimer = 0;
    autoplayResumeTimer = 0;
  };

  const startCapsuleAutoplay = () => {
    clearCapsuleTimers();
    if (
      reducedMotion ||
      capsuleAutoplayPausedByUser ||
      !capsuleMobileQuery.matches ||
      !capsuleSectionVisible ||
      document.hidden ||
      capsulePreview?.classList.contains("is-open")
    ) {
      resetCapsuleProgress(false);
      return;
    }

    resetCapsuleProgress(true);
    autoplayTimer = window.setTimeout(() => {
      moveCapsuleMobile(1, false);
      startCapsuleAutoplay();
    }, AUTOPLAY_DELAY);
  };

  const pauseCapsuleAutoplayForInteraction = () => {
    clearCapsuleTimers();
    resetCapsuleProgress(false);

    if (
      reducedMotion ||
      capsuleAutoplayPausedByUser ||
      !capsuleMobileQuery.matches ||
      !capsuleSectionVisible ||
      document.hidden
    ) return;
    autoplayResumeTimer = window.setTimeout(startCapsuleAutoplay, INTERACTION_PAUSE);
  };

  stopCapsuleMobileAutoplay = () => {
    clearCapsuleTimers();
    resetCapsuleProgress(false);
  };

  resumeCapsuleMobileAutoplay = pauseCapsuleAutoplayForInteraction;

  const useCapsuleControl = (direction) => {
    moveCapsuleMobile(direction, true);
    pauseCapsuleAutoplayForInteraction();
  };

  capsuleMobilePrev?.addEventListener("click", () => useCapsuleControl(-1));
  capsuleMobileNext?.addEventListener("click", () => useCapsuleControl(1));
  capsuleMobileAutoplay?.addEventListener("click", () => {
    capsuleAutoplayPausedByUser = !capsuleAutoplayPausedByUser;
    capsuleMobileAutoplay.setAttribute("aria-pressed", String(capsuleAutoplayPausedByUser));
    capsuleMobileAutoplay.setAttribute(
      "aria-label",
      capsuleAutoplayPausedByUser ? "Reanudar reproducción automática" : "Pausar reproducción automática"
    );
    capsuleMobileAutoplayIcon.textContent = capsuleAutoplayPausedByUser ? "▶" : "Ⅱ";

    if (capsuleAutoplayPausedByUser) {
      stopCapsuleMobileAutoplay();
    } else {
      startCapsuleAutoplay();
    }
  });

  if (reducedMotion && capsuleMobileAutoplay) {
    capsuleMobileAutoplay.disabled = true;
    capsuleMobileAutoplay.setAttribute("aria-label", "Reproducción automática desactivada");
    capsuleMobileAutoplayIcon.textContent = "▶";
  }

  capsuleMobileDetail?.addEventListener("click", () => {
    const activeSlide = capsuleOriginalSlides[capsuleMobileIndex];
    const image = activeSlide.querySelector("img");
    openCapsulePreview(capsuleMobileDetail, capsuleMobileIndex, image);
  });

  capsuleMobileCarousel.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    useCapsuleControl(event.key === "ArrowLeft" ? -1 : 1);
  });

  capsuleMobileViewport.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    activePointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerDeltaX = 0;
    pauseCapsuleAutoplayForInteraction();
  });

  capsuleMobileViewport.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) return;
    pointerDeltaX = event.clientX - pointerStartX;

    if (Math.abs(pointerDeltaX) < 6) return;
    capsuleMobileTrack.classList.add("is-dragging");
    capsuleMobileViewport.setPointerCapture?.(event.pointerId);
    capsuleMobileTrack.style.transform =
      `translate3d(calc(${-capsuleTrackIndex * 100}% + ${pointerDeltaX}px), 0, 0)`;
  });

  const finishCapsuleSwipe = (event) => {
    if (event.pointerId !== activePointerId) return;

    const swipeThreshold = Math.min(64, capsuleMobileViewport.clientWidth * 0.16);
    const wasDragging = Math.abs(pointerDeltaX) >= 6;
    const didSwipe = Math.abs(pointerDeltaX) >= swipeThreshold;
    capsuleMobileTrack.classList.remove("is-dragging");

    if (wasDragging) {
      suppressCapsuleClick = true;
      window.setTimeout(() => {
        suppressCapsuleClick = false;
      }, 0);
    }

    if (didSwipe) {
      moveCapsuleMobile(pointerDeltaX < 0 ? 1 : -1, true);
    } else {
      setCapsuleTrackPosition(true);
    }

    pauseCapsuleAutoplayForInteraction();
    activePointerId = null;
    pointerDeltaX = 0;
  };

  capsuleMobileViewport.addEventListener("pointerup", finishCapsuleSwipe);
  capsuleMobileViewport.addEventListener("pointercancel", finishCapsuleSwipe);

  capsuleMobileTrack.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "transform") return;

    if (capsuleTrackIndex === 0) {
      capsuleTrackIndex = totalCapsulePieces;
      setCapsuleTrackPosition(false);
    } else if (capsuleTrackIndex === totalCapsulePieces + 1) {
      capsuleTrackIndex = 1;
      setCapsuleTrackPosition(false);
    }
  });

  capsuleMobileQuery.addEventListener("change", () => {
    if (capsuleMobileQuery.matches) {
      setCapsuleTrackPosition(false);
      startCapsuleAutoplay();
    } else {
      stopCapsuleMobileAutoplay();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopCapsuleMobileAutoplay();
    } else {
      startCapsuleAutoplay();
    }
  });

  if ("IntersectionObserver" in window) {
    const capsuleVisibilityObserver = new IntersectionObserver(
      ([entry]) => {
        capsuleSectionVisible = entry.isIntersecting;
        if (capsuleSectionVisible) {
          startCapsuleAutoplay();
        } else {
          stopCapsuleMobileAutoplay();
        }
      },
      { threshold: 0.15 }
    );

    capsuleVisibilityObserver.observe(capsule);
  }

  setCapsuleTrackPosition(false);
  updateCapsuleMobileUI(false);
  startCapsuleAutoplay();
}

if (capsule && capsulePreview) {
  capsulePhotos.forEach((photo, index) => {
    photo.tabIndex = 0;
    photo.setAttribute("role", "button");
    photo.setAttribute("aria-label", `Ver detalle de ${capsulePieces[index]?.title ?? `pieza cápsula ${index + 1}`}`);

    photo.addEventListener("click", () => openCapsulePreview(photo, index));
    photo.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openCapsulePreview(photo, index);
    });
  });

  if (!reducedMotion && !touchPointer) {
    capsule.addEventListener("pointermove", (event) => {
      if (capsule.classList.contains("is-previewing")) return;

      const rect = capsule.getBoundingClientRect();
      const pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      const pointerY = (event.clientY - rect.top) / rect.height - 0.5;

      capsulePhotos.forEach((photo, index) => {
        const depth = 0.35 + (index % 5) * 0.13;
        photo.style.setProperty("--mag-x", `${pointerX * depth * 28}px`);
        photo.style.setProperty("--mag-y", `${pointerY * depth * 22}px`);
        photo.style.setProperty("--mag-z", `${depth * 24}px`);
        photo.style.setProperty("--mag-rx", `${-pointerY * depth * 5}deg`);
        photo.style.setProperty("--mag-ry", `${pointerX * depth * 5}deg`);
      });
    });

    capsule.addEventListener("pointerleave", resetCapsuleDepth);
  }

  capsuleClose.addEventListener("click", closeCapsulePreview);
  capsuleMaterialLink.addEventListener("click", closeCapsulePreview);
  capsulePreview.addEventListener("click", (event) => {
    if (event.target === capsulePreview) closeCapsulePreview();
  });
  window.addEventListener("keydown", (event) => {
    if (!capsulePreview.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeCapsulePreview();
      return;
    }

    if (event.key === "Tab") {
      const focusable = [
        ...capsulePreviewDialog.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ];
      const firstFocusable = focusable[0];
      const lastFocusable = focusable.at(-1);

      if (!firstFocusable) {
        event.preventDefault();
        capsulePreviewDialog.focus();
      } else if (event.shiftKey && (document.activeElement === firstFocusable || document.activeElement === capsulePreviewDialog)) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === capsulePreviewDialog) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  });
}

const updateLearningPath = () => {
  if (!learningPath || !learningPathCards.length) return;

  const horizontalLayout = learningPathHorizontalQuery.matches;
  learningPath.classList.toggle("is-scroll-ready", !reducedMotion && !horizontalLayout);

  if (reducedMotion || horizontalLayout) {
    learningPathCards.forEach((card) => {
      card.style.setProperty("--card-y", "0px");
      card.style.setProperty("--card-scale", "1");
      card.style.opacity = "1";
    });
    return;
  }

  const rect = learningPath.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const scrollDistance = Math.max(learningPath.offsetHeight - viewportHeight, 1);
  const sceneProgress = clamp(-rect.top / scrollDistance);

  learningPathCards.forEach((card, index) => {
    const start = 0.05 + index * 0.15;
    const cardProgress = smoothstep((sceneProgress - start) / 0.36);
    const startY = viewportHeight * (1.04 + index * 0.05);
    const currentY = startY * (1 - cardProgress);
    const currentScale = 0.96 + cardProgress * 0.04;

    card.style.setProperty("--card-y", `${currentY}px`);
    card.style.setProperty("--card-scale", currentScale.toFixed(3));
    card.style.opacity = String(clamp(cardProgress * 4));
  });
};

const updateCollageNotes = () => {
  if (!collage || !collageNotePairs.length) return;

  const collageTop = collage.getBoundingClientRect().top;

  collageNotePairs.forEach(({ note, tile, fallbackAnchorY }) => {
    const tileRect = tile.getBoundingClientRect();
    const cssAnchorY = Number.parseFloat(getComputedStyle(note).getPropertyValue("--note-anchor-y"));
    const anchorY = Number.isFinite(cssAnchorY) ? cssAnchorY : fallbackAnchorY;
    const targetY = collageTop + note.offsetTop + anchorY;
    const isAligned = tileRect.top <= targetY + 8 && tileRect.bottom >= targetY - 8;

    note.classList.toggle("is-aligned", isAligned);
    note.setAttribute("aria-hidden", String(!isAligned));
  });
};

const updateRevealImages = () => {
  const viewportHeight = window.innerHeight;
  const isMobileCollage = mobileCollageQuery.matches;
  const collageTop = collage?.getBoundingClientRect().top ?? 0;

  revealImages.forEach((image, index) => {
    const rect = image.getBoundingClientRect();
    const start = viewportHeight * 1.08;
    const end = isMobileCollage ? viewportHeight * 0.22 : -rect.height * 0.2;
    const referenceTop = isMobileCollage ? collageTop + image.offsetTop : rect.top;
    const progress = clamp((start - referenceTop) / (start - end));
    const startY = isMobileCollage ? 180 + index * 18 : 240 + index * 34;
    const endY = isMobileCollage ? 0 : -130 - index * 24;
    const currentY = startY + (endY - startY) * progress;

    image.style.setProperty("--scroll-y", `${currentY}px`);

    if (progress > 0.08) {
      image.classList.add("is-visible");
    }
  });

  updateCollageNotes();
  updateRestorationParallax();
  updateLearningPath();
  ticking = false;
};

const requestRevealUpdate = () => {
  if (ticking) return;

  ticking = true;
  window.requestAnimationFrame(updateRevealImages);
};

window.addEventListener("scroll", requestRevealUpdate, { passive: true });
window.addEventListener("resize", requestRevealUpdate);
window.addEventListener("load", requestRevealUpdate);
requestRevealUpdate();

const beforeAfterBlocks = document.querySelectorAll("[data-before-after]");

beforeAfterBlocks.forEach((block) => {
  const range = block.querySelector("[data-before-after-range]");

  const updateSplit = () => {
    const value = Number(range.value);
    block.style.setProperty("--split", `${value}%`);
  };

  range.addEventListener("input", updateSplit);
  updateSplit();
});

const revealTextItems = document.querySelectorAll(".reveal-text");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealTextItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealTextObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12,
    }
  );

  revealTextItems.forEach((item) => revealTextObserver.observe(item));
}

const courseOfferCounters = [...document.querySelectorAll("[data-count-target]")];

if (courseOfferCounters.length && !reducedMotion && "IntersectionObserver" in window) {
  const counterDuration = 1300;
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const counter = entry.target;
        const target = Number(counter.dataset.countTarget);
        const prefix = counter.dataset.countPrefix ?? "";
        const suffix = counter.dataset.countSuffix ?? "";
        const delay = courseOfferCounters.indexOf(counter) * 140;

        const renderValue = (value) => {
          counter.textContent = `${prefix}${Math.round(value).toLocaleString("es-AR")}${suffix}`;
        };

        renderValue(0);
        window.setTimeout(() => {
          const startTime = performance.now();

          const updateCounter = (currentTime) => {
            const progress = Math.min((currentTime - startTime) / counterDuration, 1);
            const easedProgress = 1 - (1 - progress) ** 3;
            renderValue(target * easedProgress);

            if (progress < 1) window.requestAnimationFrame(updateCounter);
          };

          window.requestAnimationFrame(updateCounter);
        }, delay);

        observer.unobserve(counter);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.35,
    }
  );

  courseOfferCounters.forEach((counter) => counterObserver.observe(counter));
}

const programSection = document.querySelector("[data-program]");

if (programSection) {
  const programTabs = [...programSection.querySelectorAll("[data-program-tab]")];
  const programPanel = programSection.querySelector("#program-stage-panel");
  const programVideo = programSection.querySelector("[data-program-video]");
  const programDescription = programSection.querySelector("[data-program-description]");
  const programPoints = [...programSection.querySelectorAll("[data-program-points] li")];
  const programTechnique = programSection.querySelector("[data-program-technique]");
  const programMobileQuery = window.matchMedia("(max-width: 760px)");
  let activeProgramIndex = 0;
  let programPointerStart = null;
  const programStages = {
    diagnostico: {
      video: "assets/images/paginadetalle/programa/videodiagnostico.mp4",
      description:
        "Leemos la pieza, detectamos daños y definimos el plan de trabajo antes de intervenir.",
      points: [
        "Evaluación estructural",
        "Materiales y uniones",
        "Plan de restauración",
      ],
      technique: "Lectura de la pieza",
    },
    desarme: {
      video: "assets/images/paginadetalle/programa/videodesarme.mp4",
      description:
        "Desarmamos la silla con seguridad y registramos cada unión para preparar una reparación precisa.",
      points: [
        "Desmontaje de piezas",
        "Retiro de herrajes",
        "Registro de componentes",
      ],
      technique: "Desarme seguro",
    },
    reparacion: {
      video: "assets/images/paginadetalle/programa/vedeo reparacion.mp4",
      description:
        "Reparamos uniones, fisuras y piezas dañadas para devolverle estructura, seguridad y estabilidad.",
      points: [
        "Refuerzo de ensambles",
        "Reparación de fisuras",
        "Estabilidad estructural",
      ],
      technique: "Técnicas",
    },
    acabados: {
      video: "assets/images/paginadetalle/programa/videoacabados.mp4",
      description:
        "Preparamos superficies y aplicamos color y protección para lograr una terminación uniforme y duradera.",
      points: [
        "Lijado de superficies",
        "Aplicación de color",
        "Sellado y protección",
      ],
      technique: "Terminaciones",
    },
    renacimiento: {
      video: "assets/images/paginadetalle/programa/videorenacimiento.mp4",
      description:
        "Rearmamos y ajustamos la pieza terminada para que vuelva, renovada, a formar parte de un espacio.",
      points: [
        "Ensamblaje final",
        "Control de estabilidad",
        "Cuidado de la pieza",
      ],
      technique: "Resultado final",
    },
  };

  const selectProgramStage = (stageKey, moveFocus = false) => {
    const stage = programStages[stageKey];
    if (!stage) return;
    const nextActiveIndex = programTabs.findIndex((tab) => tab.dataset.programTab === stageKey);
    if (nextActiveIndex >= 0) activeProgramIndex = nextActiveIndex;

    programTabs.forEach((tab, index) => {
      const isActive = tab.dataset.programTab === stageKey;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;

      if (!tab.id) tab.id = `program-tab-${index + 1}`;
      if (isActive) {
        programPanel.setAttribute("aria-labelledby", tab.id);
        if (moveFocus) tab.focus({ preventScroll: true });
        if (programMobileQuery.matches) {
          tab.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }
    });

    programVideo.pause();
    programVideo.setAttribute("src", stage.video);
    programVideo.load();
    const playPromise = programVideo.play();
    if (playPromise) playPromise.catch(() => {});

    programDescription.textContent = stage.description;
    programPoints.forEach((point, index) => {
      point.textContent = stage.points[index];
    });
    programTechnique.textContent = stage.technique;

    programPanel.classList.remove("is-entering");
    void programPanel.offsetWidth;
    programPanel.classList.add("is-entering");
  };

  const selectProgramByOffset = (offset) => {
    const nextIndex = Math.min(Math.max(activeProgramIndex + offset, 0), programTabs.length - 1);
    if (nextIndex === activeProgramIndex) return;
    selectProgramStage(programTabs[nextIndex].dataset.programTab);
  };

  programTabs.forEach((tab, index) => {
    tab.id = `program-tab-${index + 1}`;
    tab.addEventListener("click", () => selectProgramStage(tab.dataset.programTab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;

      if (event.key === "ArrowRight") nextIndex = (index + 1) % programTabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + programTabs.length) % programTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = programTabs.length - 1;
      if (nextIndex === index) return;

      event.preventDefault();
      selectProgramStage(programTabs[nextIndex].dataset.programTab, true);
    });
  });

  programPanel.setAttribute("aria-labelledby", programTabs[0].id);

  programPanel.addEventListener("pointerdown", (event) => {
    if (!programMobileQuery.matches) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    programPointerStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  });

  window.addEventListener("pointerup", (event) => {
    if (!programPointerStart || event.pointerId !== programPointerStart.id) return;

    const distanceX = event.clientX - programPointerStart.x;
    const distanceY = event.clientY - programPointerStart.y;
    programPointerStart = null;

    if (!programMobileQuery.matches) return;
    if (Math.abs(distanceX) < 45 || Math.abs(distanceX) <= Math.abs(distanceY) * 1.2) return;

    selectProgramByOffset(distanceX < 0 ? 1 : -1);
  });

  window.addEventListener("pointercancel", (event) => {
    if (programPointerStart?.id === event.pointerId) programPointerStart = null;
  });

  if (programMobileQuery.matches) {
    window.requestAnimationFrame(() => {
      programTabs[0].scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    });
  }
}

const professorCards = document.querySelectorAll("[data-professor]");

if (professorCards.length) {
  const professorList = [...professorCards];
  const professorsSection = professorList[0].closest(".professors");
  const professorsGrid = professorsSection?.querySelector(".professors-grid");
  const professorsPagination = professorsSection?.querySelector("[data-professors-pagination]");
  const professorDots = professorsPagination ? [...professorsPagination.querySelectorAll(".professors-dot")] : [];
  const professorMobileQuery = window.matchMedia("(max-width: 760px)");
  let professorScrollFrame = null;

  const setProfessorTeamState = (frameIndex, targetCard = null) => {
    professorList.forEach((card) => {
      const frames = [...card.querySelectorAll(".professor-frame")];
      const safeIndex = ((frameIndex % frames.length) + frames.length) % frames.length;

      frames.forEach((frame, index) => frame.classList.toggle("is-active", index === safeIndex));
      card.classList.toggle("is-target", card === targetCard);
      card.dataset.frame = String(safeIndex);
    });
  };

  const setProfessorNameVisibility = (targetCard = null) => {
    professorList.forEach((card) => {
      const isVisible = card === targetCard;
      card.classList.toggle("is-name-visible", isVisible);
      card.setAttribute("aria-pressed", String(isVisible));
    });
  };

  const toggleProfessorName = (selectedCard) => {
    const shouldOpen = !selectedCard.classList.contains("is-name-visible");

    professorList.forEach((card) => {
      const isOpen = card === selectedCard && shouldOpen;
      card.classList.toggle("is-name-visible", isOpen);
      card.setAttribute("aria-pressed", String(isOpen));
    });
  };

  const syncProfessorMobileNames = () => {
    if (!professorMobileQuery.matches) return;

    professorList.forEach((card) => {
      card.classList.add("is-name-visible");
      card.setAttribute("aria-pressed", "true");
    });
  };

  professorList.forEach((card, cardIndex) => {
    card.addEventListener("pointerenter", (event) => {
      if (!professorMobileQuery.matches && event.pointerType !== "touch") {
        setProfessorTeamState(cardIndex + 1, card);
        setProfessorNameVisibility(card);
      }
    });
    card.addEventListener("pointerleave", () => {
      if (!professorMobileQuery.matches && !card.matches(":focus")) {
        setProfessorTeamState(0);
        setProfessorNameVisibility();
      }
    });
    card.addEventListener("focus", () => {
      if (professorMobileQuery.matches) return;

      window.requestAnimationFrame(() => {
        if (!card.matches(":focus-visible")) return;

        setProfessorTeamState(cardIndex + 1, card);
        setProfessorNameVisibility(card);
      });
    });
    card.addEventListener("blur", () => {
      if (!professorMobileQuery.matches && !card.matches(":hover")) {
        setProfessorTeamState(0);
        setProfessorNameVisibility();
      }
    });
    card.addEventListener("click", () => {
      if (professorMobileQuery.matches) {
        syncProfessorMobileNames();
        return;
      }

      if (!professorMobileQuery.matches && !touchPointer) return;

      if (!professorMobileQuery.matches) setProfessorTeamState(cardIndex + 1, card);
      toggleProfessorName(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();

      if (!professorMobileQuery.matches) {
        setProfessorTeamState(cardIndex + 1, card);
        setProfessorNameVisibility(card);
        return;
      }

      syncProfessorMobileNames();
    });
  });

  if (professorsGrid && professorDots.length) {
    const setActiveProfessor = (activeIndex) => {
      professorDots.forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-current", String(isActive));
      });
    };

    const updateActiveProfessor = () => {
      const gridCenter = professorsGrid.scrollLeft + professorsGrid.clientWidth / 2;
      const activeIndex = professorList.reduce((bestIndex, card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const bestCard = professorList[bestIndex];
        const bestCenter = bestCard.offsetLeft + bestCard.offsetWidth / 2;
        return Math.abs(cardCenter - gridCenter) < Math.abs(bestCenter - gridCenter) ? index : bestIndex;
      }, 0);

      setActiveProfessor(activeIndex);
    };

    professorDots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        const card = professorList[index];
        if (!card) return;

        const targetLeft = card.offsetLeft - (professorsGrid.clientWidth - card.offsetWidth) / 2;
        professorsGrid.scrollTo({
          left: targetLeft,
          behavior: reducedMotion ? "auto" : "smooth",
        });
        setActiveProfessor(index);
      });
    });

    professorsGrid.addEventListener(
      "scroll",
      () => {
        window.cancelAnimationFrame(professorScrollFrame);
        professorScrollFrame = window.requestAnimationFrame(updateActiveProfessor);
      },
      { passive: true },
    );

    window.addEventListener("resize", () => {
      updateActiveProfessor();
      syncProfessorMobileNames();
    });
    updateActiveProfessor();
  }

  setProfessorTeamState(0);
  syncProfessorMobileNames();
}

const testimonialsSection = document.querySelector("[data-testimonials]");

if (testimonialsSection) {
  const carousel = testimonialsSection.querySelector("[data-testimonials-carousel]");
  const track = testimonialsSection.querySelector("[data-testimonials-track]");
  const cards = [...track.querySelectorAll(".testimonial-card")];
  const pagination = testimonialsSection.querySelector("[data-testimonials-pagination]");
  const status = testimonialsSection.querySelector("[data-testimonials-status]");
  let currentPage = 0;
  let pageCount = 1;
  let itemsPerPage = 4;
  let autoPlayTimer = null;
  let pointerStartX = null;
  let pointerStartY = null;
  let isSectionVisible = false;
  let resizeFrame = null;

  const getVisibleCards = () => cards.filter((card) => getComputedStyle(card).display !== "none");

  const getItemsPerPage = () => {
    if (window.matchMedia("(max-width: 760px)").matches) return 1;
    if (window.matchMedia("(max-width: 1050px)").matches) return 2;
    return 4;
  };

  const stopAutoPlay = () => {
    window.clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  };

  const startAutoPlay = () => {
    stopAutoPlay();
    if (reducedMotion || !isSectionVisible || document.hidden || pageCount < 2) return;

    autoPlayTimer = window.setInterval(() => {
      showTestimonialsPage(currentPage + 1, false);
    }, 3500);
  };

  const buildPagination = () => {
    pagination.replaceChildren();

    for (let index = 0; index < pageCount; index += 1) {
      const dot = document.createElement("button");
      dot.className = "testimonials-dot";
      dot.type = "button";
      dot.setAttribute("aria-label", `Mostrar opiniones ${index + 1} de ${pageCount}`);
      dot.addEventListener("click", () => {
        showTestimonialsPage(index);
        startAutoPlay();
      });
      pagination.appendChild(dot);
    }
  };

  const showTestimonialsPage = (requestedPage, announce = true) => {
    const visibleCards = getVisibleCards();
    if (!visibleCards.length) return;

    currentPage = ((requestedPage % pageCount) + pageCount) % pageCount;
    const firstCardIndex = currentPage * itemsPerPage;
    const targetCard = visibleCards[firstCardIndex];
    const offset = targetCard.offsetLeft - visibleCards[0].offsetLeft;

    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    cards.forEach((card) => card.setAttribute("aria-hidden", "true"));
    visibleCards.forEach((card, index) => {
      const isOnPage = index >= firstCardIndex && index < firstCardIndex + itemsPerPage;
      card.setAttribute("aria-hidden", String(!isOnPage));
    });

    [...pagination.children].forEach((dot, index) => {
      const isActive = index === currentPage;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (announce) status.textContent = `Grupo ${currentPage + 1} de ${pageCount}`;
  };

  const configureTestimonials = () => {
    const visibleCards = getVisibleCards();
    itemsPerPage = getItemsPerPage();
    pageCount = Math.max(1, Math.ceil(visibleCards.length / itemsPerPage));
    currentPage = Math.min(currentPage, pageCount - 1);

    visibleCards.forEach((card, index) => {
      card.setAttribute("aria-label", `Opinión ${index + 1} de ${visibleCards.length}`);
    });
    cards.filter((card) => !visibleCards.includes(card)).forEach((card) => {
      card.removeAttribute("aria-label");
      card.setAttribute("aria-hidden", "true");
    });

    buildPagination();
    showTestimonialsPage(currentPage, false);
    startAutoPlay();
  };

  carousel.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showTestimonialsPage(currentPage + (event.key === "ArrowRight" ? 1 : -1));
    startAutoPlay();
  });

  carousel.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    stopAutoPlay();
  });

  carousel.addEventListener("pointerup", (event) => {
    if (pointerStartX === null || pointerStartY === null) return;
    const distanceX = event.clientX - pointerStartX;
    const distanceY = event.clientY - pointerStartY;

    if (Math.abs(distanceX) > 45 && Math.abs(distanceX) > Math.abs(distanceY)) {
      showTestimonialsPage(currentPage + (distanceX < 0 ? 1 : -1));
    }

    pointerStartX = null;
    pointerStartY = null;
    startAutoPlay();
  });

  carousel.addEventListener("pointercancel", () => {
    pointerStartX = null;
    pointerStartY = null;
    startAutoPlay();
  });

  testimonialsSection.addEventListener("focusin", stopAutoPlay);
  testimonialsSection.addEventListener("focusout", (event) => {
    if (!testimonialsSection.contains(event.relatedTarget)) startAutoPlay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoPlay();
    else startAutoPlay();
  });

  if ("IntersectionObserver" in window) {
    const testimonialsObserver = new IntersectionObserver(
      ([entry]) => {
        isSectionVisible = entry.isIntersecting;
        if (isSectionVisible) startAutoPlay();
        else stopAutoPlay();
      },
      { threshold: 0.15 }
    );
    testimonialsObserver.observe(testimonialsSection);
  } else {
    isSectionVisible = true;
  }

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(configureTestimonials);
  });

  configureTestimonials();
}

const faqSection = document.querySelector("[data-faq]");

if (faqSection) {
  const faqItems = [...faqSection.querySelectorAll(".faq-item")];
  const faqQuestions = [...faqSection.querySelectorAll("[data-faq-question]")];
  const closeTimers = new WeakMap();

  const closeFaqItem = (item) => {
    const question = item.querySelector("[data-faq-question]");
    const answer = item.querySelector(".faq-answer");

    window.clearTimeout(closeTimers.get(item));
    item.classList.remove("is-open");
    question.setAttribute("aria-expanded", "false");

    if (reducedMotion) {
      answer.hidden = true;
      return;
    }

    const timer = window.setTimeout(() => {
      if (!item.classList.contains("is-open")) answer.hidden = true;
    }, 360);
    closeTimers.set(item, timer);
  };

  const openFaqItem = (item) => {
    const question = item.querySelector("[data-faq-question]");
    const answer = item.querySelector(".faq-answer");

    faqItems.forEach((otherItem) => {
      if (otherItem !== item && otherItem.classList.contains("is-open")) {
        closeFaqItem(otherItem);
      }
    });

    window.clearTimeout(closeTimers.get(item));
    answer.hidden = false;
    question.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => item.classList.add("is-open"));
  };

  faqQuestions.forEach((question, index) => {
    question.addEventListener("click", () => {
      const item = question.closest(".faq-item");
      if (item.classList.contains("is-open")) closeFaqItem(item);
      else openFaqItem(item);
    });

    question.addEventListener("keydown", (event) => {
      let targetIndex = index;
      if (event.key === "ArrowDown") targetIndex = (index + 1) % faqQuestions.length;
      if (event.key === "ArrowUp") targetIndex = (index - 1 + faqQuestions.length) % faqQuestions.length;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = faqQuestions.length - 1;
      if (targetIndex === index) return;

      event.preventDefault();
      faqQuestions[targetIndex].focus();
    });
  });
}
