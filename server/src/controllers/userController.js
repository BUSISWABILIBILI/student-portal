import {
  changeUserStatus,
  createStudentAccount,
  editStudentProfile,
  editUserAccount,
  getUser,
  getUsers,
} from "../services/userService.js";

const getRequestMetadata = (req) => ({
  ipAddress: req.ip || req.socket?.remoteAddress || null,
});

export const createStudent = async (req, res) => {
  const student = await createStudentAccount(
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(201).json({
    success: true,
    message: "Student account created successfully.",
    data: {
      student,
    },
  });
};

export const listUsers = async (req, res) => {
  const result = await getUsers(req.validated.query);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getUserById = async (req, res) => {
  const user = await getUser(req.validated.params.userId);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};

export const updateUser = async (req, res) => {
  const user = await editUserAccount(
    req.validated.params.userId,
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "User account updated successfully.",
    data: {
      user,
    },
  });
};

export const updateProfile = async (req, res) => {
  const student = await editStudentProfile(
    req.validated.params.userId,
    req.validated.body,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: "Student profile updated successfully.",
    data: {
      student,
    },
  });
};

export const updateStatus = async (req, res) => {
  const user = await changeUserStatus(
    req.validated.params.userId,
    req.validated.body.isActive,
    req.user,
    getRequestMetadata(req),
  );

  res.status(200).json({
    success: true,
    message: user.isActive
      ? "User account activated successfully."
      : "User account deactivated successfully.",
    data: {
      user,
    },
  });
};
