import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import ImageSearchDropdown, { ImageSearchTriggerButton } from "./ImageSearchDropdown";

const MOBILE_MQ = "(max-width: 767.98px)";

export default function ImageSearchTray({
  previewUrl = "",
  isLoading = false,
  loadingLabel = "",
  inputId = "header-mockup-image-search-input",
  inputRef = null,
  onFileSelect = () => {},
  onImageUrl = () => {},
  onClear = () => {},
}) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MQ).matches : false
  );
  const triggerRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const localInputRef = useRef(null);
  const resolvedLoadingLabel = loadingLabel || t("search.scanningImage");

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener?.("change", sync);
    return () => mql.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!mobileSheetOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMobileSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileSheetOpen]);

  const setInputRef = (node) => {
    localInputRef.current = node;
    galleryInputRef.current = node;
    if (!inputRef) return;
    if (typeof inputRef === "function") inputRef(node);
    else inputRef.current = node;
  };

  const openPicker = (which = "gallery") => {
    const input = which === "camera" ? cameraInputRef.current : galleryInputRef.current;
    if (!input || isLoading) return;
    input.value = "";
    input.click();
  };

  const handleNativeFileChange = (event) => {
    const file = event?.target?.files?.[0];
    setMobileSheetOpen(false);
    if (!file) return;
    onFileSelect(event);
    if (event?.target) event.target.value = "";
  };

  const handleTriggerClick = () => {
    if (isLoading) return;
    if (isMobile) {
      setMobileSheetOpen(true);
      return;
    }
    setDropdownOpen((open) => !open);
  };

  if (previewUrl) {
    return (
      <div
        className={`header-mockup-img-search header-mockup-img-search--preview${isLoading ? " is-loading" : ""}`}
        title={isLoading ? resolvedLoadingLabel : "Image search active"}
        aria-busy={isLoading}
      >
        <img
          src={previewUrl}
          alt=""
          className="header-mockup-img-search__thumb"
          decoding="async"
        />
        {isLoading ? (
          <div className="header-mockup-img-search__loading" aria-live="polite" aria-label={resolvedLoadingLabel}>
            <span className="header-mockup-img-search__scan-line" aria-hidden />
            <span className="header-mockup-img-search__spinner" aria-hidden />
          </div>
        ) : null}
        <button
          type="button"
          className="header-mockup-img-search__clear"
          onClick={onClear}
          disabled={isLoading}
          aria-label={t("search.clearImageSearch")}
          title={t("search.clearImageSearch")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  const searchShell =
    triggerRef.current?.closest?.(".header-mockup-search-shell")
    || (typeof document !== "undefined"
      ? document.querySelector(".header-mockup-search-shell")
      : null);

  return (
    <div className="header-mockup-img-search-wrap">
      {/* Gallery / files — no capture so the OS may still offer camera + library. */}
      <input
        id={inputId}
        ref={setInputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        tabIndex={-1}
        disabled={isLoading}
        onChange={handleNativeFileChange}
      />
      {/* Explicit rear-camera capture for mobile "Take photo". */}
      <input
        id={`${inputId}-camera`}
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        tabIndex={-1}
        disabled={isLoading}
        onChange={handleNativeFileChange}
      />

      <ImageSearchTriggerButton
        buttonRef={triggerRef}
        onClick={handleTriggerClick}
        isLoading={isLoading}
        loadingLabel={resolvedLoadingLabel}
      />

      {!isMobile && dropdownOpen && searchShell
        ? createPortal(
            <ImageSearchDropdown
              isOpen={dropdownOpen}
              onClose={() => setDropdownOpen(false)}
              excludeRef={triggerRef}
              onFileSelect={(file) => {
                setDropdownOpen(false);
                onFileSelect({ target: { files: [file] } });
              }}
              onImageUrl={(url) => {
                setDropdownOpen(false);
                onImageUrl(url);
              }}
              isLoading={isLoading}
              inputId={`${inputId}-desktop`}
            />,
            searchShell
          )
        : null}

      {isMobile && mobileSheetOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="image-search-mobile-sheet" role="dialog" aria-modal="true" aria-label={t("search.imageSearchTitle")}>
              <button
                type="button"
                className="image-search-mobile-sheet__backdrop"
                aria-label={t("common.close")}
                onClick={() => setMobileSheetOpen(false)}
              />
              <div className="image-search-mobile-sheet__panel">
                <div className="image-search-mobile-sheet__handle" aria-hidden />
                <p className="image-search-mobile-sheet__title">{t("search.imageSearchMobileTitle")}</p>
                <button
                  type="button"
                  className="image-search-mobile-sheet__action"
                  disabled={isLoading}
                  onClick={() => openPicker("camera")}
                >
                  <span className="image-search-mobile-sheet__action-icon" aria-hidden>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M4 8h3l1.5-2h7L17 8h3a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
                      <circle cx="12" cy="14" r="3.25" stroke="currentColor" strokeWidth="1.75" />
                    </svg>
                  </span>
                  {t("search.takePhoto")}
                </button>
                <button
                  type="button"
                  className="image-search-mobile-sheet__action"
                  disabled={isLoading}
                  onClick={() => openPicker("gallery")}
                >
                  <span className="image-search-mobile-sheet__action-icon" aria-hidden>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
                      <circle cx="9" cy="10" r="1.75" fill="currentColor" />
                      <path d="M5.5 17.5l4.2-4.2a1 1 0 011.4 0L14 16.2l1.4-1.4a1 1 0 011.4 0l1.7 1.7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {t("search.chooseFromGallery")}
                </button>
                <button
                  type="button"
                  className="image-search-mobile-sheet__cancel"
                  onClick={() => setMobileSheetOpen(false)}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
