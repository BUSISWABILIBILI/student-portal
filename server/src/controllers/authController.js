import {
  getAuthenticatedUser,
  loginUser,
  registerUser,
} from "../services/authService.js";

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
