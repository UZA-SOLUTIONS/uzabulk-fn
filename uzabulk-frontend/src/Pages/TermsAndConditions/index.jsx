import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Container, Row, Col, Breadcrumb } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { APP_NAME } from "../../config/constants";
import ROUTES from "../../helpers/routesHelper";
import { apiGetTermAndConditionsPage } from "../../store/page/actions";

const TermsAndConditions = () => {
    const dispatch = useDispatch();
    const { message, termAndConditions } = useSelector(s => s.page);

    useEffect(() => {
        dispatch(apiGetTermAndConditionsPage());
    }, [dispatch]);
    return (
        <section className="privacy_policy_page">
            <Helmet>
                <title>{APP_NAME} | Terms and conditions</title>
            </Helmet>
            <Container>
                <div className="wrap_conatainer px-lg-4 p-0">
                    <Breadcrumb className="my-4">
                        <Breadcrumb.Item href={ROUTES.HOME}>Home</Breadcrumb.Item>
                        <Breadcrumb.Item active>Terms and conditions</Breadcrumb.Item>
                    </Breadcrumb>
                    <Row className="mb-5">
                        <Col dangerouslySetInnerHTML={{ __html: termAndConditions?.content || message || "" }}></Col>
                    </Row>
                </div>
            </Container>
        </section>
    );
};

export default TermsAndConditions;
