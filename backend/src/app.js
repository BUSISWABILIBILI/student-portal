import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import requestContext from "./middleware/requestContext.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import academicPeriodRoutes from "./routes/academicPeriodRoutes.js";
import { healthCheck, readinessCheck } from "./controllers/healthController.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(requestContext);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  morgan.token("request-id", (req) => req.requestId);

  if (process.env.NODE_ENV === "production") {
    app.use(
      morgan((tokens, req, res) =>
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "info",
          message: "HTTP request completed.",
          requestId: req.requestId,
          method: tokens.method(req, res),
          path: tokens.url(req, res),
          statusCode: Number(tokens.status(req, res)),
          responseTimeMs: Number(tokens["response-time"](req, res)),
          contentLength: Number(tokens.res(req, res, "content-length") || 0),
          remoteAddress: tokens["remote-addr"](req, res),
        }),
      ),
    );
  } else {
    app.use(
      morgan(
        ":method :url :status :response-time ms - :res[content-length] [:request-id]",
      ),
    );
  }
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      ...(req.requestId && {
        requestId: req.requestId,
      }),
    });
  },
});

app.use("/api", apiLimiter);

app.get("/api/health", healthCheck);
app.get("/api/ready", readinessCheck);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/academic-periods", academicPeriodRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
