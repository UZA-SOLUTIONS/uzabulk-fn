import React from "react";
import { Modal, Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import { SUPPORT_WHATSAPP } from "../../config/constants";
import {
  getSupportWhatsAppUrl,
  normalizeWhatsappNumber,
} from "../../helpers/supportChatHelper";
import WhatsAppIcon from "../Common/WhatsAppIcon";

const HELP_EMAIL = process.env.REACT_APP_HELP_EMAIL || "info@uzabulk.com";
const HELP_PHONE_DISPLAY = "+250 788 371 081";
const HELP_PHONE_TEL = "+250788371081";

const formatWhatsAppDisplay = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 12 && digits.startsWith("250")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return "0788 371 081";
};

const OFFICES = [
  {
    regionKey: "rwanda",
    region: "Rwanda (Headquarters)",
    detail: "Uza Solutions Ltd, Kigali, UNIFY HOUSE 4th Floor",
  },
  {
    regionKey: "uganda",
    region: "Uganda",
    detail: "Uza Solutions Ltd, Kampala",
  },
  {
    regionKey: "hongKong",
    region: "Hong Kong",
    detail: "Uza Solutions Ltd, Hong Kong",
  },
];

/**
 * Help modal — contact channels + offices, laid out to fit the dialog.
 */
export default function HelpModal({ show, onHide }) {
  const { t } = useTranslation();
  const whatsappRaw = SUPPORT_WHATSAPP || "0788371081";
  const whatsappDisplay = formatWhatsAppDisplay(whatsappRaw);
  const whatsappDigits = normalizeWhatsappNumber(whatsappRaw);
  const whatsappUrl =
    getSupportWhatsAppUrl(t("help.whatsappPrefill")) ||
    (whatsappDigits ? `https://wa.me/${whatsappDigits}` : "");

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="for_loginmod help-modal"
      aria-labelledby="help-modal-title"
    >
      <Modal.Body>
        <Button className="close_icon" onClick={onHide} aria-label={t("common.close")}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
            <path
              fill="#000"
              d="m8.382 17.025l-1.407-1.4L10.593 12L6.975 8.4L8.382 7L12 10.615L15.593 7L17 8.4L13.382 12L17 15.625l-1.407 1.4L12 13.41z"
            />
          </svg>
        </Button>

        <div className="help-modal__inner">
          <h4 id="help-modal-title" className="help-modal__title">
            {t("nav.help")}
          </h4>
          <p className="help-modal__intro">{t("help.intro")}</p>

          <ul className="help-modal__channels">
            <li>
              <span className="help-modal__label">{t("help.email")}</span>
              <a className="help-modal__value" href={`mailto:${HELP_EMAIL}`}>
                {HELP_EMAIL}
              </a>
            </li>
            <li>
              <span className="help-modal__label">{t("help.call")}</span>
              <a className="help-modal__value" href={`tel:${HELP_PHONE_TEL}`}>
                {HELP_PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <span className="help-modal__label">{t("help.whatsapp")}</span>
              <a
                className="help-modal__value help-modal__value--whatsapp"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon size={16} className="help-modal__wa-icon" />
                {whatsappDisplay}
              </a>
            </li>
          </ul>

          <div className="help-modal__offices">
            <h5 className="help-modal__offices-title">{t("help.offices")}</h5>
            <ul className="help-modal__office-list">
              {OFFICES.map((office) => (
                <li key={office.regionKey}>
                  <strong>{t(`help.office.${office.regionKey}.region`, { defaultValue: office.region })}</strong>
                  <span>{t(`help.office.${office.regionKey}.detail`, { defaultValue: office.detail })}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
