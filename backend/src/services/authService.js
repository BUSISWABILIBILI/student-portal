import crypto from "node:crypto";

import AppError from "../utils/AppError.js";
import { comparePasswords, hashPassword } from "../utils/password.js";
import { generateAccessToken } from "../utils/jwt.js";
import formatUser from "../utils/formatUser.js";
import pool from "../config/database.js";
import { createAuditLog } from "../repositories/auditLogRepository.js";
import {
  createPasswordResetToken,
  createUser,
  expireOpenPasswordResetTokens,
  findActivePasswordResetToken,
  findUserByEmail,
  findUserById,
  findUserWithPasswordById,
  updateLastLogin,
  updateUserPasswordHash,
} from "../repositories/userRepository.js";

const passwordResetExpiryMinutes = 60;

const createResetToken = () => crypto.randomBytes(32).toString("base64url");

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const loginUser = async ({ email, password }) => {
  const user = await findUserByEmail(email);

  const invalidCredentialsError = new AppError(
    "Invalid email or password.",
    401,
  );

  if (!user) {
    throw invalidCredentialsError;
  }

  if (!user.is_active) {
    throw new AppError(
      "Your account is inactive. Contact an administrator.",
      403,
    );
  }

  const passwordMatches = await comparePasswords(password, user.password_hash);

  if (!passwordMatches) {
    throw invalidCredentialsError;
  }

  await updateLastLogin(user.id);

  const updatedUser = await findUserById(user.id);

  const accessToken = generateAccessToken(updatedUser);

  return {
    accessToken,
    user: formatUser(updatedUser),
  };
};

export const registerUser = async ({
  firstName,
  lastName,
  email,
  password,
  role,
}) => {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await createUser({
    firstName,
    lastName,
    email,
    passwordHash,
    role,
  });

  return formatUser(user);
};

export const getAuthenticatedUser = async (userId) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  if (!user.is_active) {
    throw new AppError("Your account is inactive.", 403);
  }

  return formatUser(user);
};

export const changeUserPassword = async (
  userId,
  { currentPassword, newPassword },
  requestMetadata,
) => {
  const user = await findUserWithPasswordById(userId);

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  if (!user.is_active) {
    throw new AppError("Your account is inactive.", 403);
  }

  const passwordMatches = await comparePasswords(
    currentPassword,
    user.password_hash,
  );

  if (!passwordMatches) {
    throw new AppError("Current password is incorrect.", 400);
  }

  const isSamePassword = await comparePasswords(newPassword, user.password_hash);

  if (isSamePassword) {
    throw new AppError(
      "New password must be different from the current password.",
      400,
    );
  }

  const passwordHash = await hashPassword(newPassword);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const updatedUser = await updateUserPasswordHash(
      userId,
      passwordHash,
      connection,
    );

    await expireOpenPasswordResetTokens(userId, connection);

    await createAuditLog(
      {
        userId,
        action: "password_changed",
        entityType: "user",
        entityId: userId,
        metadata: null,
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();

    return formatUser(updatedUser);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const requestUserPasswordReset = async (
  { email },
  requestMetadata,
) => {
  const user = await findUserByEmail(email);

  if (!user || !user.is_active) {
    return {};
  }

  const resetToken = createResetToken();
  const tokenHash = hashResetToken(resetToken);
  const expiresAt = new Date(
    Date.now() + passwordResetExpiryMinutes * 60 * 1000,
  );
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await expireOpenPasswordResetTokens(user.id, connection);

    await createPasswordResetToken(
      {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
      connection,
    );

    await createAuditLog(
      {
        userId: user.id,
        action: "password_reset_requested",
        entityType: "user",
        entityId: user.id,
        metadata: {
          expiresAt,
        },
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    expiresInMinutes: passwordResetExpiryMinutes,
    ...(process.env.NODE_ENV !== "production" && {
      resetToken,
    }),
  };
};

export const resetUserPassword = async (
  { token, newPassword },
  requestMetadata,
) => {
  const tokenHash = hashResetToken(token);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const resetRecord = await findActivePasswordResetToken(
      tokenHash,
      connection,
    );

    if (!resetRecord) {
      throw new AppError("Password reset token is invalid or expired.", 400);
    }

    if (!resetRecord.is_active) {
      throw new AppError("Your account is inactive.", 403);
    }

    const isSamePassword = await comparePasswords(
      newPassword,
      resetRecord.password_hash,
    );

    if (isSamePassword) {
      throw new AppError(
        "New password must be different from the current password.",
        400,
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await updateUserPasswordHash(
      resetRecord.user_id,
      passwordHash,
      connection,
    );

    await expireOpenPasswordResetTokens(resetRecord.user_id, connection);

    await createAuditLog(
      {
        userId: resetRecord.user_id,
        action: "password_reset_completed",
        entityType: "user",
        entityId: resetRecord.user_id,
        metadata: null,
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
