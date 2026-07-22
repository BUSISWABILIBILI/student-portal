import AppError from "../utils/AppError.js";
import { comparePasswords, hashPassword } from "../utils/password.js";
import { generateAccessToken } from "../utils/jwt.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
} from "../repositories/userRepository.js";

const formatUser = (user) => ({
  id: user.id,
  firstName: user.first_name,
  lastName: user.last_name,
  fullName: `${user.first_name} ${user.last_name}`,
  email: user.email,
  role: user.role,
  isActive: Boolean(user.is_active),
  lastLoginAt: user.last_login_at,
  studentNumber: user.student_number || null,
  phoneNumber: user.phone_number || null,
  programme: user.programme || null,
  yearLevel: user.year_level || null,
  profileImageUrl: user.profile_image_url || null,
});

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
