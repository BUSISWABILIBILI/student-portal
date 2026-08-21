const closeHttpServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

export const createGracefulShutdown = ({
  closeDatabase,
  exit = process.exit,
  logger = console,
  server,
  timeoutMs = 10000,
}) => {
  let isShuttingDown = false;

  return async (signal) => {
    if (isShuttingDown) {
      logger.warn(`${signal} received during shutdown. Forcing exit.`);
      exit(1);
      return;
    }

    isShuttingDown = true;
    logger.log(`${signal} received. Closing server...`);

    const timeout = setTimeout(() => {
      logger.error("Graceful shutdown timed out. Forcing exit.");
      exit(1);
    }, timeoutMs);
    timeout.unref?.();

    try {
      await closeHttpServer(server);
      logger.log("HTTP server closed.");

      await closeDatabase();
      logger.log("Database pool closed.");

      clearTimeout(timeout);
      exit(0);
    } catch (error) {
      clearTimeout(timeout);

      logger.error("Graceful shutdown failed.");
      logger.error(error.message);
      exit(1);
    }
  };
};
