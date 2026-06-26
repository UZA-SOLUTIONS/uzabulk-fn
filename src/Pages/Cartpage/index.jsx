import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Form } from "reactstrap";
import { useTranslation } from "react-i18next";

import ROUTES from "../../helpers/routesHelper";
import { APP_NAME } from "../../config/constants";
import { formatNumber } from "../../helpers/commonHelper";
import { getCheckoutErrorMessage, getCouponDiscount, manageCartQuantity } from "../../helpers/cartHelper";

import EmptyCart from "./EmptyCart";
import AddToCart from "../../Components/Common/AddToCart";
import BlockContent from "../../Components/Common/BlockContent";
import Addressslemod from "../../Components/Modals/Addressslemod";
import { ApplyCoupon } from "../../Components/Common/ApplyCoupon";
import LoadingContent from "../../Components/Common/LoadingContent";

import { apiCheckout } from "../../store/order/actions";
import { removeOrderDetails } from "../../store/order/slice";
import { apiGetCartList, apiUpdateCart } from "../../store/cart/actions";
import { clearSelectedCart, setCouponCode } from "../../store/cart/slice";

import placeholder from "../../assets/images/sousix.jpg";
import ICON_TRASH from "../../assets/images/icon-trash.svg";
import TranslatedProductName from "../../Components/Common/TranslatedProductName";

