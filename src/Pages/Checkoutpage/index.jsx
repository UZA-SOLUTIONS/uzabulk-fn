import React, { useEffect, useRef, useState } from "react";
import { Button } from "reactstrap";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import Dropzone from "react-dropzone";

import LoginPopup from "../../Components/LoginPopup";
import AddToCart from "../../Components/Common/AddToCart";
import RenderAddress from "../../Components/Common/RenderAddress";
import AddAddressModal from "../../Components/Modals/AddAddressModal";
import SimilarProductsRow from "../../Components/Products/SimilarProductsRow";
import TranslatedProductName from "../../Components/Common/TranslatedProductName";
import AbsoluteLoader from "../../Components/Common/AbsoluteLoader";

import ROUTES from "../../helpers/routesHelper";
import apiClient from "../../helpers/apiHelper";
import { FILE } from "../../helpers/urlHelper";
import { formatNumber, getProductImageUrl } from "../../helpers/commonHelper";
import {
  getCartLineMinQuantity,
  getCheckoutErrorMessage,
  getCouponDiscount,
  isReadyToPlaceOrder,
  manageCartQuantity,
} from "../../helpers/cartHelper";
import { ICON_PDF } from "../../assets/svg";

import { removeOrderDetails } from "../../store/order/slice";
import { apiGetAddresses } from "../../store/address/actions";
import { apiCheckout, apiPlaceOrder } from "../../store/order/actions";
import { setCouponCode, updateCartList } from "../../store/cart/slice";
import { apiGetCartCount, apiGetCartList } from "../../store/cart/actions";
import { setBillingAddress, setDefaultAddress, setShippingAddress } from "../../store/address/slice";

import placeholder from "../../assets/images/sousix.jpg";
import ButtonLoader from "../../Components/Common/ButtonLoader";

