import { checkDatabaseConnection } from "../config/database.js";

export const healthCheck = (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    message: "Student Portal API is running.",
    timestamp: new Date().toISOString(),
  });
};

export const createReadinessCheck =
  ({ checkDatabase = checkDatabaseConnection } = {}) =>
  async (_req, res) => {
    const timestamp = new Date().toISOString();

    try {
      await checkDatabase();

      return res.status(200).json({
        success: true,
        status: "ready",
        checks: {
          database: "up",
        },
        timestamp,
      });
    } catch {
      return res.status(503).json({
        success: false,
        status: "not_ready",
        message: "Database connection check failed.",
        checks: {
          database: "down",
        },
        timestamp,
      });
    }
  };

export const readinessCheck = createReadinessCheck();
