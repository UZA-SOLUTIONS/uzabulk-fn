const { createProxyMiddleware } = require("http-proxy-middleware");

const apiTarget = (process.env.REACT_APP_API_URL || "http://localhost:1302").replace(/\/+$/, "");

module.exports = function setupProxy(app) {
  app.use(
    "/images",
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: true,
    })
  );
};