const Checkoutpage = () => {
  const dispatch = useDispatch();
  const { currentCurrency } = useSelector(s => s.config);
  const { isLogin } = useSelector(s => s.auth);
  const { cartCoupon, cartList, isLoading } = useSelector((s) => s.cart);
  const { orderDetails } = useSelector((s) => s.order);
  const isLoadingOrder = useSelector((s) => s.order.isLoading);
  const shippingAddress = useSelector((s) => s.address.shippingAddress.detail);
  const billingAddress = useSelector((s) => s.address.billingAddress.detail);
  const addressList = useSelector((s) => s.address.addresses.items);

  const [termAndConditions, setTermAndConditions] = useState(false);
  const [addressEditId, setAddressEditId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [activeKey, setActiveKey] = useState("0");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentSlipUrl, setPaymentSlipUrl] = useState("");
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const checkoutAbortRef = useRef(null);
  const checkoutTimerRef = useRef(null);

  const navigate = useNavigate();
  const step = isLogin ? Number(activeKey) || 0 : -1;

  const CHECKOUT_STEPS = [
    { key: "0", label: "Address" },
    { key: "1", label: "Payment" },
    { key: "2", label: "Review" },
  ];

  const selectCheckoutAddress = (address) => {
    dispatch(setBillingAddress(address));
    dispatch(setShippingAddress(address));
  };

  const goNext = () => {
    if (!isLogin) {
      setShowLoginPopup(true);
      return;
    }
    if (step === 0) {
      if (!billingAddress?._id && !shippingAddress?._id) {
        toast.error("Please select or add an address.");
        return;
      }
      // Keep billing and shipping in sync for this single-address flow.
      const selected = billingAddress?._id ? billingAddress : shippingAddress;
      if (selected) selectCheckoutAddress(selected);
      setActiveKey("1");
      return;
    }
    if (step === 1) {
      if (!termAndConditions) {
        toast.error("Please accept the terms and conditions.");
        return;
      }
      if (!paymentSlipUrl) {
        toast.error("Please upload your payment receipt.");
        return;
      }
      setActiveKey("2");
    }
  };

  const goBack = () => {
    if (step <= 0) return;
    setActiveKey(String(step - 1));
  };

  const handlePaymentSlipUpload = async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length !== 1) {
      toast.warning("Please select a single receipt (JPG, PNG, or PDF).");
      return;
    }

    setIsUploadingSlip(true);
    const formData = new FormData();
    formData.append("file", acceptedFiles[0]);

    try {
      const res = await apiClient.post(FILE.ADD, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.status === "success" && res.data?.link) {
        setPaymentSlipUrl(res.data.link);
        toast.success("Payment receipt uploaded.");
      } else {
        toast.error(res.message || "Could not upload receipt. Try again.");
      }
    } catch (error) {
      console.error("Payment slip upload failed:", error);
      toast.error("Could not upload receipt. Try again.");
    } finally {
      setIsUploadingSlip(false);
    }
  };

  const clearPaymentSlip = () => {
    setPaymentSlipUrl("");
  };

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
    if (!ids.length) {
      dispatch(removeOrderDetails());
      return;
    }

    const data = {
      cart_ids: ids,
    };
    if (shippingAddress?._id) data.shipping_address = shippingAddress._id;
    if (billingAddress?._id) data.billing_address = billingAddress._id;
    if (coupon) data.coupon = coupon;

    if (checkoutAbortRef.current) checkoutAbortRef.current.abort();
    const ac = new AbortController();
    checkoutAbortRef.current = ac;

    dispatch(
      apiCheckout({
        data,
        callback,
        signal: ac.signal,
      })
    );
  };

  const handlePlaceOrder = () => {
    const selectedAddress = billingAddress?._id ? billingAddress : shippingAddress;
    if (!selectedAddress?._id) {
      toast.error("Please add an address.");
      return;
    }
    if (billingAddress?._id !== shippingAddress?._id) {
      selectCheckoutAddress(selectedAddress);
    }
    setIsPlacingOrder(true);
    const data = {
      cart_ids: selectedCartList(),
      shipping_address: selectedAddress._id,
      billing_address: selectedAddress._id,
      paymentMethod: "bank_transfer",
    };
    if (orderDetails?.coupon) {
      data.coupon = orderDetails.coupon;
    }
    if (paymentSlipUrl) {
      data.slipLink = paymentSlipUrl;
    }
    dispatch(
      apiPlaceOrder({
        data,
        callback: (res) => {
          navigate(ROUTES.CONGRATULATION, {
            state: {
              order: res.data,
              slipUploaded: Boolean(paymentSlipUrl),
            },
          });
        },
      })
    ).then(() => setIsPlacingOrder(false));
  }

  useEffect(() => {
    dispatch(apiGetCartList({ callback: (res) => !res?.data?.length ? navigate(ROUTES.CART) : '' }));
    dispatch(apiGetCartCount());

    if (isLogin)
      dispatch(
        apiGetAddresses({
          limit: 100,
          skip: 1,
        })
      );

    return () => {
      dispatch(setShippingAddress(null));
      dispatch(setBillingAddress(null));
      dispatch(apiGetCartCount());
    };
  }, [dispatch, isLogin]);

  useEffect(() => {
    if (!isLogin || !addressList.length) return;
    const selectedId = String(billingAddress?._id || shippingAddress?._id || "");
    const stillValid = selectedId
      && addressList.some((address) => String(address?._id) === selectedId);
    // Always default to the first/default saved address when none is selected yet.
    if (!stillValid) {
      dispatch(setDefaultAddress());
    }
  }, [addressList, shippingAddress?._id, billingAddress?._id, isLogin, dispatch]);

  useEffect(() => {
    if (checkoutTimerRef.current) window.clearTimeout(checkoutTimerRef.current);

    if (!isLoading && cartList.length) {
      checkoutTimerRef.current = window.setTimeout(() => {
        handleCheckout(cartCoupon || "");
      }, 250);
      return () => {
        if (checkoutTimerRef.current) window.clearTimeout(checkoutTimerRef.current);
      };
    }
    // Keep existing totals while cart is loading; only clear when cart is empty.
    if (!isLoading && !cartList.length) {
      dispatch(removeOrderDetails());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when cart or address selection changes
  }, [cartList, isLoading, shippingAddress?._id, billingAddress?._id, cartCoupon, dispatch]);

  useEffect(() => {
    return () => {
      if (checkoutAbortRef.current) checkoutAbortRef.current.abort();
      if (checkoutTimerRef.current) window.clearTimeout(checkoutTimerRef.current);
      dispatch(updateCartList([]));
      dispatch(apiGetCartCount());
      dispatch(setCouponCode());
    }
  }, []);

  const cartFallbackSubtotal = cartList.reduce(
    (sum, cart) => sum + (cart.items || []).reduce(
      (lineSum, item) => lineSum + (Number(item.amount) || (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)),
      0
    ),
    0
  );
  const cartFallbackItems = cartList.reduce(
    (sum, cart) => sum + (cart.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0),
    0
  );
  const displaySubTotal = Number(orderDetails?.subTotal) || cartFallbackSubtotal;
  const displayTax = Number(orderDetails?.tax) || 0;
  const displayDiscount = Number(orderDetails?.couponAmount) || 0;
  const displayOrderTotal = Number.isFinite(Number(orderDetails?.orderTotal)) && Number(orderDetails?.orderTotal) > 0
    ? Number(orderDetails.orderTotal)
    : Math.max(
        0,
        displaySubTotal + displayTax - (orderDetails?.coupon ? displayDiscount : 0)
      );
  const displayTotalItems = Number(orderDetails?.totalItems) || cartFallbackItems;

  return (
    <section className="checkout_view py-5">
      <Container>
        <AddAddressModal
          setAddressEditId={setAddressEditId}
          activeKey={activeKey}
          id={addressEditId}
          show={showAddressModal}
          onHide={() => {
            setAddressEditId(null);
            setShowAddressModal(false);
          }}
        />

        <Row>
          <Col lg={8} md={6} sm={12}>
            <h2 className="checkout_page_title mt-0 mb-3">Checkout</h2>
            <div className="checkout_steps">
              <LoginPopup
                show={showLoginPopup}
                handleClose={() => setShowLoginPopup(false)}
              />

              {isLogin ? (
                <ol className="checkout-stepper" aria-label="Checkout steps">
                  {CHECKOUT_STEPS.map((item, index) => (
                    <li
                      key={item.key}
                      className={`checkout-stepper__item${step === index ? " is-active" : ""}${step > index ? " is-done" : ""}`}
                    >
                      <span className="checkout-stepper__index">{index + 1}</span>
                      <span className="checkout-stepper__label">{item.label}</span>
                    </li>
                  ))}
                </ol>
              ) : null}

              {!isLogin ? (
                <div className="checkout_acccinner border rounded-3">
                  <div className="your_address p-3">
                    <h5 className="checkout-step-title">Join platform to place order</h5>
                    <p className="text-muted fs-xs mb-3">Sign in or create an account to continue checkout.</p>
                    <Button
                      className="use_thisadd"
                      onClick={() => setShowLoginPopup(true)}
                    >
                      Join Platform
                    </Button>
                  </div>
                </div>
              ) : null}

              {isLogin && step === 0 ? (
                <div className="checkout_acccinner border rounded-3">
                  <div className="your_address p-3">
                    <h5 className="checkout-step-title">Select delivery address</h5>
                    <p className="fs-xs text-muted mb-2">
                      This address is used for both billing and shipping.
                    </p>
                    {(billingAddress?._id || shippingAddress?._id) ? (
                      <RenderAddress
                        address={billingAddress?._id ? billingAddress : shippingAddress}
                        className="w-100 fs-xs mb-2"
                      />
                    ) : null}

                    <div className="radio_set my-3">
                      {addressList?.length ? (
                        addressList.map((address, key) => {
                          const selectedId = String(billingAddress?._id || shippingAddress?._id || "");
                          const isChecked = selectedId === String(address?._id || "");
                          return (
                          <div className="radio-item d-flex align-items-center" key={address._id || key}>
                            <input
                              type="radio"
                              id={"checkout-address-" + key}
                              name="checkout-address"
                              checked={isChecked}
                              onChange={() => selectCheckoutAddress(address)}
                            />
                            <label htmlFor={"checkout-address-" + key} className="d-flex justify-content-between flex-grow-1">
                              <span>
                                <strong>{address?.name} | {address?.countryCode} {address?.mobileNumber}</strong>{" "}
                                {address?.area}, {address?.houseNo}, {address?.landmark}, {address?.address}
                              </span>
                              <Button
                                className="use_thisadd"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAddressEditId(address._id);
                                  setShowAddressModal(true);
                                }}
                              >
                                Edit
                              </Button>
                            </label>
                          </div>
                          );
                        })
                      ) : null}

                      <Button className="add_new_address" onClick={() => setShowAddressModal(true)}>
                        + Add a new address
                      </Button>
                    </div>
                  </div>

                  <div className="checkout-step-actions p-3">
                    <Button
                      className="use_thisadd"
                      disabled={!billingAddress?._id && !shippingAddress?._id}
                      onClick={goNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}

              {isLogin && step === 1 ? (
                <div className="checkout_acccinner border rounded-3">
                  <div className="text-start p-3">
                    <h5 className="checkout-step-title">Payment method</h5>
                    <strong>Merchant Details</strong>
                    <p className="mb-1">Merchant name: <strong>Uza Solutions Limited</strong></p>
                    <p className="mb-1">Merchant address: <strong>RM.517 NEW CITY CENTRE, 2 LEI YUE MUN ROAD, KWUN TONG HONG KONG,HONG KONG</strong></p>
                    <hr />
                    <strong>Account Details</strong>
                    <p className="mb-1">Account Holder name: <strong>Uza Solutions Limited</strong></p>
                    <p className="mb-1">Currency: <strong>AUD, CAD, CNH, EUR, GBP, HKD, JPY, NZD, SGD, USD</strong></p>
                    <p className="mb-1">Account number: <strong>63115235394</strong></p>
                    <p className="mb-1">SWIFT/BIC Code: <strong>CHASHKHHXXX</strong></p>
                    <p className="mb-1">Bank name: <strong>JP Morgan Chase HONG KONG BRANCH</strong></p>
                    <p className="mb-1">Bank region: <strong>HK</strong></p>
                    <p className="mb-1">Bank code: <strong>007</strong></p>
                    <p className="mb-1">Branch code: <strong>863</strong></p>
                    <p className="mb-1">Bank address: <strong>CHARTER HOUSE, 8 CONNAUGHT ROAD, CENTRAL</strong></p>

                    <hr />
                    <h6 className="checkout-receipt-title">Upload payment receipt</h6>
                    <p className="fs-xs text-muted mb-2">
                      After transferring payment, upload your bank receipt (JPG, PNG, or PDF).
                    </p>

                    <div className="checkout-receipt-upload position-relative">
                      {isUploadingSlip ? <AbsoluteLoader /> : null}

                      {!paymentSlipUrl ? (
                        <Dropzone
                          onDrop={handlePaymentSlipUpload}
                          accept={{
                            "application/pdf": [],
                            "image/png": [],
                            "image/jpeg": [],
                          }}
                          maxFiles={1}
                          disabled={isUploadingSlip}
                        >
                          {({ getRootProps, getInputProps }) => (
                            <section className="drop-zone-fileupload checkout-receipt-dropzone py-4">
                              <div {...getRootProps()}>
                                <input {...getInputProps()} />
                                <p className="text-black mb-0 fs-base">
                                  Drag and drop your receipt here, or click to select a file
                                </p>
                              </div>
                            </section>
                          )}
                        </Dropzone>
                      ) : (
                        <div className="checkout-receipt-preview">
                          {String(paymentSlipUrl).split(".").pop()?.toLowerCase() === "pdf" ? (
                            <Link
                              to={paymentSlipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-decoration-none d-inline-flex flex-column align-items-center"
                            >
                              {ICON_PDF()}
                              <span className="mt-1 text-black fs-xs">
                                {String(paymentSlipUrl).split("/").pop()}
                              </span>
                            </Link>
                          ) : (
                            <div className="d-flex flex-column align-items-center gap-2">
                              <img
                                src={paymentSlipUrl}
                                alt="Payment receipt"
                                className="checkout-receipt-preview__img"
                              />
                              <Link
                                to={paymentSlipUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="fs-xs"
                              >
                                View receipt
                              </Link>
                            </div>
                          )}
                          <Button
                            className="btn btn-secondary mt-3"
                            onClick={clearPaymentSlip}
                            disabled={isUploadingSlip}
                          >
                            Replace receipt
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex mx-3 mb-2">
                    <input
                      type="checkbox"
                      id="accept-terms-and-conditions"
                      className="me-2"
                      checked={termAndConditions}
                      onChange={() => setTermAndConditions(!termAndConditions)}
                    />
                    <label htmlFor="accept-terms-and-conditions" className="mb-0">
                      Accept all terms and conditions
                    </label>
                  </div>

                  <div className="checkout-step-actions p-3">
                    <Button className="checkout-step-back" onClick={goBack}>
                      Back
                    </Button>
                    <Button
                      className="use_thisadd"
                      onClick={goNext}
                      disabled={!termAndConditions || !paymentSlipUrl || isUploadingSlip}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}

              {isLogin && step === 2 ? (
                <div className="checkout_acccinner border rounded-3">
                  <div className="your_address p-3">
                    <h5 className="checkout-step-title">Review items and delivery</h5>
                    {cartList?.length ? (
                      <Row>
                        {cartList.map((cart, index) => {
                          const checkoutMessage = getCheckoutErrorMessage({ cart, orderDetails, index });
                          return (
                            <Col key={index} lg={12} className="my-2">
                              <div className="catpage_preview text-start pe-0 pe-lg-4 position-relative">
                                {cart?.items?.map((item, idx) => (
                                  <div className="productd_wrap mb-2" key={idx}>
                                    <div className="productimmg_side w-25">
                                      <div className="product_img me-lg-4 me-3" style={{ width: "100px", height: "100px" }}>
                                        <img
                                          src={getProductImageUrl(cart.product, placeholder)}
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
                                            <p className="text-theme-secondary fw-bold my-0">Price: {currentCurrency?.symbol} {formatNumber(item.unitPrice)}</p>
                                          </h2>

                                          <div className="counter_div d-flex align-items-center gap-3">
                                            <p className="fw-light mb-0 fs-xs"><span className="fw-medium">Quantity:</span></p>
                                            {(() => {
                                              const minQty = getCartLineMinQuantity(cart, item, orderDetails);
                                              return (
                                                <AddToCart
                                                  className="fs-base"
                                                  value={item.quantity}
                                                  min={minQty}
                                                  decrementDisabled={Number(item.quantity) <= minQty}
                                                  onChange={(value) => {
                                                    manageCartQuantity({
                                                      cartList,
                                                      cartListIndex: index,
                                                      cart,
                                                      cartIndex: idx,
                                                      orderDetails,
                                                      increase: true,
                                                      setValue: Math.max(
                                                        parseInt(value, 10) || minQty,
                                                        minQty
                                                      ),
                                                    });
                                                  }}
                                                  onDecrement={() =>
                                                    manageCartQuantity({
                                                      cartList,
                                                      cartListIndex: index,
                                                      cart,
                                                      cartIndex: idx,
                                                      orderDetails,
                                                      increase: false,
                                                    })
                                                  }
                                                  onIncrement={() => {
                                                    manageCartQuantity({
                                                      cartList,
                                                      cartListIndex: index,
                                                      cart,
                                                      cartIndex: idx,
                                                      orderDetails,
                                                      increase: true,
                                                    });
                                                  }}
                                                />
                                              );
                                            })()}
                                          </div>

                                          {item?.attributes?.length ? (
                                            <>
                                              <hr className="my-1" />
                                              <p className="d-flex flex-wrap fs-xs fst-italic fw-light gap-2 mb-0">
                                                {item?.attributes?.map((attribute, ind) => (
                                                  <span key={`${attribute.attrName}-${ind}`}>
                                                    <span className="fw-medium">{attribute.attrName}. </span> {attribute.attrValue} {item.attributes.length - 1 !== ind ? " | " : ""}
                                                  </span>
                                                ))}
                                              </p>
                                            </>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {checkoutMessage ? (
                                  <div className="d-flex align-items-center justify-content-between gap-10 flex-wrap">
                                    <p className="text-danger text-start mb-0 fs-xs fst-italic">{checkoutMessage}</p>
                                  </div>
                                ) : null}
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    ) : null}
                  </div>

                  <div className="checkout-step-actions p-3">
                    <Button className="checkout-step-back" onClick={goBack}>
                      Back
                    </Button>
                    <Button
                      className="use_thisadd"
                      disabled={!isReadyToPlaceOrder(orderDetails || isLoadingOrder) || isPlacingOrder}
                      onClick={handlePlaceOrder}
                      style={{ minWidth: "fit-content" }}
                    >
                      {isPlacingOrder ? <ButtonLoader size={20} /> : "Place your order"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Col>

          <Col lg={4} md={6} sm={12}>
            <div className="checkout_acccinner border rounded-3">
              {!isLogin ? (
                <div className="use_thisaddress px-3 pt-3">
                  <Button
                    className="use_thisadd mt-3 mb-2"
                    onClick={() => setShowLoginPopup(true)}
                  >
                    Join Platform
                  </Button>
                  <hr />
                </div>
              ) : null}

              <div className="summary_list p-3">
                <h5 className="fw-bold text-start border-bottom w-100">Order Summary</h5>

                {cartList?.length ? (
                  <div className="checkout-summary-items mb-3">
                    {cartList.map((cart) =>
                      (cart?.items || []).map((item, idx) => (
                        <div
                          className="checkout-summary-items__row"
                          key={`summary-${cart._id}-${item._id || idx}`}
                        >
                          <img
                            src={getProductImageUrl(cart.product, placeholder)}
                            alt=""
                            className="checkout-summary-items__img"
                          />
                          <div className="checkout-summary-items__meta">
                            <p className="checkout-summary-items__name">
                              <TranslatedProductName product={cart.product} />
                            </p>
                            <p className="checkout-summary-items__detail">
                              Qty {item.quantity} · {currentCurrency?.symbol}{" "}
                              {formatNumber(Number(item.unitPrice || 0) * Number(item.quantity || 0))}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <p className="fs-xs text-muted text-start">No items in checkout.</p>
                )}

                <ul>
                  <li>
                    <p>Items:</p>
                    <p>{displayTotalItems}</p>
                  </li>
                  <li>
                    <p>Sub Total</p>
                    <p>{currentCurrency?.symbol} {formatNumber(displaySubTotal)}</p>
                  </li>
                  {orderDetails ? (
                    <>
                      <li>
                        <p>Tax Amount ({orderDetails.taxAmount || 0}%)</p>
                        <p>{currentCurrency?.symbol} {formatNumber(displayTax)}</p>
                      </li>
                      {orderDetails?.coupon ? (
                        <li>
                          <p>Coupon discount</p>
                          <p className="text-success">-{currentCurrency?.symbol} {formatNumber(displayDiscount)}</p>
                        </li>
                      ) : null}
                    </>
                  ) : null}
                  <hr />
                  <li>
                    <h4>Order Total:</h4>
                    <h4>{currentCurrency?.symbol} {formatNumber(displayOrderTotal)}</h4>
                  </li>
                </ul>
              </div>
            </div>
          </Col>
        </Row>

        {orderDetails?.cross_sell?.length ? (
          <Row className="mt-4">
            <Col lg={12}>
              <SimilarProductsRow
                items={orderDetails.cross_sell}
                title="You may also like"
                limit={4}
                usePersonalized={false}
              />
            </Col>
          </Row>
        ) : null}
      </Container>
    </section>
  );
};

export default Checkoutpage;
