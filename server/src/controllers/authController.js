import {
  changeUserPassword,
  getAuthenticatedUser,
  loginUser,
  registerUser,
  requestUserPasswordReset,
  resetUserPassword,
} from "../services/authService.js";

const getRequestMetadata = (req) => ({
  ipAddress: req.ip || req.socket?.remoteAddress || null,
});

export const login = async (req, res) => {
  const result = await loginUser(req.validated.body);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: result,
  });
};

export const createAccount = async (req, res) => {
  const user = await registerUser(req.validated.body);

  res.status(201).json({
    success: true,
    message: "User account created successfully.",
    data: {
      user,
    },
  });
};

export const getMe = async (req, res) => {
  const user = await getAuthenticatedUser(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};

export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout successful. Remove the access token from the client.",
  });
};

export const changePassword = async (req, res) => {
  const user = await changeUserPassword(
    req.user.id,
    req.validated.body,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Password changed successfully.",
    data: {
      user,
    },
  });
};

export const requestPasswordReset = async (req, res) => {
  const result = await requestUserPasswordReset(
    req.validated.body,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message:
      "If an active account exists for that email, password reset instructions have been prepared.",
    data: result,
  });
};

export const resetPassword = async (req, res) => {
  await resetUserPassword(req.validated.body, getRequestMetadata(req));

  res.status(200).json({
    success: true,
    message: "Password reset successfully.",
  });
};
