import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePasswords = async (plainPassword, passwordHash) => {
  return bcrypt.compare(plainPassword, passwordHash);
};
