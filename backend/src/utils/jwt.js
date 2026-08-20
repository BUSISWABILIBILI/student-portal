import jwt from "jsonwebtoken";
import AppError from "./AppError.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
};

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      issuer: "student-portal-api",
      audience: "student-portal-client",
    },
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret(), {
      issuer: "student-portal-api",
      audience: "student-portal-client",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Your session has expired. Please log in again.", 401);
    }

    throw new AppError("Invalid authentication token.", 401);
  }
};
