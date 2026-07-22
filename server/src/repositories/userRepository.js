import pool from "../config/database.js";

const userSelectColumns = `
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.role,
  u.is_active,
  u.last_login_at,
  u.created_at,
  u.updated_at,
  sp.student_number,
  sp.date_of_birth,
  sp.gender,
  sp.phone_number,
  sp.address_line,
  sp.city,
  sp.province,
  sp.postal_code,
  sp.programme,
  sp.year_level,
  sp.profile_image_url,
  sp.admission_date
`;

export const findUserByEmail = async (email, connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT
        ${userSelectColumns},
        u.password_hash
      FROM users AS u
      LEFT JOIN student_profiles AS sp
        ON sp.user_id = u.id
      WHERE u.email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] || null;
};

export const findUserById = async (userId, connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT
        ${userSelectColumns}
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

export const createUser = async (
  { firstName, lastName, email, passwordHash, role },
  connection = pool,
) => {
  const [result] = await connection.execute(
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

  return findUserById(result.insertId, connection);
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

export const createStudentProfile = async (
  {
    userId,
    studentNumber,
    dateOfBirth,
    gender,
    phoneNumber,
    addressLine,
    city,
    province,
    postalCode,
    programme,
    yearLevel,
    admissionDate,
  },
  connection,
) => {
  await connection.execute(
    `
      INSERT INTO student_profiles (
        user_id,
        student_number,
        date_of_birth,
        gender,
        phone_number,
        address_line,
        city,
        province,
        postal_code,
        programme,
        year_level,
        admission_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      studentNumber,
      dateOfBirth,
      gender,
      phoneNumber,
      addressLine,
      city,
      province,
      postalCode,
      programme,
      yearLevel,
      admissionDate,
    ],
  );

  return findUserById(userId, connection);
};

const sortColumnMap = {
  createdAt: "u.created_at",
  firstName: "u.first_name",
  lastName: "u.last_name",
  email: "u.email",
  lastLoginAt: "u.last_login_at",
};

export const findUsers = async ({
  page,
  limit,
  search,
  role,
  status,
  sortBy,
  sortOrder,
}) => {
  const conditions = [];
  const parameters = [];

  if (search) {
    conditions.push(`
      (
        u.first_name LIKE ?
        OR u.last_name LIKE ?
        OR u.email LIKE ?
        OR sp.student_number LIKE ?
        OR sp.programme LIKE ?
      )
    `);

    const searchPattern = `%${search}%`;

    parameters.push(
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    );
  }

  if (role) {
    conditions.push("u.role = ?");
    parameters.push(role);
  }

  if (status) {
    conditions.push("u.is_active = ?");

    parameters.push(status === "active");
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const safeSortColumn = sortColumnMap[sortBy] || sortColumnMap.createdAt;

  const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(
    `
      SELECT
        ${userSelectColumns}
      FROM users AS u
      LEFT JOIN student_profiles AS sp
        ON sp.user_id = u.id
      ${whereClause}
      ORDER BY ${safeSortColumn} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `,
    [...parameters, limit, offset],
  );

  const [countRows] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      FROM users AS u
      LEFT JOIN student_profiles AS sp
        ON sp.user_id = u.id
      ${whereClause}
    `,
    parameters,
  );

  return {
    users: rows,
    total: Number(countRows[0].total),
  };
};

export const updateUserAccount = async (userId, changes) => {
  const fieldMap = {
    firstName: "first_name",
    lastName: "last_name",
    email: "email",
    role: "role",
  };

  const assignments = [];
  const values = [];

  for (const [field, value] of Object.entries(changes)) {
    const databaseColumn = fieldMap[field];

    if (!databaseColumn) {
      continue;
    }

    assignments.push(`${databaseColumn} = ?`);

    values.push(value);
  }

  if (assignments.length === 0) {
    return findUserById(userId);
  }

  values.push(userId);

  await pool.execute(
    `
      UPDATE users
      SET ${assignments.join(", ")}
      WHERE id = ?
    `,
    values,
  );

  return findUserById(userId);
};

export const updateStudentProfile = async (userId, changes) => {
  const fieldMap = {
    programme: "programme",
    yearLevel: "year_level",
    dateOfBirth: "date_of_birth",
    gender: "gender",
    phoneNumber: "phone_number",
    addressLine: "address_line",
    city: "city",
    province: "province",
    postalCode: "postal_code",
    admissionDate: "admission_date",
  };

  const assignments = [];
  const values = [];

  for (const [field, value] of Object.entries(changes)) {
    const databaseColumn = fieldMap[field];

    if (!databaseColumn) {
      continue;
    }

    assignments.push(`${databaseColumn} = ?`);

    values.push(value);
  }

  if (assignments.length === 0) {
    return findUserById(userId);
  }

  values.push(userId);

  await pool.execute(
    `
      UPDATE student_profiles
      SET ${assignments.join(", ")}
      WHERE user_id = ?
    `,
    values,
  );

  return findUserById(userId);
};

export const updateUserActiveStatus = async (userId, isActive) => {
  await pool.execute(
    `
      UPDATE users
      SET is_active = ?
      WHERE id = ?
    `,
    [isActive, userId],
  );

  return findUserById(userId);
};

export const getNextStudentSequence = async (academicYear, connection) => {
  await connection.execute(
    `
      INSERT INTO student_number_sequences (
        academic_year,
        last_number
      )
      VALUES (?, 0)
      ON DUPLICATE KEY UPDATE
        academic_year = VALUES(academic_year)
    `,
    [academicYear],
  );

  const [rows] = await connection.execute(
    `
      SELECT last_number
      FROM student_number_sequences
      WHERE academic_year = ?
      FOR UPDATE
    `,
    [academicYear],
  );

  const nextNumber = Number(rows[0].last_number) + 1;

  await connection.execute(
    `
      UPDATE student_number_sequences
      SET last_number = ?
      WHERE academic_year = ?
    `,
    [nextNumber, academicYear],
  );

  return nextNumber;
};
