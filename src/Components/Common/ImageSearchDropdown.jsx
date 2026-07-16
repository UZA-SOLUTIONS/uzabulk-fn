import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ImageSearchIcon from "./ImageSearchIcon";
import { readImageFromClipboard } from "../../helpers/imageSearchHelper";

const UPLOAD_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

export default function ImageSearchDropdown({
  isOpen = false,
  onClose = () => {},
  onFileSelect = () => {},
  onImageUrl = () => {},
  isLoading = false,
  inputId = "image-search-dropdown-input",
  inputRef = null,
  excludeRef = null,
}) {
  const { t } = useTranslation();
  const panelRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (excludeRef?.current?.contains(event.target)) return;
      onClose();
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    // pointerdown (not mousedown) so touch outside-close doesn't race the file picker.
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, excludeRef]);

  const handlePaste = (event) => {
    const payload = readImageFromClipboard(event);
    if (!payload) return;
    event.preventDefault();
    onClose();
    if (payload.type === "file") {
      onFileSelect(payload.file);
      return;
    }
    if (payload.type === "url") {
      onImageUrl(payload.imageUrl);
    }
  };

  const handleFileInput = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;
    onClose();
    onFileSelect(file);
    if (inputRef?.current) inputRef.current.value = "";
    else if (event.target) event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file?.type?.startsWith("image/")) return;
    onClose();
    onFileSelect(file);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="image-search-dropdown"
      role="dialog"
      aria-modal="false"
      aria-label={t("search.imageSearchTitle")}
      onPaste={handlePaste}
    >
      <div className="image-search-dropdown__header">
        <h2 className="image-search-dropdown__title">{t("search.imageSearchTitle")}</h2>
        <button
          type="button"
          className="image-search-dropdown__close"
          onClick={onClose}
          aria-label={t("search.closeImageSearch")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        className={`image-search-dropdown__dropzone${isDragging ? " is-dragging" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="image-search-dropdown__icon">{UPLOAD_ICON}</div>
        <p className="image-search-dropdown__paste-hint">
          {t("search.pasteImageHint")}{" "}
          <kbd>Ctrl</kbd> <kbd>V</kbd>
        </p>
        <p className="image-search-dropdown__drop-hint">{t("search.dragDropHint")}</p>
        <label
          htmlFor={inputId}
          className={`image-search-dropdown__upload-btn${isLoading ? " is-disabled" : ""}`}
        >
          {t("search.uploadImage")}
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            tabIndex={-1}
            disabled={isLoading}
            onChange={handleFileInput}
          />
        </label>
      </div>
    </div>
  );
}

export function ImageSearchTriggerButton({
  onClick = () => {},
  isLoading = false,
  loadingLabel = "Loading",
  title = "Search by image",
  buttonRef = null,
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`header-mockup-img-search${isLoading ? " is-loading" : ""}`}
      onClick={onClick}
      disabled={isLoading}
      title={isLoading ? loadingLabel : title}
      aria-busy={isLoading}
      aria-haspopup="dialog"
    >
      {isLoading ? (
        <span className="header-mockup-img-search__spinner header-mockup-img-search__spinner--solo" aria-hidden />
      ) : (
        <span className="header-mockup-img-search__icon">
          <ImageSearchIcon />
        </span>
      )}
    </button>
  );
}
