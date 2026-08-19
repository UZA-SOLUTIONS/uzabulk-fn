import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Autocomplete from "react-autocomplete";
import { toast } from "react-toastify";
import apiClient from "../../helpers/apiHelper";
import { uploadImageForSearchBar, buildSearchBarImageListingUrl, persistImageSearchPreview } from "../../helpers/imageSearchHelper";
import { PRODUCTS } from "../../helpers/urlHelper";
import {
    logger,
    buildProductDetailUrl,
    getProductImageUrl,
} from "../../helpers/commonHelper";
import ROUTES from "../../helpers/routesHelper";
import suggestionPlaceholder from "../../assets/images/default_name.webp";
import ImageSearchIcon from "./ImageSearchIcon";
import TranslatedProductName from "./TranslatedProductName";
import { rememberRecentSearch } from "../../helpers/recentSearchHelper";

const DEFAULT_MIN_CHARS = 2;
const DEFAULT_DEBOUNCE_MS = 220;
const SUGGESTION_CACHE_MAX = 80;
const SUGGESTION_CACHE_TTL_MS = 5 * 60 * 1000;

function pickAutocompleteList(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.results)) return res.results;
    return [];
}

export default function ProductSearch({
    category = "",
    callback = () => { },
    defaultValue = "",
    placeholder = "Search for Products Brands and more...",
    minChars = DEFAULT_MIN_CHARS,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    wrapperClassName = "",
    enableImageSearch = false,
    imageSearchInputId = "product-search-image-input",
}) {
    const { t } = useTranslation();
    const [value, setValue] = useState(defaultValue);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [imageSearchLoading, setImageSearchLoading] = useState(false);
    const cancelToken = useRef(null);
    const timeoutRef = useRef(null);
    const latestQueryKeyRef = useRef("");
    const suggestionCacheRef = useRef(new Map());
    const imageInputRef = useRef(null);

    const navigate = useNavigate();

    const openSuggestion = (item) => {
        const searchLabel = item?.name || item?.title || "";
        if (searchLabel) rememberRecentSearch(searchLabel);
        const path = buildProductDetailUrl(item);
        if (!path) return;
        const joiner = path.includes("?") ? "&" : "?";
        const url = `${path}${joiner}search=${encodeURIComponent(searchLabel)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const openSuggestionFromClick = (item, event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        openSuggestion(item);
    };

    const getCachedSuggestions = (key) => {
        const entry = suggestionCacheRef.current.get(key);
        if (!entry) return null;
        if (Date.now() - entry.ts > SUGGESTION_CACHE_TTL_MS) {
            suggestionCacheRef.current.delete(key);
            return null;
        }
        suggestionCacheRef.current.delete(key);
        suggestionCacheRef.current.set(key, entry);
        return entry.items || [];
    };

    const setCachedSuggestions = (key, list) => {
        suggestionCacheRef.current.set(key, { items: list, ts: Date.now() });
        while (suggestionCacheRef.current.size > SUGGESTION_CACHE_MAX) {
            const oldestKey = suggestionCacheRef.current.keys().next().value;
            suggestionCacheRef.current.delete(oldestKey);
        }
    };

    const handleSearch = ({ search, category }) => {
        logger("Autocomplete ::: ", { search, category });
        const trimmedSearch = String(search || "").trim();
        const normalizedCategory = String(category || "").trim();
        const cacheKey = `${trimmedSearch.toLowerCase()}::${normalizedCategory}`;
        const minLen = Math.max(1, Number(minChars) || DEFAULT_MIN_CHARS);

        if (trimmedSearch.length < minLen) {
            setItems([]);
            setIsLoading(false);
            latestQueryKeyRef.current = "";
            if (cancelToken.current) {
                cancelToken.current.abort();
            }
            clearTimeout(timeoutRef.current);
            return;
        }

        latestQueryKeyRef.current = cacheKey;

        const cached = getCachedSuggestions(cacheKey);
        if (cached) {
            setItems(cached);
            setIsLoading(false);
        } else {
            setItems([]);
            setIsLoading(true);
        }

        if (cancelToken.current) {
            cancelToken.current.abort();
        }
        clearTimeout(timeoutRef.current);

        const delay = Math.max(0, Number(debounceMs) || DEFAULT_DEBOUNCE_MS);
        timeoutRef.current = setTimeout(async () => {
            const inflightKey = cacheKey;
            cancelToken.current = new AbortController();

            try {
                const params = {
                    search: trimmedSearch,
                    limit: 15,
                    skip: 0,
                };
                if (normalizedCategory) {
                    params.category = normalizedCategory;
                }
                const res = await apiClient.get(PRODUCTS.SEARCH_AUTOCOMPLETE, {
                    params,
                    signal: cancelToken.current.signal,
                    suppressGlobalErrorToast: true,
                    timeout: 8000,
                });

                if (latestQueryKeyRef.current !== inflightKey) {
                    return;
                }

                const rawList = pickAutocompleteList(res);

                const nextItems = rawList
                    .map((item) => ({
                        ...item,
                        _suggestionImage: getProductImageUrl(item, ""),
                    }))
                    .filter((item) =>
                        !!(item?.name || item?.title || item?._id || item?.offerId)
                    );
                setCachedSuggestions(cacheKey, nextItems);
                setItems(nextItems);
                setIsLoading(false);
            } catch (error) {
                const isCanceledRequest = error?.code === "ERR_CANCELED"
                    || error?.name === "CanceledError"
                    || error?.name === "AbortError";
                if (isCanceledRequest) {
                    logger("Previous request canceled.");
                    return;
                }
                if (latestQueryKeyRef.current === inflightKey) {
                    setItems([]);
                    setIsLoading(false);
                    logger("Error during search autocomplete:", error);
                }
            }
        }, delay);
    };


    const handleSearchCall = ({ value, category }) => {
        callback({ search: value, category: category });
        handleSearch({ search: value, category: category });
    };

    const handleImageSearch = async (event) => {
        const file = event?.target?.files?.[0];
        if (!file) return;
        if (!file.type?.startsWith("image/")) {
            toast.error("Please choose an image file.");
            event.target.value = "";
            return;
        }

        setImageSearchLoading(true);
        let blobUrl = "";
        try {
            blobUrl = URL.createObjectURL(file);
            persistImageSearchPreview(blobUrl);
            const imageUrl = await uploadImageForSearchBar(file);
            persistImageSearchPreview(imageUrl);
            const params = buildSearchBarImageListingUrl({ imageUrl });
            navigate(`${ROUTES.PRODUCT_LISTING}?${params}`);
        } catch (error) {
            toast.error(error?.message || "Could not search by image. Try again.");
            console.error("Image search failed:", error);
        } finally {
            setImageSearchLoading(false);
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    };

    useEffect(() => {
        setValue(defaultValue);
    }, [defaultValue]);

    useEffect(() => {
        return () => {
            if (cancelToken.current) {
                cancelToken.current.abort();
            }
            clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <>
            <Autocomplete
            autoHighlight={false}
            selectOnBlur={false}
            getItemValue={(item) =>
                String(item?.name || item?.title || item?._id || "").trim()
            }
            shouldItemRender={() => true}
            items={items}
            renderMenu={(children) => {
                const count = Array.isArray(children) ? children.length : 0;
                const hasNoResults = !isLoading && count === 0 && value.trim().length >= Math.max(1, Number(minChars) || DEFAULT_MIN_CHARS);
                return (
                    <div
                        className={`search-suggestion-modal ${count ? "is-visible" : ""}`}
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            width: "100%",
                            marginTop: 4,
                            zIndex: 10050,
                            maxHeight: "min(52vh, 420px)",
                            overflowY: "auto",
                        }}
                    >
                        <div className="search-suggestion-header">Suggestions</div>
                        {isLoading ? (
                            <div className="search-suggestion-row">
                                <div className="search-suggestion-copy">
                                    <p className="search-suggestion-title mb-0">Searching...</p>
                                </div>
                            </div>
                        ) : null}
                        {hasNoResults ? (
                            <div className="search-suggestion-row">
                                <div className="search-suggestion-copy">
                                    <p className="search-suggestion-title mb-0">No products found</p>
                                </div>
                            </div>
                        ) : null}
                        <div className="search-suggestion-list">{children}</div>
                    </div>
                );
            }}
            renderItem={(item, isHighlighted) =>
                <div
                    key={item?._id || item?.id || item?.offerId || item?.name}
                    className={`search-suggestion-row ${isHighlighted ? "is-highlighted" : ""}`}
                    onMouseDown={(event) => openSuggestionFromClick(item, event)}
                >
                    <img
                        src={item?._suggestionImage || suggestionPlaceholder}
                        alt={item?.name || item?.title || "product"}
                        className="search-suggestion-thumb"
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                            if (event.currentTarget.dataset.fallbackApplied === "1") return;
                            event.currentTarget.dataset.fallbackApplied = "1";
                            event.currentTarget.src = suggestionPlaceholder;
                        }}
                    />
                    <div className="search-suggestion-copy">
                        <p className="search-suggestion-title">
                            <TranslatedProductName product={item} name={item?.title} />
                        </p>
                        <span className="search-suggestion-meta">
                            {item?.offerId
                                ? `Offer ID: ${item.offerId}`
                                : "View product details"}
                        </span>
                    </div>
                </div>
            }
            value={value}
            onChange={(e) => {
                setValue(e.target.value);
                handleSearchCall({ value: e.target.value, category });
            }}
            onSelect={(nextValue) => {
                setValue(nextValue);
                callback({ search: nextValue, category });
            }}
            inputProps={{
                placeholder,
                className: "form-control",
            }}
            wrapperProps={{
                className: ["auto-complete-input", wrapperClassName].filter(Boolean).join(" "),
            }}
            />
            {enableImageSearch ? (
                <label
                    className={`header-mockup-img-search product-search-image-btn${imageSearchLoading ? " is-loading" : ""}`}
                    htmlFor={imageSearchInputId}
                    title={imageSearchLoading ? t("search.scanningImage") : "Search by image"}
                    aria-busy={imageSearchLoading}
                >
                    <input
                        id={imageSearchInputId}
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="visually-hidden"
                        tabIndex={-1}
                        disabled={imageSearchLoading}
                        onChange={handleImageSearch}
                    />
                    <span className="header-mockup-img-search__icon">
                        <ImageSearchIcon />
                    </span>
                </label>
            ) : null}
        </>
    );
}
