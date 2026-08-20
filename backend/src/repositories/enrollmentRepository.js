import pool from "../config/database.js";

const adminEnrollmentColumns = `
  e.id,
  e.status,
  e.registered_at,
  e.cancelled_at,
  e.updated_at,
  u.id AS student_user_id,
  u.first_name AS student_first_name,
  u.last_name AS student_last_name,
  u.email AS student_email,
  sp.id AS student_profile_id,
  sp.student_number,
  sp.programme,
  sp.year_level,
  c.id AS course_id,
  c.course_code,
  c.course_name,
  c.department,
  c.credit_value,
  ap.id AS academic_period_id,
  ap.name AS academic_period_name,
  ap.academic_year,
  ap.semester,
  r.id AS result_id,
  r.publication_status AS result_publication_status,
  r.final_mark AS result_final_mark,
  r.outcome AS result_outcome
`;

const adminEnrollmentJoinClause = `
  FROM enrollments AS e
  INNER JOIN student_profiles AS sp
    ON sp.id = e.student_id
  INNER JOIN users AS u
    ON u.id = sp.user_id
  INNER JOIN courses AS c
    ON c.id = e.course_id
  INNER JOIN academic_periods AS ap
    ON ap.id = e.academic_period_id
  LEFT JOIN results AS r
    ON r.enrollment_id = e.id
`;

export const findStudentProfileByUserId = async (userId, connection = pool) => {
  const [rows] = await connection.execute(
    `
        SELECT
          id,
          user_id,
          student_number,
          programme,
          year_level
        FROM student_profiles
        WHERE user_id = ?
        LIMIT 1
      `,
    [userId],
  );

  return rows[0] || null;
};

const enrollmentSortColumnMap = {
  registeredAt: "e.registered_at",
  studentName: "CONCAT(u.first_name, ' ', u.last_name)",
  studentNumber: "sp.student_number",
  courseCode: "c.course_code",
};

export const findEnrollments = async ({
  page,
  limit,
  search,
  academicPeriodId,
  courseId,
  status,
  resultStatus,
  sortBy,
  sortOrder,
}) => {
  const conditions = [];
  const parameters = [];

  if (search) {
    const searchPattern = `%${search}%`;

    conditions.push(`
      (
        u.first_name LIKE ?
        OR u.last_name LIKE ?
        OR u.email LIKE ?
        OR sp.student_number LIKE ?
        OR c.course_code LIKE ?
        OR c.course_name LIKE ?
      )
    `);

    parameters.push(
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
    );
  }

  if (academicPeriodId) {
    conditions.push("e.academic_period_id = ?");
    parameters.push(academicPeriodId);
  }

  if (courseId) {
    conditions.push("e.course_id = ?");
    parameters.push(courseId);
  }

  if (status) {
    conditions.push("e.status = ?");
    parameters.push(status);
  }

  if (resultStatus === "pending") {
    conditions.push("r.id IS NULL");
  }

  if (resultStatus === "captured") {
    conditions.push("r.id IS NOT NULL");
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const safeSortColumn =
    enrollmentSortColumnMap[sortBy] || enrollmentSortColumnMap.registeredAt;
  const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
  const safeLimit = Number(limit);
  const safeOffset = (Number(page) - 1) * safeLimit;

  const [rows] = await pool.execute(
    `
      SELECT
        ${adminEnrollmentColumns}
      ${adminEnrollmentJoinClause}
      ${whereClause}
      ORDER BY ${safeSortColumn} ${safeSortOrder}, e.id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
    parameters,
  );

  const [countRows] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      ${adminEnrollmentJoinClause}
      ${whereClause}
    `,
    parameters,
  );

  return {
    enrollments: rows,
    total: Number(countRows[0].total),
  };
};

export const findEnrollment = async (
  studentProfileId,
  courseId,
  academicPeriodId,
  connection = pool,
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        student_id,
        course_id,
        academic_period_id,
        status,
        registered_at,
        cancelled_at,
        updated_at
      FROM enrollments
      WHERE student_id = ?
        AND course_id = ?
        AND academic_period_id = ?
      LIMIT 1
    `,
    [studentProfileId, courseId, academicPeriodId],
  );

  return rows[0] || null;
};

export const createEnrollment = async (
  { studentProfileId, courseId, academicPeriodId },
  connection,
) => {
  const [result] = await connection.execute(
    `
      INSERT INTO enrollments (
        student_id,
        course_id,
        academic_period_id,
        status
      )
      VALUES (?, ?, ?, 'registered')
    `,
    [studentProfileId, courseId, academicPeriodId],
  );

  return result.insertId;
};

export const reactivateEnrollment = async (enrollmentId, connection) => {
  await connection.execute(
    `
      UPDATE enrollments
      SET
        status = 'registered',
        registered_at = CURRENT_TIMESTAMP,
        cancelled_at = NULL
      WHERE id = ?
    `,
    [enrollmentId],
  );
};

export const cancelEnrollmentRecord = async (
  enrollmentId,
  connection = pool,
) => {
  await connection.execute(
    `
      UPDATE enrollments
      SET
        status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [enrollmentId],
  );
};

export const findStudentEnrollments = async (
  studentProfileId,
  { status, academicPeriodId },
) => {
  const conditions = ["e.student_id = ?"];

  const parameters = [studentProfileId];

  if (status) {
    conditions.push("e.status = ?");
    parameters.push(status);
  }

  if (academicPeriodId) {
    conditions.push("e.academic_period_id = ?");

    parameters.push(academicPeriodId);
  }

  const [rows] = await pool.execute(
    `
      SELECT
        e.id,
        e.status,
        e.registered_at,
        e.cancelled_at,
        c.id AS course_id,
        c.course_code,
        c.course_name,
        c.description,
        c.department,
        c.credit_value,
        ap.id AS academic_period_id,
        ap.name AS academic_period_name,
        ap.academic_year
      FROM enrollments AS e
      INNER JOIN courses AS c
        ON c.id = e.course_id
      INNER JOIN academic_periods AS ap
        ON ap.id = e.academic_period_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY
        ap.academic_year DESC,
        c.course_code ASC
    `,
    parameters,
  );

  return rows;
};
