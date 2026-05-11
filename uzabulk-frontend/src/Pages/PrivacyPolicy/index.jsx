import React, { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Container, Row, Col, Breadcrumb } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { APP_NAME } from "../../config/constants";
import ROUTES from "../../helpers/routesHelper";
import { apiGetPrivacyPolicyPage } from "../../store/page/actions";

const PrivacyPolicy = () => {
    const dispatch = useDispatch();
    const { isLoading, message, privacyPolicy } = useSelector(s => s.page);

    useEffect(() => {
        dispatch(apiGetPrivacyPolicyPage());
    }, []);
    return (
        <section className="privacy_policy_page">
            <Helmet>
                <title>{APP_NAME} | Privacy Policy</title>
            </Helmet>
            <Container>
                <div className="wrap_conatainer px-lg-4 p-0">
                    <Breadcrumb className="my-4">
                        <Breadcrumb.Item href={ROUTES.HOME}>Home</Breadcrumb.Item>
                        <Breadcrumb.Item active>Privacy Policy</Breadcrumb.Item>
                    </Breadcrumb>
                    <Row className="mb-5">
                        <Col dangerouslySetInnerHTML={{ __html: privacyPolicy?.content || message || "" }}></Col>
                    </Row>
                </div>
            </Container>
        </section>
    );
};

export default PrivacyPolicy;
