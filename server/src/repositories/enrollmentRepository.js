import pool from "../config/database.js";

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
