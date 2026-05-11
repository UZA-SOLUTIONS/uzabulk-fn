import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Container, Row, Col, Breadcrumb } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { APP_NAME } from "../../config/constants";
import ROUTES from "../../helpers/routesHelper";
import { apiGetContactUsPage } from "../../store/page/actions";

const ContactUs = () => {
  const dispatch = useDispatch();
  const { isLoading, message, contactUs } = useSelector(s => s.page);

  useEffect(() => {
    dispatch(apiGetContactUsPage());
  }, []);
  return (
    <section className="contact_us_page">
      <Helmet>
        <title>{APP_NAME} | Contact Us</title>
      </Helmet>
      <Container>
        <div className="wrap_conatainer px-lg-4 p-0">
          <Breadcrumb className="my-4">
            <Breadcrumb.Item href={ROUTES.HOME}>Home</Breadcrumb.Item>
            <Breadcrumb.Item active>Contact Us</Breadcrumb.Item>
          </Breadcrumb>
          <Row className="mb-5">
            <Col dangerouslySetInnerHTML={{ __html: contactUs?.content || message || "" }}></Col>
          </Row>
        </div>
      </Container>
    </section>
  );
};

export default ContactUs;
