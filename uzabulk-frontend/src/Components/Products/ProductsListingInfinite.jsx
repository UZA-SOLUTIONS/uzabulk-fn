import React from "react";
import { Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";

import LoadingContent from "../../Components/Common/LoadingContent";

import ROUTES from "../../helpers/routesHelper";
import { amountConversion, fromNow, getProductImageUrl } from "../../helpers/commonHelper";

import placeholder from "../../assets/images/gurfive.jpg";
import { getPendingQuantity } from "../../helpers/cartHelper";
import CommingSoon from "../Common/CommingSoon";
import { useSelector } from "react-redux";

const ProductsListingInfinite = ({
    items,
    isLoading,
    message = "",
    hasMore,
    fetchRecords,
}) => {
    const { currentCurrency } = useSelector(s => s.config);
    const appConfig = useSelector(s => s.config.data);

    return (
        <section className="products_card products_card_compact position-relative">
            {/* {isLoading ? <AbsoluteLoader className="rounded-2" /> : ""} */}
            <InfiniteScroll
                dataLength={items?.length || 0}
                next={fetchRecords}
                hasMore={hasMore}
                loader={(
                    <div className="px-0 uza-infinite-scroll">
                        <LoadingContent />
                    </div>
                )}
                endMessage={""}
                className="px-3"
            >

                <Row className="products_compact_row">
                    {items?.length ? (
                        items?.map((item, idx) => {
                            const pendingQty = getPendingQuantity(item);
                            const resolvedId = String(
                                item?._id || item?.id || item?.productId || item?.offerId || item?.topIds || ""
                            ).trim();
                            const productLink = resolvedId
                                ? `${ROUTES.PRODUCT_DETAIL}/${encodeURIComponent(resolvedId)}?redirectUrl=${btoa(window.location.href)}`
                                : "";
                            return (
                                <Col xl={2} lg={3} md={4} sm={6} xs={6} key={idx}>
                                    <div className="card_comnon-product cursor-pointer h-100" >
                                        <Link target="_blank" to={productLink || "#"} className="card_comnon-product cursor-pointer" style={{
                                            textDecoration: "none",
                                            color: "black",
                                            pointerEvents: productLink ? "auto" : "none",
                                            opacity: productLink ? 1 : 0.6,
                                        }}    >
                                            <div className="card_item_Show position-relative">
                                                <img
                                                    src={getProductImageUrl(item, placeholder)}
                                                    alt=""
                                                    className="img-fluid"
                                                />
                                                {((!item?.manage_stock && item.stock_status === "outofstock") || (item?.manage_stock && item.stock_quantity === 0)) ? <p style={{
                                                    top: "-12px",
                                                    right: "-10px",
                                                }} className="out-of-stock position-absolute">Out of stock</p> : null}
                                            </div>
                                            <div className="card_content_list">
                                                <div className="upper_head text-start w-100">
                                                    <div className="d-flex justify-content-between flex-wrap">
                                                        {fromNow(item.date_created_utc) <= 90 ? (
                                                            <p className="text-danger">
                                                                Listed in last {fromNow(item.date_created_utc)} days
                                                            </p>
                                                        ) : (
                                                            ""
                                                        )}


                                                        {pendingQty > 0 && pendingQty <= 10 ? <p className="text-secondary">{pendingQty <= 5 ? `${pendingQty} items left` : pendingQty <= 10 ? "Few left" : ""}</p> : null}
                                                    </div>
                                                    <h5>{item?.name}</h5>
                                                    {/* <p>{item?.short_description?.length >= 250 ? item?.short_description.substring(0, 245) + '...' : item?.short_description}</p> */}
                                                </div>

                                                <div className="products_ist d-flex justify-content-between align-items-center mt-3">
                                                    <p>
                                                        {currentCurrency?.symbol} {amountConversion(item?.price, appConfig)}
                                                    </p>
                                                    {/* <Button className="buy_now_btn" onClick={() => navigate(`${ROUTES.PRODUCT_DETAIL}/${item._id}`)}>Buy Now</Button> */}
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                </Col>
                            );
                        })
                    ) : isLoading ? "" : (
                        <CommingSoon message={message} />
                    )}
                </Row>
            </InfiniteScroll>
        </section>
    );
};

export default ProductsListingInfinite;