const Cartpage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { currentCurrency } = useSelector(s => s.config);
  const { cartCoupon, cartList, isLoading } = useSelector((s) => s.cart);
  const { orderDetails, message } = useSelector((s) => s.order);
  const loadingOrder = useSelector((s) => s.order.isLoading);
  const shippingAddress = useSelector((s) => s.address.shippingAddress.detail);

  const [delId, setDelId] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);

  const navigate = useNavigate();

  const selectedCartList = () => {
    return cartList.map((c) => c._id);
  }


  const handleCheckout = (coupon = "", callback = (res) => {
    if (res.status === "success" && !res.data?.couponError) {
      dispatch(setCouponCode(res.data?.coupon));
    }
    else {
      dispatch(setCouponCode());
    }
  }) => {
    const ids = selectedCartList();
    if (ids?.length) {
      let data = {
        cart_ids: ids,
        shipping_address: shippingAddress?._id,
      };

      if (!!coupon) data.coupon = coupon;

      dispatch(
        apiCheckout({
          data,
          callback,
        })
      );
    }
    else {
      dispatch(removeOrderDetails());
    }

  };

  useEffect(() => {
    dispatch(apiGetCartList({}));

    return () => {
      dispatch(clearSelectedCart());
    }
  }, [dispatch]);
  // }, [dispatch, currentCurrency?.code]);

  useEffect(() => {
    if (!isLoading) {
      handleCheckout(cartCoupon || "");
    }
  }, [cartList, isLoading]);
  return (
    <section className="cart_view py-5">
      <Addressslemod
        show={showAddressModal}
        onhide={() => setShowAddressModal(false)}
      />
      <Helmet>
        <title>{APP_NAME} | {t("cart.title")}</title>
      </Helmet>
      <Container>
        <Row>
          <Col lg="12" className="text-start">
            <h2 className="fw-bold mt-0 mb-4">{t("cart.title")}</h2>
          </Col>
        </Row>
        {cartList?.length ? (
          <Row>
            <Col lg={8} md={6} sm={12}>
              <Row>
                {cartList.map((cart, index) => {
                  const checkoutMessage = getCheckoutErrorMessage({ cart, orderDetails, index });
                  return (
                    <Col key={index} lg={12} className="my-2">
                      <div className="catpage_preview text-start pe-0 pe-lg-4 position-relative">

                        {(cart?.isLoading || cart._id === delId) && <BlockContent className="rounded rounded-4" />}

                        {cart?.items?.map((item, idx) => {
                          return (
                            <div className="productd_wrap mb-2" key={idx}>
                              <div className="productimmg_side w-25">
                                <div className="product_img me-lg-4 me-3">
                                  <img
                                    src={cart?.product?.featured_image || placeholder}
                                    alt=""
                                    className="img-fluid cursor-pointer"
                                    onClick={() => {
                                      navigate(
                                        ROUTES.PRODUCT_DETAIL +
                                        "/" +
                                        cart?.product?._id
                                      );
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="d-flex justify-content-between gap-4 w-75">
                                <div>
                                  <div>
                                    <h2 className="fs-6 mb-0">
                                      <span className="cursor-pointer" onClick={() => {
                                        navigate(
                                          ROUTES.PRODUCT_DETAIL +
                                          "/" +
                                          cart?.product?._id
                                        );
                                      }}><TranslatedProductName product={cart.product} /></span>
                                      <p className="text-success fs-xs mb-1">
                                        {getCouponDiscount({
                                          orderDetails,
                                          cart,
                                          cartItem: item,
                                        })}
                                      </p>
                                    </h2>

                                    <div className="counter_div d-flex align-items-center gap-3">
                                      <p className="fw-light mb-0 fs-xs">{t("cart.quantity")}</p>
                                      <AddToCart
                                        className="fs-base"
                                        value={item.quantity}
                                        min={0}
                                        onChange={(value) => {
                                          manageCartQuantity({
                                            cartList,
                                            cartListIndex: index,
                                            cart,
                                            cartIndex: idx,
                                            dispatch,
                                            increase: true,
                                            setValue: Math.max(
                                              parseInt(value),
                                              0
                                            ),
                                          });
                                        }}
                                        onDecrement={() =>
                                          manageCartQuantity({
                                            cartList,
                                            cartListIndex: index,
                                            cart,
                                            cartIndex: idx,
                                            dispatch,
                                            increase: false,
                                          })
                                        }
                                        onIncrement={() => {
                                          manageCartQuantity({
                                            cartList,
                                            cartListIndex: index,
                                            cart,
                                            cartIndex: idx,
                                            dispatch,
                                            increase: true,
                                          });
                                        }}
                                      />
                                    </div>

                                    {item?.attributes?.map((attribute) => (
                                      <p className="fw-light fs-xs fst-italic mb-0">
                                        {attribute.attrName}. {attribute.attrValue}
                                      </p>
                                    ))}
                                  </div>
                                </div>

                                <div className="d-flex flex-column align-items-end">

                                  <Button className="trash-button border-0 mb-3"
                                    onClick={() => {
                                      setDelId(cart._id);
                                      dispatch(
                                        apiUpdateCart({
                                          id: cart._id,
                                          data: {
                                            operateType: "MANUAL_DELETED",
                                            items: [
                                              {
                                                _id: item._id,
                                              },
                                            ],
                                          },
                                        })
                                      ).then(() => {
                                        setDelId("");
                                      })
                                    }}>
                                    <img width={15} height={15} src={ICON_TRASH} alt={t("cart.removeItem")} />
                                  </Button>

                                  <h2 className="mb-0 text-primary fs-6 text-nowrap"><small className="fw-light fs-xs fst-italic mb-0 me-3">({t("cart.unitPrice")})</small> {currentCurrency?.symbol} {formatNumber(item.unitPrice)}</h2>
                                  <h2 className="mb-0 text-primary fs-6 text-nowrap"><small className="fw-light fs-xs fst-italic mb-0 me-3">({t("cart.subTotalWithQty", { qty: item.quantity })})</small> {currentCurrency?.symbol} {formatNumber(item.amount)}</h2>
                                  <p className="fw-light fs-base fst-italic mb-0 text-end text-nowrap">({t("cart.priceInclTax")})</p>

                                  <small className="fw-light fs-xs fst-italic mb-0 text-end mt-3 text-danger">{item?.message || ''}</small>

                                </div>

                              </div>
                            </div>
                          );
                        })}

                        {!!checkoutMessage ? (
                          <div className="d-flex align-items-center justify-content-between gap-10 flex-wrap">
                            <p className="text-danger text-start mb-0 ">{checkoutMessage}</p>
                          </div>
                        ) : null}

                      </div>

                    </Col>
                  );
                })}
              </Row>
            </Col>

            <Col lg={4} md={6} sm={12}>
              <div className="calculating_shiiping" >
                <ApplyCoupon
                  handleCheckout={handleCheckout}
                />

                <Form>
                  <div className="car_total mt-3 text-start position-relative overflow-hidden">
                    {loadingOrder && <BlockContent />}
                    <h5>{t("cart.priceDetails")}</h5>
                    <p className="text-danger">{message}</p>
                    <ul className="p-0">
                      <li>
                        <p>{t("cart.totalItems")}</p>
                        <p>{formatNumber(orderDetails?.totalItems || 0)}</p>
                      </li>
                      {orderDetails ? (
                        <>
                          <li>
                            <p>{t("cart.subTotal")}</p>
                            <p>{currentCurrency?.symbol} {formatNumber(orderDetails?.subTotal || 0)}</p>
                          </li>
                          <li>
                            <p>{t("cart.taxAmount", { percent: orderDetails.taxAmount })}</p>
                            <p>{currentCurrency?.symbol} {formatNumber(orderDetails?.tax || 0)}</p>
                          </li>
                          {orderDetails?.coupon ? (
                            <li>
                              <p>{t("cart.couponDiscount")}</p>
                              <p className="text-success">-{currentCurrency?.symbol} {formatNumber(orderDetails.couponAmount)}</p>
                            </li>
                          ) : null}
                        </>
                      ) : null}
                      <li>
                        <p className="fs-6 fw-medium mt-3">{t("cart.totalAmount")}</p>
                        <p className="fs-6 fw-medium mt-3">
                          {currentCurrency?.symbol} {formatNumber(orderDetails?.orderTotal || 0)}
                        </p>
                      </li>
                    </ul>

                    <div className="px-2.5">
                      <Button
                        className="apply_btn w-100"
                        onClick={() => {
                          navigate(ROUTES.CHECKOUT)
                        }}
                      >
                        {t("cart.checkout")}
                      </Button>
                    </div>
                  </div>
                </Form>
              </div>
            </Col>
          </Row>
        ) : isLoading ? (
          <LoadingContent />
        ) : (
          <EmptyCart />
        )}
      </Container>
    </section>
  );
};

export default Cartpage;