import React, { useEffect, useMemo } from "react";
import { Row, Col, Container } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";

import ProductsListingInfinite from "../../Components/Products/ProductsListingInfinite";
import { APP_NAME } from "../../config/constants";
import { getHomeFeedRefreshToken, smoothScrollToTop } from "../../helpers/commonHelper";
import { apiGetNewArrivalProducts, apiGetProductDetail } from "../../store/products/actions";
import { clearProductList } from "../../store/products/slice";

const NewArrivalProducts = () => {
  const [searchParams] = useSearchParams();

  const dispatch = useDispatch();
  const { detail } = useSelector((s) => s.products.productDetail);
  const { isLoading, items, hasMore, message, skip } = useSelector((s) => s.products.newArrivalProducts);

  const limit = 32;

  const normalizeText = (value = "") =>
    String(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const fetchRecords = (init = false) => {
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const query = {
      limit: limit,
      skip: init ? 1 : skip + 1,
      ...(search ? { search } : {}),
    };
    if (!search && !category) {
      query.refresh = getHomeFeedRefreshToken();
    }
    dispatch(apiGetNewArrivalProducts(query));
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

  const gridItems =
    filteredItems?.length <= limit && detail
      ? [detail, ...filteredItems?.filter((i) => i._id !== detail._id)]
      : filteredItems;

  return (
    <div className="wrapList">
      <Helmet>
        <title>{APP_NAME} | Hot Deals</title>
      </Helmet>
      <Container fluid>
        <Row>
          <Col lg={12} md={12} sm={12}>
            {searchParams.get("search") ? (
              <h5 className="all_product_head text-start mb-4">
                {`Search for "${searchParams.get("search")}"`}
              </h5>
            ) : null}
            <ProductsListingInfinite
              items={gridItems}
              isLoading={isLoading}
              message={message}
              hasMore={hasMore}
              fetchRecords={fetchRecords}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default NewArrivalProducts;
