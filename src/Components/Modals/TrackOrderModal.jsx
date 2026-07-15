import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { apiGet } from "../../helpers/apiHelper";
import { ORDER } from "../../helpers/urlHelper";
import ROUTES from "../../helpers/routesHelper";
import ButtonLoader from "../Common/ButtonLoader";

/**
 * Track Order search modal — track by order number without sign-in.
 */
export default function TrackOrderModal({ show, onHide }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLogin = useSelector((s) => s.auth.isLogin);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setQuery("");
      setSubmitting(false);
    }
  }, [show]);

  const close = () => {
    if (submitting) return;
    onHide?.();
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
            <button
              type="button"
              className="track-order-auth__link"
              onClick={() => {
                close();
                if (!isLogin) {
                  navigate(`${ROUTES.HOME}?auth=signin`);
                  return;
                }
                navigate(ROUTES.MY_ORDERS);
              }}
            >
              {t("trackOrder.viewAllOrders")}
            </button>
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
