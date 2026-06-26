import React from "react";
import { Button, Container } from "react-bootstrap";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "../../config/constants";

const Pagenotfound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className="errorpage">
      <Helmet>
        <title>{APP_NAME} | {t("notFound.title")}</title>
      </Helmet>
      <Container>
        <div className="erro404page">
          <h1 className="text-white">{t("notFound.title")}</h1>
          <p className="text-white">{t("notFound.message")}</p>
          <Button className="big-add-token" onClick={() => navigate("/")}>
            <p>{t("notFound.goHome")}</p>
          </Button>
        </div>
      </Container>
    </section>
  );
};

export default Pagenotfound;
