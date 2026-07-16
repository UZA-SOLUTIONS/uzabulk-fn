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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MQ).matches : false
  );
  const triggerRef = useRef(null);
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

  const setInputRef = (node) => {
    localInputRef.current = node;
    if (!inputRef) return;
    if (typeof inputRef === "function") inputRef(node);
    else inputRef.current = node;
  };

  const openNativePicker = () => {
    const input = localInputRef.current;
    if (!input || isLoading) return;
    // Reset so picking the same file again still fires change.
    input.value = "";
    input.click();
  };

  const handleNativeFileChange = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    onFileSelect(event);
    if (localInputRef.current) localInputRef.current.value = "";
  };

  const handleTriggerClick = () => {
    if (isLoading) return;
    // Mobile: open camera/gallery immediately — dropdown paste/drag UI is desktop-only
    // and gets clipped / closed by touch outside-click before the file dialog opens.
    if (isMobile) {
      openNativePicker();
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
      {/* Always mounted so mobile can open the picker synchronously on icon tap. */}
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
    </div>
  );
}
