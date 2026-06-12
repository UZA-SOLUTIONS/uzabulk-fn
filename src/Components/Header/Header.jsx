import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Container } from "react-bootstrap";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import UserAuthCard from "./UserAuthCard";
import ROUTES from "../../helpers/routesHelper";
import { BRAND_LOGO_PNG } from "../../config/constants";
import logoFallback from "../../assets/images/dark_logo.svg";
import Homemenustrip from "./Homemenustrip";
import ProductSearch from "../Common/ProductSearch";
import ImageSearchTray from "../Common/ImageSearchTray";
import { readImageFromClipboard, uploadImageSearch } from "../../helpers/imageSearchHelper";

const ICON_MAGNIFIER = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="10.5" cy="10.5" r="6.25" stroke="#111d2b" strokeWidth="2" />
    <path d="M15.2 15.2L21 21" stroke="#111d2b" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function Header() {
  const [searchText, setSearchText] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const imageSearchLoadingLabel = "Loading";
  const [localImagePreview, setLocalImagePreview] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const imageSearchInputRef = useRef(null);
  const localPreviewRef = useRef("");

  const imageFromQuery = searchParams.get("image") || "";
  const activeImagePreview = imageFromQuery || localImagePreview;

  useLayoutEffect(() => {
    const readY = () => window.scrollY ?? document.documentElement.scrollTop ?? 0;
    const onScroll = () => setScrollY(readY());
    setScrollY(readY());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setSearchText(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (imageFromQuery && localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = "";
      setLocalImagePreview("");
    }
  }, [imageFromQuery]);

  useEffect(() => () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
    }
  }, []);

  const revokeLocalPreview = () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = "";
    }
    setLocalImagePreview("");
  };

  const handleHeaderSearch = (event) => {
    event.preventDefault();
    const trimmed = (searchText || "").trim();
    if (!trimmed) return;

    const params = new URLSearchParams();
    params.set("search", trimmed);
    params.set("skip", "1");
    if (imageFromQuery) params.set("image", imageFromQuery);
    navigate(`${ROUTES.PRODUCT_LISTING}?${params.toString()}`);
  };

  const handleClearImageSearch = () => {
    revokeLocalPreview();
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
      toast.error("Please choose or paste an image file.");
      return;
    }
    if (imageSearchLoading) return;

    revokeLocalPreview();
    const blobUrl = URL.createObjectURL(file);
    localPreviewRef.current = blobUrl;
    setLocalImagePreview(blobUrl);

    setImageSearchLoading(true);

    try {
      const data = await uploadImageSearch(file, { limit: 32 });
      const imageUrl = data?.others?.imageUrl || "";
      const keyword =
        data?.others?.imageSearchObjectLabel
        || data?.others?.imageSearchKeyword
        || data?.others?.imageSearchPhrase
        || "";
      if (keyword) setSearchText(keyword);
      const params = new URLSearchParams();
      params.set("skip", "1");
      if (imageUrl) params.set("image", imageUrl);
      if (keyword) params.set("search", keyword);
      navigate(`${ROUTES.PRODUCT_LISTING}?${params.toString()}`);
    } catch (error) {
      revokeLocalPreview();
      toast.error(error?.message || "Could not search by image. Try again.");
      console.error("Image search failed:", error);
    } finally {
      setImageSearchLoading(false);
      if (imageSearchInputRef.current) imageSearchInputRef.current.value = "";
    }
  };

  const runImageUrlSearch = async (imageUrl) => {
    if (!imageUrl || imageSearchLoading) return;

    revokeLocalPreview();
    setLocalImagePreview(imageUrl);
    setImageSearchLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("skip", "1");
      params.set("image", imageUrl);
      navigate(`${ROUTES.PRODUCT_LISTING}?${params.toString()}`);
    } catch (error) {
      revokeLocalPreview();
      toast.error(error?.message || "Could not search by image URL. Try again.");
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
      className={`site-header site-header--mockup${scrollY > 4 ? " is-scrolled" : ""} site-header--search-visible${activeImagePreview ? " has-image-search-preview" : ""}${imageSearchLoading ? " is-image-search-loading" : ""}`}
    >
      <section className="header-sub-actions">
        <Container fluid className="header-mockup-container px-3 px-sm-4 px-xl-5">
          <div className="header-sub-actions-inner header-mockup-top-row">
            <Link to={ROUTES.HOME} className="navbar-mockup-brand" aria-label="UZABULK Home">
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
                  placeholder={activeImagePreview ? "Add keywords or search again…" : "Search products, paste or upload an image…"}
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
                    onClear={handleClearImageSearch}
                  />
                  <button type="submit" className="header-mockup-search-submit" aria-label="Search">
                    {ICON_MAGNIFIER}
                  </button>
                </div>
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
