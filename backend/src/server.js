import "dotenv/config";

import app from "./app.js";
import { testDatabaseConnection } from "./config/database.js";
import { validateEnvironment } from "./config/environment.js";

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    validateEnvironment();
    await testDatabaseConnection();

    const server = app.listen(port, () => {
      console.log(`Student Portal API running on port ${port}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Closing server...`);

      server.close(() => {
        console.log("Server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("The server could not start.");

    console.error(error.message);
    process.exit(1);
  }
};

startServer();
