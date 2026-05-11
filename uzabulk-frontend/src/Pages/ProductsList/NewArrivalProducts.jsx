import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Container } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import ProductsListingInfinite from "../../Components/Products/ProductsListingInfinite";
import { APP_NAME } from "../../config/constants";
import { smoothScrollToTop } from "../../helpers/commonHelper";
import { apiGetNewArrivalProducts, apiGetProductDetail } from "../../store/products/actions";
import { clearProductList } from "../../store/products/slice";

const NewArrivalProducts = () => {
  let [searchParams, setSearchParams] = useSearchParams();

  const dispatch = useDispatch();
  const { detail } = useSelector((s) => s.products.productDetail);
  const { isLoading, items, hasMore, message, skip } = useSelector((s) => s.products.newArrivalProducts);

  const limit = 32;
  const [sidebarSearch, setSidebarSearch] = useState(searchParams.get("search") || "");

  const normalizeText = (value = "") =>
    String(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  useEffect(() => {
    setSidebarSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const fetchRecords = (init = false) => {
    dispatch(
      apiGetNewArrivalProducts({
        limit: limit,
        skip: init ? 1 : skip + 1,
        search: searchParams.get("search"),
      })
    );
  };

  useEffect(() => {
    smoothScrollToTop();
    dispatch(clearProductList("newArrivalProducts"));
    fetchRecords(true);
  }, [searchParams]);

  useEffect(() => {
    const topIds = searchParams.get("topIds");
    if (topIds) {
      dispatch(apiGetProductDetail({ id: topIds }));
    }
  }, [dispatch, searchParams]);

  useEffect(() => {
    const topIds = searchParams.get("topIds");
    const currentSearch = searchParams.get("search");
    if (!topIds || !detail?.name || currentSearch) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("search", detail.name);
    nextParams.delete("category");
    nextParams.set("skip", "1");
    setSearchParams(nextParams);
  }, [detail, searchParams, setSearchParams]);

  const filteredItems = useMemo(() => {
    const search = normalizeText(searchParams.get("search") || "");
    if (!search) return items || [];

    const tokens = search.split(" ").filter(Boolean);
    if (!tokens.length) return items || [];

    return (items || []).filter((item) => {
      const searchable = normalizeText(
        [item?.name, item?.sku, item?.slug, item?.short_description]
          .filter(Boolean)
          .join(" ")
      );
      return tokens.every((token) => searchable.includes(token));
    });
  }, [items, searchParams]);

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
          <Col lg={2} md={4} sm={12} className="mb-3">
            <div className="products_sort_sidebar">
              <h6>Search products</h6>
              <form onSubmit={handleSidebarSearchSubmit} className="products_sidebar_search mb-3">
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search products..."
                />
                <button type="submit">Go</button>
              </form>
            </div>
          </Col>
          <Col lg={10} md={8} sm={12}>
            <h5 className="all_product_head text-start mb-4">
              {searchParams.get("search")
                ? `Search for "${searchParams.get("search")}"`
                : "New Arrival Products"}
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
                fetchRecords,
              }}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default NewArrivalProducts;
