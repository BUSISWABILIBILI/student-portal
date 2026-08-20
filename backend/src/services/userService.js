import pool from "../config/database.js";

import AppError from "../utils/AppError.js";
import formatUser from "../utils/formatUser.js";
import { hashPassword } from "../utils/password.js";

import {
  createStudentProfile,
  createUser,
  findUserByEmail,
  findUserById,
  findUsers,
  getNextStudentSequence,
  updateStudentProfile,
  updateUserAccount,
  updateUserActiveStatus,
} from "../repositories/userRepository.js";

import { createAuditLog } from "../repositories/auditLogRepository.js";

const generateStudentNumber = (academicYear, sequenceNumber) => {
  const paddedSequence = String(sequenceNumber).padStart(4, "0");

  return `STU${academicYear}${paddedSequence}`;
};

export const createStudentAccount = async (
  studentData,
  administrator,
  requestMetadata,
) => {
  const existingUser = await findUserByEmail(studentData.email);

  if (existingUser) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const academicYear = studentData.admissionDate
      ? new Date(studentData.admissionDate).getFullYear()
      : new Date().getFullYear();

    const sequenceNumber = await getNextStudentSequence(
      academicYear,
      connection,
    );

    const studentNumber = generateStudentNumber(academicYear, sequenceNumber);

    const passwordHash = await hashPassword(studentData.password);

    const user = await createUser(
      {
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        passwordHash,
        role: "student",
      },
      connection,
    );

    const completeStudent = await createStudentProfile(
      {
        userId: user.id,
        studentNumber,
        dateOfBirth: studentData.dateOfBirth || null,
        gender: studentData.gender || null,
        phoneNumber: studentData.phoneNumber || null,
        addressLine: studentData.addressLine || null,
        city: studentData.city || null,
        province: studentData.province || null,
        postalCode: studentData.postalCode || null,
        programme: studentData.programme,
        yearLevel: studentData.yearLevel,
        admissionDate: studentData.admissionDate || null,
      },
      connection,
    );

    await createAuditLog(
      {
        userId: administrator.id,
        action: "student_account_created",
        entityType: "user",
        entityId: user.id,
        metadata: {
          studentNumber,
          email: studentData.email,
        },
        ipAddress: requestMetadata.ipAddress,
      },
      connection,
    );

    await connection.commit();

    return formatUser(completeStudent);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getUsers = async (filters) => {
  const result = await findUsers(filters);

  const totalPages = Math.ceil(result.total / filters.limit);

  return {
    users: result.users.map(formatUser),

    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalItems: result.total,
      totalPages,
      hasPreviousPage: filters.page > 1,
      hasNextPage: filters.page < totalPages,
    },

    filters: {
      search: filters.search,
      role: filters.role || null,
      status: filters.status || null,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
  };
};

export const getUser = async (userId) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  return formatUser(user);
};

export const editUserAccount = async (
  userId,
  changes,
  administrator,
  requestMetadata,
) => {
  const existingUser = await findUserById(userId);

  if (!existingUser) {
    throw new AppError("User account not found.", 404);
  }

  if (changes.email && changes.email !== existingUser.email) {
    const emailOwner = await findUserByEmail(changes.email);

    if (emailOwner) {
      throw new AppError("An account with this email already exists.", 409);
    }
  }

  if (userId === administrator.id && changes.role && changes.role !== "admin") {
    throw new AppError("You cannot remove your own administrator role.", 400);
  }

  if (existingUser.role === "student" && changes.role === "admin") {
    throw new AppError(
      "A student account with an academic profile cannot be converted directly into an administrator account.",
      400,
    );
  }

  const updatedUser = await updateUserAccount(userId, changes);

  await createAuditLog({
    userId: administrator.id,
    action: "user_account_updated",
    entityType: "user",
    entityId: userId,
    metadata: {
      changedFields: Object.keys(changes),
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return formatUser(updatedUser);
};

export const editStudentProfile = async (
  userId,
  changes,
  administrator,
  requestMetadata,
) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  if (user.role !== "student") {
    throw new AppError(
      "The selected user does not have a student profile.",
      400,
    );
  }

  if (!user.student_number) {
    throw new AppError("Student profile not found.", 404);
  }

  const updatedUser = await updateStudentProfile(userId, changes);

  await createAuditLog({
    userId: administrator.id,
    action: "student_profile_updated",
    entityType: "student_profile",
    entityId: userId,
    metadata: {
      changedFields: Object.keys(changes),
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return formatUser(updatedUser);
};

export const changeUserStatus = async (
  userId,
  isActive,
  administrator,
  requestMetadata,
) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User account not found.", 404);
  }

  if (userId === administrator.id && !isActive) {
    throw new AppError("You cannot deactivate your own account.", 400);
  }

  if (Boolean(user.is_active) === isActive) {
    return formatUser(user);
  }

  const updatedUser = await updateUserActiveStatus(userId, isActive);

  await createAuditLog({
    userId: administrator.id,
    action: isActive ? "user_account_activated" : "user_account_deactivated",
    entityType: "user",
    entityId: userId,
    metadata: {
      previousStatus: Boolean(user.is_active),
      newStatus: isActive,
    },
    ipAddress: requestMetadata.ipAddress,
  });

  return formatUser(updatedUser);
};
