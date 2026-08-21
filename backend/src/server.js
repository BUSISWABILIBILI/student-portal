import "dotenv/config";

import app from "./app.js";
import {
  closeDatabaseConnection,
  testDatabaseConnection,
} from "./config/database.js";
import { validateEnvironment } from "./config/environment.js";
import logger from "./utils/logger.js";
import { createGracefulShutdown } from "./utils/gracefulShutdown.js";

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    validateEnvironment();
    await testDatabaseConnection();

    const server = app.listen(port, () => {
      logger.info("Student Portal API running.", { port });
    });

    const shutdown = createGracefulShutdown({
      closeDatabase: closeDatabaseConnection,
      logger,
      server,
    });

    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error("The server could not start.", {
      error: {
        message: error.message,
        name: error.name,
      },
    });
    process.exit(1);
  }
};

startServer();
