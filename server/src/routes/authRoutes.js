import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  createAccount,
  getMe,
  login,
  logout,
} from "../controllers/authController.js";
import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import validateRequest from "../middleware/validateRequest.js";
import { createUserSchema, loginSchema } from "../validators/authValidators.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

router.post("/login", loginLimiter, validateRequest(loginSchema), login);

router.post(
  "/users",
  authenticate,
  authorize("admin"),
  validateRequest(createUserSchema),
  createAccount,
);

router.get("/me", authenticate, getMe);

router.post("/logout", authenticate, logout);

export default router;
