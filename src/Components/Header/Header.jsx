import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import UserAuthCard from "./UserAuthCard";
import ROUTES from "../../helpers/routesHelper";
import { BRAND_LOGO_PNG } from "../../config/constants";
import logoFallback from "../../assets/images/dark_logo.svg";
import Homemenustrip from "./Homemenustrip";
import ProductSearch from "../Common/ProductSearch";
import ImageSearchTray from "../Common/ImageSearchTray";
import ImageScanningPanel from "../Products/ImageScanningPanel";
import { rememberRecentSearch } from "../../helpers/recentSearchHelper";
import {
  persistImageSearchPreview,
  readImageFromClipboard,
  readImageSearchBlobPreview,
  uploadImageForSearchBar,
  buildSearchBarImageListingUrl,
  clearImageSearchPreview,
} from "../../helpers/imageSearchHelper";

const ICON_MAGNIFIER = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="2" />
    <path d="M15.2 15.2L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function Header() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const imageSearchLoadingLabel = t("search.scanningImage");
  const [localImagePreview, setLocalImagePreview] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const imageSearchInputRef = useRef(null);
  const localPreviewRef = useRef("");

  const imageFromQuery = searchParams.get("image") || "";
  const activeImagePreview = localImagePreview || readImageSearchBlobPreview() || "";

  useLayoutEffect(() => {
    const readY = () => window.scrollY ?? document.documentElement.scrollTop ?? 0;
    let rafId = 0;
    const syncScrolled = () => {
      const next = readY() > 4;
      setIsScrolled((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        syncScrolled();
      });
    };
    syncScrolled();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    setSearchText(searchParams.get("search") || "");
  }, [searchParams]);

  const revokeLocalPreview = () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = "";
    }
    setLocalImagePreview("");
  };

  useEffect(() => {
    if (imageFromQuery || imageSearchLoading) return;
    revokeLocalPreview();
    clearImageSearchPreview();
  }, [imageFromQuery, imageSearchLoading]);

  useEffect(() => () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
    }
  }, []);

  const handleHeaderSearch = (event) => {
    event.preventDefault();
    const trimmed = (searchText || "").trim();
    if (!trimmed) return;

    rememberRecentSearch(trimmed);

    const params = new URLSearchParams();
    params.set("search", trimmed);
    params.set("skip", "1");
    // Explicit text + image refine only when the user submits keywords while an image is active.
    if (imageFromQuery) {
      params.set("image", imageFromQuery);
      params.set("mixSearch", "1");
    }
    navigate(`${ROUTES.PRODUCT_LISTING}?${params.toString()}`);
  };

  const handleClearImageSearch = () => {
    revokeLocalPreview();
    clearImageSearchPreview();
    if (imageSearchInputRef.current) {
      imageSearchInputRef.current.value = "";
    }

    const params = new URLSearchParams(searchParams);
    params.delete("image");
    params.delete("search");
    params.delete("refresh");
    params.set("skip", "1");

    const qs = params.toString();
    if (location.pathname === ROUTES.PRODUCT_LISTING || location.pathname === ROUTES.CATEGORIES) {
      navigate(qs ? `${location.pathname}?${qs}` : `${ROUTES.PRODUCT_LISTING}?skip=1`);
    } else {
      setSearchText("");
    }
  };

  const runImageFileSearch = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error(t("search.invalidImage"));
      return;
    }
    if (imageSearchLoading) return;

    revokeLocalPreview();
    const blobUrl = URL.createObjectURL(file);
    localPreviewRef.current = blobUrl;
    setLocalImagePreview(blobUrl);
    persistImageSearchPreview(blobUrl);
    setSearchText("");

    setImageSearchLoading(true);

    try {
      const imageUrl = await uploadImageForSearchBar(file);
      const params = buildSearchBarImageListingUrl({ imageUrl });
      navigate(`${ROUTES.PRODUCT_LISTING}?${params}`);
    } catch (error) {
      revokeLocalPreview();
      toast.error(error?.message || t("search.imageSearchFailed"));
      console.error("Image search failed:", error);
    } finally {
      setImageSearchLoading(false);
      if (imageSearchInputRef.current) imageSearchInputRef.current.value = "";
    }
  };

  const runImageUrlSearch = async (imageUrl) => {
    if (!imageUrl || imageSearchLoading) return;

    revokeLocalPreview();
    setSearchText("");
    setImageSearchLoading(true);

    try {
      const params = buildSearchBarImageListingUrl({ imageUrl });
      navigate(`${ROUTES.PRODUCT_LISTING}?${params}`);
    } catch (error) {
      revokeLocalPreview();
      toast.error(error?.message || t("search.imageUrlSearchFailed"));
      console.error("Image URL search failed:", error);
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handleImageSearch = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    await runImageFileSearch(file);
    if (imageSearchInputRef.current) event.target.value = "";
  };

  const handleSearchPaste = (event) => {
    const payload = readImageFromClipboard(event);
    if (!payload) return;

    event.preventDefault();
    if (payload.type === "file") {
      void runImageFileSearch(payload.file);
      return;
    }
    if (payload.type === "url") {
      void runImageUrlSearch(payload.imageUrl);
    }
  };

  return (
    <header
      className={`site-header site-header--mockup${isScrolled ? " is-scrolled" : ""} site-header--search-visible${activeImagePreview ? " has-image-search-preview" : ""}${imageSearchLoading ? " is-image-search-loading" : ""}`}
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

            <form className="header-mockup-search-form" onSubmit={handleHeaderSearch} onPaste={handleSearchPaste}>
              <div className="header-mockup-search-shell">
                <ProductSearch
                  wrapperClassName="header-mockup-autocomplete"
                  defaultValue={searchText}
                  placeholder={
                    activeImagePreview
                      ? t("search.placeholderWithImage")
                      : t("search.placeholder")
                  }
                  callback={({ search }) => setSearchText(search || "")}
                />
                <div className="header-mockup-search-tray">
                  <ImageSearchTray
                    previewUrl={activeImagePreview}
                    isLoading={imageSearchLoading}
                    loadingLabel={imageSearchLoadingLabel}
                    inputId="header-mockup-image-search-input"
                    inputRef={imageSearchInputRef}
                    onFileSelect={handleImageSearch}
                    onImageUrl={runImageUrlSearch}
                    onClear={handleClearImageSearch}
                  />
                  <button type="submit" className="header-mockup-search-submit" aria-label={t("search.submit")}>
                    {ICON_MAGNIFIER}
                    <span className="header-mockup-search-submit__label">{t("search.submit")}</span>
                  </button>
                </div>
                {imageSearchLoading ? (
                  <div className="header-image-scan-popover">
                    <ImageScanningPanel
                      imageUrl={activeImagePreview}
                      compact
                      className="image-scan-panel--header"
                    />
                  </div>
                ) : null}
              </div>
            </form>

            <UserAuthCard navbarPlacement="mockupTop" className="navbar-mockup-top-auth-wrap" />
          </div>
        </Container>
      </section>

      <section className="header-nav-row">
        <Homemenustrip />
      </section>
    </header>
  );
}
