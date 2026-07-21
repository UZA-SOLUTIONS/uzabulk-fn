import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import moment from "moment";

import { apiGet } from "../../helpers/apiHelper";
import { ORDER } from "../../helpers/urlHelper";
import ROUTES from "../../helpers/routesHelper";
import ButtonLoader from "../Common/ButtonLoader";

/**
 * Track Order search modal — track by order number without sign-in.
 * Logged-in users also see recent account orders below the search field.
 */
export default function TrackOrderModal({ show, onHide }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLogin = useSelector((s) => s.auth.isLogin);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!show) return undefined;

    setQuery("");
    setSubmitting(false);
    setRecentOrders([]);

    if (!isLogin) {
      setLoadingOrders(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingOrders(true);

    (async () => {
      try {
        const res = await apiGet(ORDER.LIST, {
          limit: 8,
          skip: 1,
          order: "desc",
          orderBy: "date_created_utc",
          suppressGlobalErrorToast: true,
        });
        if (cancelled) return;
        if (res?.status === "success") {
          setRecentOrders(Array.isArray(res?.data?.items) ? res.data.items : []);
        } else {
          setRecentOrders([]);
        }
      } catch {
        if (!cancelled) setRecentOrders([]);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [show, isLogin]);

  const close = () => {
    if (submitting) return;
    onHide?.();
  };

  const openOrder = (order) => {
    if (!order?._id || submitting) return;
    close();
    navigate(`${ROUTES.ORDER_DETAIL}/${order._id}`);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const q = String(query || "").trim();
    if (!q) {
      toast.error(t("trackOrder.orderIdRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiGet(ORDER.TRACK, { q, suppressGlobalErrorToast: true });
      if (res?.status === "success" && res?.data?._id) {
        close();
        navigate(`${ROUTES.ORDER_DETAIL}/${res.data._id}`);
        return;
      }
      throw new Error(res?.message || t("trackOrder.notFound"));
    } catch (error) {
      toast.error(error?.message || t("trackOrder.notFound"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={close}
      backdrop="static"
      keyboard={!submitting}
      centered
      className="for_loginmod track-order-modal"
      aria-labelledby="track-order-modal-title"
    >
      <Modal.Body>
        <Button className="close_icon" onClick={close} disabled={submitting} aria-label={t("common.close")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
            <path
              fill="#000"
              d="m8.382 17.025l-1.407-1.4L10.593 12L6.975 8.4L8.382 7L12 10.615L15.593 7L17 8.4L13.382 12L17 15.625l-1.407 1.4L12 13.41z"
            />
          </svg>
        </Button>

        <div className="login_auth track-order-auth">
          <div className="track-order-auth__header">
            <h4 id="track-order-modal-title" className="track-order-auth__title mb-0">
              {t("trackOrder.title")}
            </h4>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field track-order-auth__field">
              <span className="auth-field__icon" aria-hidden>
                {SEARCH_ICON}
              </span>
              <input
                type="search"
                className="form-control auth-field__input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("trackOrder.placeholder")}
                autoFocus
                autoComplete="off"
                disabled={submitting}
              />
              <button
                type="submit"
                className="track-order-auth__submit"
                disabled={submitting}
              >
                {submitting ? <ButtonLoader /> : t("trackOrder.submit")}
              </button>
            </div>
          </form>

          {isLogin ? (
            <div className="track-order-recent">
              <div className="track-order-recent__header">
                <p className="track-order-recent__heading mb-0">{t("trackOrder.recentOrders")}</p>
                <button
                  type="button"
                  className="track-order-recent__view-all"
                  onClick={() => {
                    close();
                    navigate(ROUTES.MY_ORDERS);
                  }}
                  disabled={submitting}
                >
                  {t("trackOrder.viewAll")}
                </button>
              </div>
              {loadingOrders ? (
                <p className="track-order-recent__empty">{t("trackOrder.loadingOrders")}</p>
              ) : recentOrders.length ? (
                <ul className="track-order-recent__list">
                  {recentOrders.map((order) => {
                    const orderNo = order.customOrderId || order._id;
                    const dateLabel = moment(order.date_created || order.date_created_utc).format("M/D/YY");
                    return (
                      <li key={order._id}>
                        <button
                          type="button"
                          className="track-order-recent__item"
                          onClick={() => openOrder(order)}
                          disabled={submitting}
                        >
                          <span className="track-order-recent__date">{dateLabel}</span>
                          <span className="track-order-recent__number">{orderNo}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="track-order-recent__empty">{t("trackOrder.noRecentOrders")}</p>
              )}
            </div>
          ) : null}
        </div>
      </Modal.Body>
    </Modal>
  );
}

const SEARCH_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="11" cy="11" r="6.5" stroke="#6b7280" strokeWidth="1.8" />
    <path d="M16.5 16.5L21 21" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
