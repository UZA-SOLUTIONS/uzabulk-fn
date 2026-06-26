import { Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { APP_NAME } from "../../config/constants";
import ROUTES from "../../helpers/routesHelper";
import ICON_EMPTY_CART from "../../assets/images/icon-empty-cart.svg";

export default function EmptyCart() {
    const { t } = useTranslation();
    return (
        <Row className="justify-content-center">
            <Col lg={6} className="my-3 mb-5">
                <img className="empty-cart" src={ICON_EMPTY_CART} alt="" />
                <p className="empty-cart-title">{t("cart.emptyTitle")}</p>
                <p className="empty-cart-sub-title pb-4">{t("cart.emptySubtitle", { appName: APP_NAME })}</p>
                <Link to={ROUTES.HOME} className="empty-cart-link">{t("cart.startSourcing")}</Link>
            </Col>
        </Row>
    );
}
