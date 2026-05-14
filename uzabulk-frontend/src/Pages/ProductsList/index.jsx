import React, { useEffect, useMemo, useRef, useState } from "react";
import { Row, Col, Container } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import AbortController from "abort-controller";

import ProductsListingInfinite from "../../Components/Products/ProductsListingInfinite";
import { APP_NAME } from "../../config/constants";
import { smoothScrollToTop } from "../../helpers/commonHelper";
import ROUTES from "../../helpers/routesHelper";
import { apiGetCategories } from "../../store/categories/actions";
import { apiGetProductDetail, apiGetProducts } from "../../store/products/actions";
import { clearProductList } from "../../store/products/slice";

const Productlist = () => {
  let [searchParams, setSearchParams] = useSearchParams();

  const dispatch = useDispatch();
  const { currentCurrency } = useSelector(s => s.config);
  const level1Categories = useSelector((s) => s.categories.categories.level1 || []);
  const { detail } = useSelector((s) => s.products.productDetail);
  const { isLoading, items, hasMore, message, skip, others } = useSelector((s) => s.products.products);
  const cancelToken = useRef(null);
  const minPriceUserTouched = useRef(false);
  const maxPriceUserTouched = useRef(false);
  const [sidebarSearch, setSidebarSearch] = useState(searchParams.get("search") || "");
  const [selectedColor, setSelectedColor] = useState("all");
  const [minPriceValue, setMinPriceValue] = useState(0);
  const [maxPriceValue, setMaxPriceValue] = useState(0);

  const limit = 32;
  const selectedSort = searchParams.get("sort") || "relevance";
  const selectedCategory = searchParams.get("category");
  const COLOR_OPTIONS = ["black", "white", "red", "blue", "green", "yellow", "orange", "purple", "pink", "gray", "brown", "beige"];

  const getSortQuery = (sortValue) => {
    switch (sortValue) {
      case "newest":
        return { orderBy: "date_created_utc", order: -1 };
      case "oldest":
        return { orderBy: "date_created_utc", order: 1 };
      case "price_low_high":
        return { orderBy: "price", order: 1 };
      case "price_high_low":
        return { orderBy: "price", order: -1 };
      case "name_az":
        return { orderBy: "name.keyword", order: 1 };
      case "name_za":
        return { orderBy: "name.keyword", order: -1 };
      case "rating_high_low":
        return { orderBy: "average_rating", order: -1 };
      default:
        return {};
    }
  };

  const sortedItems = useMemo(() => {
    const source = [...(items || [])];
    switch (selectedSort) {
      case "newest":
        return source.sort((a, b) => new Date(b?.date_created_utc || 0) - new Date(a?.date_created_utc || 0));
      case "oldest":
        return source.sort((a, b) => new Date(a?.date_created_utc || 0) - new Date(b?.date_created_utc || 0));
      case "price_low_high":
        return source.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
      case "price_high_low":
        return source.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
      case "name_az":
        return source.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
      case "name_za":
        return source.sort((a, b) => String(b?.name || "").localeCompare(String(a?.name || "")));
      case "rating_high_low":
        return source.sort((a, b) => Number(b?.average_rating || 0) - Number(a?.average_rating || 0));
      default:
        return source;
    }
  }, [items, selectedSort]);

  const priceStats = useMemo(() => {
    const prices = sortedItems
      .map((item) => Number(item?.price || 0))
      .filter((value) => Number.isFinite(value));
    if (!prices.length) return { min: 0, max: 0 };
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [sortedItems]);

  useEffect(() => {
    setSidebarSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (!level1Categories?.length) {
      dispatch(apiGetCategories({ level: 1 }));
    }
  }, [dispatch, level1Categories?.length]);

  const priceFilterResetKey = `${searchParams.get("category") || ""}|${searchParams.get("search") || ""}|${selectedSort}`;

  useEffect(() => {
    minPriceUserTouched.current = false;
    maxPriceUserTouched.current = false;
  }, [priceFilterResetKey]);

  useEffect(() => {
    if (!minPriceUserTouched.current) {
      setMinPriceValue(priceStats.min);
    }
  }, [priceStats.min]);

  useEffect(() => {
    if (!maxPriceUserTouched.current) {
      setMaxPriceValue(priceStats.max);
    }
  }, [priceStats.max]);

  const detectedColors = useMemo(() => {
    const text = sortedItems
      .map((item) => {
        const attrText = Array.isArray(item?.attributes)
          ? item.attributes.map((attr) => `${attr?.name || ""} ${(attr?.terms || []).map((t) => t?.name || "").join(" ")}`).join(" ")
          : "";
        return `${item?.name || ""} ${attrText}`.toLowerCase();
      })
      .join(" ");
    return COLOR_OPTIONS.filter((color) => text.includes(color));
  }, [sortedItems]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      const price = Number(item?.price || 0);
      const name = String(item?.name || "").toLowerCase();
      const colorText = `${name} ${JSON.stringify(item?.attributes || [])}`.toLowerCase();
      const byPrice = price >= minPriceValue && price <= maxPriceValue;
      const byColor = selectedColor === "all" ? true : colorText.includes(selectedColor);
      const byName = sidebarSearch ? name.includes(sidebarSearch.toLowerCase()) : true;
      return byPrice && byColor && byName;
    });
  }, [sortedItems, minPriceValue, maxPriceValue, selectedColor, sidebarSearch]);

  const relatedCategories = useMemo(() => {
    return (level1Categories || []).filter((cat) => cat?._id !== selectedCategory).slice(0, 8);
  }, [level1Categories, selectedCategory]);

  const getRangeStyle = (value) => {
    const min = Number(priceStats.min || 0);
    const max = Number(priceStats.max || 0);
    const safeMax = max <= min ? min + 1 : max;
    const percent = ((Number(value || 0) - min) / (safeMax - min)) * 100;
    const clamped = Math.max(0, Math.min(100, percent));
    return {
      background: `linear-gradient(90deg, #F6A532 0%, #F6A532 ${clamped}%, #ececec ${clamped}%, #ececec 100%)`,
    };
  };


  const handleFetchRequest = async (init = false) => {
    if (!isLoading || init) {
      if (cancelToken?.current) {
        cancelToken.current.abort();
      }
      cancelToken.current = new AbortController();
      dispatch(apiGetProducts({
        query: {
          limit: limit,
          skip: init ? 1 : skip + 1,
          category: searchParams.get("category"),
          search: searchParams.get("search"),
          image: searchParams.get("image"),
          country: searchParams.get("country") || "en",
          ...getSortQuery(selectedSort),
        },
        signal: cancelToken.current.signal,
      }));
    }
  };

  useEffect(() => {
    if (searchParams) {
      smoothScrollToTop();
      dispatch(clearProductList("products"));
      handleFetchRequest(true);
    }
  }, [searchParams]);
  // }, [searchParams, currentCurrency?.code]);

  useEffect(() => {
    const topIds = searchParams.get("topIds");
    if (topIds) {
      dispatch(apiGetProductDetail({ id: topIds }));
    }
  }, [dispatch, searchParams]);

  const handleSortChange = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("sort", value);
    nextParams.set("skip", "1");
    setSearchParams(nextParams);
  };

  const handleSidebarSearchSubmit = (event) => {
    event.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    if (sidebarSearch?.trim()) {
      nextParams.set("search", sidebarSearch.trim());
    } else {
      nextParams.delete("search");
    }
    nextParams.set("skip", "1");
    setSearchParams(nextParams);
  };

  return (
    <div className="wrapList">
      <Helmet>
        <title>{APP_NAME} | Shop</title>
      </Helmet>
      <Container fluid>
        <Row>
          {others?.category?.catImage ? (
            <>
              <Col lg={12} className="mb-4">
                <div className="w-100 position-relative">
                  <img src={others?.category?.catImage} alt="category" style={
                    {
                      width: "100%",
                      height: "200px",
                      objectFit: "cover"
                    }
                  } />
                  <h3
                    className="products_list_category_title"
                    style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    color: "white",
                    WebkitTextStrokeColor: "#929292",
                    WebkitTextStrokeWidth: "thin",
                    fontWeight: 900,
                    fontSize: "clamp(22px, 6vw, 45px)",
                    textWrap: "balance",
                  }}
                  >{others?.category?.catName}</h3>
                </div>
              </Col>
            </>
          ) : null}
          <Col lg={2} md={4} sm={12} className="mb-3">
            <div className="products_sort_sidebar">
              <h6>Search in category</h6>
              <form onSubmit={handleSidebarSearchSubmit} className="products_sidebar_search mb-3">
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search products..."
                />
                <button type="submit">Go</button>
              </form>

              <h6>Sort by</h6>
              {[
                { value: "relevance", label: "Relevance" },
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "price_low_high", label: "Price: Low to High" },
                { value: "price_high_low", label: "Price: High to Low" },
                { value: "name_az", label: "Name: A to Z" },
                { value: "name_za", label: "Name: Z to A" },
                { value: "rating_high_low", label: "Top rated" },
              ].map((option) => (
                <label key={option.value} className="products_sort_option">
                  <input
                    type="radio"
                    name="products-sort"
                    value={option.value}
                    checked={selectedSort === option.value}
                    onChange={(e) => handleSortChange(e.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}

              <div className="products_sidebar_section">
                <h6>Price range</h6>
                <div className="price_range_values">
                  <small>Min: {currentCurrency?.symbol}{minPriceValue}</small>
                  <small>Max: {currentCurrency?.symbol}{maxPriceValue}</small>
                </div>
                <input
                  type="range"
                  min={priceStats.min}
                  max={priceStats.max || 1}
                  value={Math.min(minPriceValue, maxPriceValue)}
                  onChange={(e) => {
                    minPriceUserTouched.current = true;
                    setMinPriceValue(Math.min(Number(e.target.value), maxPriceValue));
                  }}
                  style={getRangeStyle(Math.min(minPriceValue, maxPriceValue))}
                />
                <input
                  type="range"
                  min={priceStats.min}
                  max={priceStats.max || 1}
                  value={Math.max(minPriceValue, maxPriceValue)}
                  onChange={(e) => {
                    maxPriceUserTouched.current = true;
                    setMaxPriceValue(Math.max(Number(e.target.value), minPriceValue));
                  }}
                  style={getRangeStyle(Math.max(minPriceValue, maxPriceValue))}
                />
              </div>

              {detectedColors.length ? (
                <div className="products_sidebar_section">
                  <h6>Color filter</h6>
                  <div className="products_color_swatches">
                    <button
                      type="button"
                      className={`color_swatch_btn ${selectedColor === "all" ? "active" : ""}`}
                      onClick={() => setSelectedColor("all")}
                      title="All colors"
                    >
                      All
                    </button>
                    {detectedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color_swatch_btn ${selectedColor === color ? "active" : ""}`}
                        onClick={() => setSelectedColor(color)}
                        title={color}
                        aria-label={color}
                      >
                        <span className="color_swatch_fill" style={{ backgroundColor: color }} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="products_sidebar_section">
                <h6>Related categories</h6>
                <div className="products_related_categories">
                  {relatedCategories.map((category) => (
                    <Link
                      key={category._id}
                      to={`${ROUTES.PRODUCT_LISTING}?category=${category._id}&name=${encodeURIComponent(category?.catName || "Category")}&sort=${selectedSort}`}
                    >
                      {category?.catName}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Col>
          <Col lg={10} md={8} sm={12}>
            <h5 className="all_product_head text-start mb-4">
              {searchParams.get("search")
                ? `Search for "${searchParams.get("search")}"`
                : (searchParams.get("imageName")
                  ? `Image search result for "${searchParams.get("imageName")}"`
                  : (searchParams.get("name") || "All Product List"))}
            </h5>
            <ProductsListingInfinite
              {...{
                items:
                  filteredItems?.length <= limit && detail
                    ? [
                      ...[
                        detail,
                        ...filteredItems?.filter((i) => i._id !== detail._id),
                      ],
                    ]
                    : filteredItems,
                isLoading,
                message,
                hasMore,
                fetchRecords: handleFetchRequest,
              }}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Productlist;
