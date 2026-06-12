import ImageSearchIcon from "./ImageSearchIcon";

export default function ImageSearchTray({
    previewUrl = "",
    isLoading = false,
    loadingLabel = "Analyzing image…",
    inputId = "header-mockup-image-search-input",
    inputRef = null,
    onFileSelect = () => {},
    onClear = () => {},
}) {
    if (previewUrl) {
        return (
            <div
                className={`header-mockup-img-search header-mockup-img-search--preview${isLoading ? " is-loading" : ""}`}
                title={isLoading ? loadingLabel : "Image search active"}
                aria-busy={isLoading}
            >
                <img
                    src={previewUrl}
                    alt=""
                    className="header-mockup-img-search__thumb"
                    decoding="async"
                />
                {isLoading ? (
                    <div className="header-mockup-img-search__loading" aria-live="polite" aria-label={loadingLabel}>
                        <span className="header-mockup-img-search__spinner" aria-hidden />
                    </div>
                ) : null}
                <button
                    type="button"
                    className="header-mockup-img-search__clear"
                    onClick={onClear}
                    disabled={isLoading}
                    aria-label="Clear image search"
                    title="Clear image search"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <label
            className={`header-mockup-img-search${isLoading ? " is-loading" : ""}`}
            htmlFor={inputId}
            title={isLoading ? loadingLabel : "Search by image (paste or upload)"}
            aria-busy={isLoading}
        >
            <input
                id={inputId}
                ref={inputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                tabIndex={-1}
                disabled={isLoading}
                onChange={onFileSelect}
            />
            {isLoading ? (
                <span className="header-mockup-img-search__spinner header-mockup-img-search__spinner--solo" aria-hidden />
            ) : (
                <span className="header-mockup-img-search__icon">
                    <ImageSearchIcon />
                </span>
            )}
        </label>
    );
}
