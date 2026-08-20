import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  changePassword,
  createAccount,
  getMe,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
} from "../controllers/authController.js";
import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import validateRequest from "../middleware/validateRequest.js";
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../validators/authValidators.js";

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
  "/password-reset/request",
  validateRequest(requestPasswordResetSchema),
  requestPasswordReset,
);

router.post(
  "/password-reset/confirm",
  validateRequest(resetPasswordSchema),
  resetPassword,
);

router.post(
  "/users",
  authenticate,
  authorize("admin"),
  validateRequest(createUserSchema),
  createAccount,
);

router.get("/me", authenticate, getMe);

router.patch(
  "/me/password",
  authenticate,
  validateRequest(changePasswordSchema),
  changePassword,
);

router.post("/logout", authenticate, logout);

export default router;
