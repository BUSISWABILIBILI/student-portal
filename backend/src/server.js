import "dotenv/config";

import app from "./app.js";
import {
  closeDatabaseConnection,
  testDatabaseConnection,
} from "./config/database.js";
import { validateEnvironment } from "./config/environment.js";
import { createGracefulShutdown } from "./utils/gracefulShutdown.js";

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    validateEnvironment();
    await testDatabaseConnection();

    const server = app.listen(port, () => {
      console.log(`Student Portal API running on port ${port}`);
    });

    const shutdown = createGracefulShutdown({
      closeDatabase: closeDatabaseConnection,
      server,
    });

    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("The server could not start.");

    console.error(error.message);
    process.exit(1);
  }
};

startServer();
