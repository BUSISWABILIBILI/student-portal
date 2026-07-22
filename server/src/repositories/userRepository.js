import pool from "../config/database.js";

const publicUserColumns = `
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.role,
  u.is_active,
  u.last_login_at,
  u.created_at,
  u.updated_at
`;

export const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `
      SELECT
        ${publicUserColumns},
        u.password_hash
      FROM users AS u
      WHERE u.email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] || null;
};

export const findUserById = async (userId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        ${publicUserColumns},
        sp.student_number,
        sp.phone_number,
        sp.programme,
        sp.year_level,
        sp.profile_image_url
      FROM users AS u
      LEFT JOIN student_profiles AS sp
        ON sp.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] || null;
};

export const createUser = async ({
  firstName,
  lastName,
  email,
  passwordHash,
  role,
}) => {
  const [result] = await pool.execute(
    `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [firstName, lastName, email, passwordHash, role],
  );

  return findUserById(result.insertId);
};

export const updateLastLogin = async (userId) => {
  await pool.execute(
    `
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [userId],
  );
};
