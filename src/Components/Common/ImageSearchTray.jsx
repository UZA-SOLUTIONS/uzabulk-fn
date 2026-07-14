import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import ImageSearchDropdown, { ImageSearchTriggerButton } from "./ImageSearchDropdown";

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
    const triggerRef = useRef(null);
    const resolvedLoadingLabel = loadingLabel || t("search.scanningImage");

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

    const searchShell = inputRef?.current?.closest?.(".header-mockup-search-shell")
        || document.querySelector(".header-mockup-search-shell");

    return (
        <div className="header-mockup-img-search-wrap">
            <ImageSearchTriggerButton
                buttonRef={triggerRef}
                onClick={() => setDropdownOpen((open) => !open)}
                isLoading={isLoading}
                loadingLabel={resolvedLoadingLabel}
            />
            {dropdownOpen && searchShell
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
                        inputId={inputId}
                        inputRef={inputRef}
                    />,
                    searchShell
                )
                : null}
        </div>
    );
}
