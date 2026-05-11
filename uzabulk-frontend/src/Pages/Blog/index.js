// src/components/Blog.js
import React from "react";
import { Helmet } from "react-helmet";
import { Container, Row, Col, Breadcrumb, Card, Button, ListGroup } from "react-bootstrap";
import { APP_NAME } from "../../config/constants";
import './Blog.css'; // Import custom CSS for additional styling
import ROUTES from "../../helpers/routesHelper";

// Sample blog posts data
const blogPosts = [
  {
    id: 1,
    title: "Understanding E-Commerce Trends",
    summary: "Explore the latest trends in e-commerce and how they are shaping the future of online shopping.",
    date: "August 6, 2024",
    link: "/blog/understanding-ecommerce-trends",
    image: "https://www.assiduusglobal.com/blog/wp-content/uploads/2022/01/e-commerce-trends.jpeg"
  },
  {
    id: 2,
    title: "Tips for Enhancing Online Customer Experience",
    summary: "Discover strategies to improve the online shopping experience for your customers and boost engagement.",
    date: "July 15, 2024",
    link: "/blog/tips-for-enhancing-customer-experience",
    image: "https://kaizo.com/wp-content/uploads/2022/03/ways-to-improve-customer-experience-1024x449.png"
  },
  {
    id: 3,
    title: "The Importance of Mobile Optimization",
    summary: "Learn why mobile optimization is crucial for your e-commerce site and how to implement it effectively.",
    date: "June 22, 2024",
    link: "/blog/mobile-optimization",
    image: "https://media.licdn.com/dms/image/D5612AQE4LkTjqh0aQw/article-cover_image-shrink_600_2000/0/1677152957467?e=2147483647&v=beta&t=8bDnVir-a0p154x3ktO8XA3CGp1d1yqgU6HhR9sE1bQ"
  }
];

// Sample categories data
const categories = [
  "E-Commerce",
  "Customer Experience",
  "Mobile Optimization",
  "Marketing",
  "Technology"
];

const Blog = () => {
  return (
    <section className="about_us_page">
      <Helmet>
        <title>Blog - {APP_NAME}</title>
        <meta name="description" content="Read the latest blog posts on e-commerce trends, customer experience, and more." />
      </Helmet>
      <Container>
      <div className="wrap_conatainer px-lg-4 p-0">

        <Breadcrumb className="my-4">
          <Breadcrumb.Item href={ROUTES.HOME}>Home</Breadcrumb.Item>
          <Breadcrumb.Item active>Blog</Breadcrumb.Item>
        </Breadcrumb>
        <Row>
          <Col md={12}>
            <h1 className="mb-4">Blog</h1>
            <Row>
              {blogPosts.map((post) => (
                <Col lg={4} md={6} sm={12} key={post.id} className="mb-4">
                  <Card className="blog-card">
                    <Card.Img variant="top" src={post.image} />
                    <Card.Body>
                      <Card.Title>{post.title}</Card.Title>
                      <Card.Subtitle className="mb-2 text-muted">{post.date}</Card.Subtitle>
                      <Card.Text>{post.summary}</Card.Text>
                      <Button variant="primary" href={post.link} className="btn-theme-secondary w-100 disabled text-white">Read More</Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
        </div>
      </Container>
    </section>
  );
};

export default Blog;
