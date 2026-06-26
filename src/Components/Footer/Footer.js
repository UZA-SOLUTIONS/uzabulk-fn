import React from "react";
import { Container } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { APP_NAME } from "../../config/constants";
import ROUTES from "../../helpers/routesHelper";

const FOOTER_LINK_KEYS = [
  { to: ROUTES.HOME, key: "nav.home" },
  { to: ROUTES.PRODUCT_LISTING, key: "nav.allProducts" },
  { to: ROUTES.CATEGORIES, key: "nav.allCategories" },
  { to: ROUTES.NEW_ARRIVALS_PRODUCT_LISTING, key: "nav.newArrivals" },
  { to: ROUTES.TOP_RANKING_PRODUCT_LISTING, key: "nav.topRanking" },
  { to: ROUTES.BEST_DEAL_PRODUCT_LISTING, key: "nav.bestDeals" },
  { to: ROUTES.SAVING_SPOTLIGHT_PRODUCT_LISTING, key: "nav.savingSpotlight" },
  { to: ROUTES.BLOG, key: "nav.blog" },
  { to: ROUTES.ABOUT_US, key: "nav.aboutUs" },
  { to: ROUTES.CONTACT_US, key: "nav.contactUs" },
  { to: ROUTES.PRIVACY_POLICY, key: "nav.privacyPolicy" },
  { to: ROUTES.T_AND_C, key: "nav.termsConditions" },
];

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer-clean">
      <Container>
        <div className="site-footer-clean__inner">
          <nav className="site-footer-clean__nav" aria-label={t("footer.ariaLabel")}>
            {FOOTER_LINK_KEYS.map(({ to, key }) => (
              <Link key={to} to={to} className="site-footer-clean__link">
                {t(key)}
              </Link>
            ))}
          </nav>
          <p className="site-footer-clean__copy">
            © {year} {APP_NAME}. {t("footer.allRightsReserved")}
          </p>
        </div>
      </Container>
    </footer>
  );
}
