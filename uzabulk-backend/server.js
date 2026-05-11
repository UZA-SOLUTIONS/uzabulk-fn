const logger = require('./config/logger');

const NODE_MAJOR_VERSION = Number(process.versions.node.split('.')[0]);
const MIN_SUPPORTED_NODE_MAJOR = 18;
const MAX_SUPPORTED_NODE_MAJOR = 25;

if (
  Number.isNaN(NODE_MAJOR_VERSION)
  || NODE_MAJOR_VERSION < MIN_SUPPORTED_NODE_MAJOR
  || NODE_MAJOR_VERSION > MAX_SUPPORTED_NODE_MAJOR
) {
  logger.error(
    { apiModule: 'server', apiHandler: 'server.js' },
    `Unsupported Node.js version ${process.version}. Use Node ${MIN_SUPPORTED_NODE_MAJOR}-${MAX_SUPPORTED_NODE_MAJOR} (see .nvmrc).`
  );
  process.exit(1);
}

const app = require('./app');

let server = app.listen(env.PORT, () => {
  logger.info({ apiModule: "server", apiHandler: "server.js" }, `Listening to port ${env.PORT}`);
});


const unexpectedErrorHandler = (error) => {
  logger.error({ apiModule: "server", apiHandler: "server.js" }, error);
};
process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info({ apiModule: "server", apiHandler: "server.js" }, 'SIGTERM received');
  if (server) {
    server.close();
  }
});