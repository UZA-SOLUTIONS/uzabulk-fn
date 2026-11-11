import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import UserAuthCard from "./UserAuthCard";
import ROUTES from "../../helpers/routesHelper";
import { BRAND_LOGO_PNG } from "../../config/constants";
import logoFallback from "../../assets/images/dark_logo.svg";
import Homemenustrip from "./Homemenustrip";
import ProductSearch from "../Common/ProductSearch";
import { rememberRecentSearch } from "../../helpers/recentSearchHelper";

const ICON_MAGNIFIER = (
  <svg className="header-mockup-search-submit__icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="2" />
    <path d="M15.2 15.2L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function Header() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [liveSearchPending, setLiveSearchPending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const productsLoading = useSelector((s) => Boolean(s?.products?.products?.isLoading));
  const navStripHiddenRef = useRef(false);
  const liveSearchTimerRef = useRef(null);
  const liveSearchLastUrlRef = useRef("");
  const searchTextRef = useRef("");
  const searchInputDirtyRef = useRef(false);

  const isOnSearchListing =
    location.pathname === ROUTES.PRODUCT_LISTING || location.pathname === ROUTES.CATEGORIES;
  const isTextSearching = isOnSearchListing && liveSearchPending;

  useLayoutEffect(() => {
    const readY = () => window.scrollY ?? document.documentElement.scrollTop ?? 0;
    // Hysteresis: hide past this, show again only near the top (avoids bounce + keeps category strip sticky).
    const SHOW_BELOW = 16;
    const HIDE_ABOVE = 80;
    let rafId = 0;

    const applyHidden = (hidden) => {
      if (navStripHiddenRef.current === hidden) return;
      navStripHiddenRef.current = hidden;
      setIsScrolled(hidden);
    };

    const syncNavStrip = () => {
      const y = readY();
      if (y <= SHOW_BELOW) {
        applyHidden(false);
        return;
      }
      if (y >= HIDE_ABOVE) {
        applyHidden(true);
      }
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        syncNavStrip();
      });
    };

    syncNavStrip();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    searchTextRef.current = searchText;
  }, [searchText]);

  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const currentUrl = `${location.pathname}?${searchParams.toString()}`;
    const fromOurLiveUpdate = liveSearchLastUrlRef.current === currentUrl;

    if (searchInputDirtyRef.current) {
      if (!fromOurLiveUpdate) {
        searchInputDirtyRef.current = false;
        setSearchText(urlSearch);
        return;
      }
      if (urlSearch.trim() === String(searchTextRef.current || "").trim()) {
        searchInputDirtyRef.current = false;
      }
      return;
    }

    setSearchText(urlSearch);
  }, [searchParams, location.pathname]);

  useEffect(() => () => {
    if (liveSearchTimerRef.current) clearTimeout(liveSearchTimerRef.current);
  }, []);

  useEffect(() => {
    if (!liveSearchPending || productsLoading) return;
    const urlSearch = (searchParams.get("search") || "").trim();
    if (urlSearch === String(searchTextRef.current || "").trim()) {
      setLiveSearchPending(false);
    }
  }, [liveSearchPending, productsLoading, searchParams]);

  const applyLiveListingSearch = (rawSearch) => {
    if (!isOnSearchListing) {
      setLiveSearchPending(false);
      return;
    }

    const trimmed = String(rawSearch || "").trim();
    const currentSearch = (searchParams.get("search") || "").trim();
    if (trimmed === currentSearch) {
      searchInputDirtyRef.current = false;
      setLiveSearchPending(false);
      return;
    }

    const params = new URLSearchParams(searchParams);
    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }
    params.set("skip", "1");
    params.delete("refresh");
    params.delete("mixSearch");

    const nextUrl = `${location.pathname}?${params.toString()}`;
    if (liveSearchLastUrlRef.current === nextUrl) {
      setLiveSearchPending(false);
      return;
    }
    liveSearchLastUrlRef.current = nextUrl;
    navigate(nextUrl, { replace: true });
  };

  const handleSearchTextChange = (search) => {
    const next = search || "";
    searchInputDirtyRef.current = true;
    setSearchText(next);

    if (!isOnSearchListing) return;

    setLiveSearchPending(true);
    if (liveSearchTimerRef.current) clearTimeout(liveSearchTimerRef.current);
    liveSearchTimerRef.current = setTimeout(() => {
      applyLiveListingSearch(next);
    }, 450);
  };

  const handleHeaderSearch = (event) => {
    event.preventDefault();
    if (liveSearchTimerRef.current) clearTimeout(liveSearchTimerRef.current);
    searchInputDirtyRef.current = false;
    if (isOnSearchListing) setLiveSearchPending(true);

    const trimmed = (searchText || "").trim();
    if (!trimmed) {
      if (isOnSearchListing) applyLiveListingSearch("");
      else setLiveSearchPending(false);
      return;
    }

    rememberRecentSearch(trimmed);

    const params = new URLSearchParams();
    params.set("search", trimmed);
    params.set("skip", "1");
    const nextUrl = `${ROUTES.PRODUCT_LISTING}?${params.toString()}`;
    liveSearchLastUrlRef.current = nextUrl;
    navigate(nextUrl);
  };

  return (
    <header
      className={`site-header site-header--mockup${isScrolled ? " is-scrolled" : ""} site-header--search-visible${isTextSearching ? " is-text-search-loading" : ""}`}
    >
      <section className="header-sub-actions">
        <Container fluid className="header-mockup-container px-3 px-sm-4 px-xl-5">
          <div className="header-sub-actions-inner header-mockup-top-row">
            <Link to={ROUTES.HOME} className="navbar-mockup-brand" aria-label={t("nav.uzabulkHome")}>
              <img
                src={BRAND_LOGO_PNG}
                alt="UZABULK"
                className="navbar-mockup-brand-logo"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = logoFallback;
                }}
              />
            </Link>

            <form className="header-mockup-search-form" onSubmit={handleHeaderSearch}>
              <div className="header-mockup-search-shell">
                <ProductSearch
                  wrapperClassName="header-mockup-autocomplete"
                  defaultValue={searchText}
                  placeholder={t("search.placeholder")}
                  callback={({ search }) => handleSearchTextChange(search)}
                />
                <div className="header-mockup-search-tray">
                  <button
                    type="submit"
                    className={`header-mockup-search-submit${isTextSearching ? " is-searching" : ""}`}
                    aria-label={isTextSearching ? t("search.searching") : t("search.submit")}
                    aria-busy={isTextSearching || undefined}
                  >
                    {ICON_MAGNIFIER}
                    <span className="header-mockup-search-submit__label">{t("search.submit")}</span>
                    {isTextSearching ? <span className="header-mockup-search-submit__spinner" aria-hidden /> : null}
                  </button>
                </div>
              </div>
            </form>

            <UserAuthCard navbarPlacement="mockupTop" className="navbar-mockup-top-auth-wrap" />
          </div>
        </Container>
      </section>

      <Homemenustrip collapsed={isScrolled} />
    </header>
  );
}
