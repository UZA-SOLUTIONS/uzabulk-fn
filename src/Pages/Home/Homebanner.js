import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";

const HERO_SLIDE_CONFIG = [
  {
    image: "/bg1.jpg",
    titleKey: "home.hero.slide1Title",
    ctaKey: "home.hero.slide1Cta",
    to: ROUTES.CATEGORIES,
  },
  {
    image: "/bg2.jpg",
    titleKey: "home.hero.slide2Title",
    ctaKey: "home.hero.slide2Cta",
    to: ROUTES.PRODUCT_LISTING,
  },
  {
    image: "/bg3.jpg",
    titleKey: "home.hero.slide3Title",
    ctaKey: "home.hero.slide3Cta",
    to: `${ROUTES.HOME}?auth=signup`,
  },
];

const SLIDE_MS = 5500;

const Chevron = ({ dir }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Homebanner = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const heroSlides = useMemo(
    () =>
      HERO_SLIDE_CONFIG.map((slide) => ({
        ...slide,
        title: t(slide.titleKey),
        cta: t(slide.ctaKey),
      })),
    [t]
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return undefined;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroSlides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [heroSlides.length]);

  const slide = heroSlides[activeIndex];
  const goPrev = () => {
    setActiveIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  };
  const goNext = () => {
    setActiveIndex((i) => (i + 1) % heroSlides.length);
  };

  return (
    <section
      className="home_alibaba_hero home_alibaba_hero--slideshow home_alibaba_hero--fullbleed home_alibaba_hero--copy position-relative"
      aria-label={t("home.homepageBanner")}
    >
      <div className="home_alibaba_hero_slideshow">
        <div
          className="home_alibaba_hero_slides"
          style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
        >
          {heroSlides.map((item) => (
            <div
              key={item.image}
              className="home_alibaba_hero_slide"
              style={{ backgroundImage: `url(${item.image})` }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="home_alibaba_hero_header_overlay" aria-hidden="true" />
        <div className="home_alibaba_hero_copy">
          <h1 key={`title-${activeIndex}`} className="home_alibaba_hero_copy__title">
            {slide.title}
          </h1>
          <Link
            key={`cta-${activeIndex}`}
            to={slide.to}
            className="home_alibaba_hero_copy__cta"
          >
            {slide.cta}
          </Link>
        </div>
        <button
          type="button"
          className="home_alibaba_hero_arrow home_alibaba_hero_arrow--prev"
          onClick={goPrev}
          aria-label={t("home.previousSlide")}
        >
          <Chevron dir="prev" />
        </button>
        <button
          type="button"
          className="home_alibaba_hero_arrow home_alibaba_hero_arrow--next"
          onClick={goNext}
          aria-label={t("home.nextSlide")}
        >
          <Chevron dir="next" />
        </button>
      </div>
    </section>
  );
};

export default Homebanner;
