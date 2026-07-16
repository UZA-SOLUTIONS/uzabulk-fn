import { useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Signin from "./Signin";
import Signup from "./Signup";

export default function LoginPopup({ show, handleClose, initialTab = "signin" }) {
  const { t } = useTranslation();
  const [state, setState] = useState({ tab: initialTab });

  useEffect(() => {
    if (show) {
      setState({ tab: initialTab });
      window.dispatchEvent(new Event("uzabulk:auth-modal-open"));
      try {
        window.google?.accounts?.id?.cancel?.();
      } catch (_) {
        /* ignore */
      }
    }
  }, [show, initialTab]);

  const setTab = (tab) => {
    setState({ tab });
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      backdrop
      keyboard
      centered
      className="for_loginmod"
      dialogClassName="auth-modal-dialog"
    >
      <Modal.Body className="auth-modal-body">
        <div className="auth-modal-top">
          <div className="auth-modal-tabs" role="tablist" aria-label={t("nav.account")}>
            <button
              type="button"
              role="tab"
              aria-selected={state.tab === "signin"}
              className={`auth-modal-tab${state.tab === "signin" ? " is-active" : ""}`}
              onClick={() => setTab("signin")}
            >
              {t("nav.signIn")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={state.tab === "signup"}
              className={`auth-modal-tab${state.tab === "signup" ? " is-active" : ""}`}
              onClick={() => setTab("signup")}
            >
              {t("nav.signUp")}
            </button>
          </div>

          <Button
            type="button"
            className="auth-modal-close"
            onClick={handleClose}
            aria-label={t("common.close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="m8.382 17.025l-1.407-1.4L10.593 12L6.975 8.4L8.382 7L12 10.615L15.593 7L17 8.4L13.382 12L17 15.625l-1.407 1.4L12 13.41z"
              />
            </svg>
          </Button>
        </div>

        <div className="auth_modal_content" role="tabpanel">
          {state.tab === "signin" ? <Signin handleClose={handleClose} /> : null}
          {state.tab === "signup" ? <Signup handleClose={handleClose} /> : null}
        </div>
      </Modal.Body>
    </Modal>
  );
}
