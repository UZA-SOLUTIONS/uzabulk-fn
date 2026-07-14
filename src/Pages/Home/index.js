import React from "react";
import { Container, Row, Col } from "react-bootstrap";

import Homebanner from "./Homebanner";
import Discover from "./Discover";

const Homepage = () => {
  return (
    <>
      <div className="home_shared_bg_block">
        <section className="home_main_split text-start">
          <Container>
            <Row className="gy-3 gx-0 align-items-start">
              <Col lg={12} md={12} className="home_main_right">
                <div className="d-none d-md-block">
                  <Homebanner />
                </div>
                <section className="discover_section discover_alibaba pt-3 pb-3 text-start">
                  <Discover />
                </section>
              </Col>
            </Row>
          </Container>
        </section>
      </div>
    </>
  );
};

export default Homepage;
