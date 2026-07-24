import pool from "../config/database.js";

const resultSelect = `
  r.id,
  r.enrollment_id,
  r.coursework_mark,
  r.examination_mark,
  r.final_mark,
  r.grade,
  r.grade_point,
  r.outcome,
  r.publication_status,
  r.remarks,
  r.captured_by,
  r.published_at,
  r.created_at,
  r.updated_at,

  e.status AS enrollment_status,
  e.registered_at,

  sp.id AS student_profile_id,
  sp.student_number,
  sp.programme,
  sp.year_level,

  u.id AS user_id,
  u.first_name,
  u.last_name,
  u.email,

  c.id AS course_id,
  c.course_code,
  c.course_name,
  c.department,
  c.credit_value,

  ap.id AS academic_period_id,
  ap.name AS academic_period_name,
  ap.academic_year
`;

export const findEnrollmentForResult = async (
  enrollmentId,
  connection = pool,
) => {
  const [rows] = await connection.execute(
    `
          SELECT
            e.id,
            e.student_id,
            e.course_id,
            e.academic_period_id,
            e.status,
            sp.user_id,
            sp.student_number,
            c.course_code,
            c.course_name,
            c.credit_value,
            ap.name AS academic_period_name,
            ap.academic_year
          FROM enrollments AS e
          INNER JOIN student_profiles AS sp
            ON sp.id = e.student_id
          INNER JOIN courses AS c
            ON c.id = e.course_id
          INNER JOIN academic_periods AS ap
            ON ap.id = e.academic_period_id
          WHERE e.id = ?
          LIMIT 1
        `,
    [enrollmentId],
  );

  return rows[0] || null;
};

export const findResultByEnrollmentId = async (
  enrollmentId,
  connection = pool,
) => {
  const [rows] = await connection.execute(
    `
          SELECT
            ${resultSelect}
          FROM results AS r
          INNER JOIN enrollments AS e
            ON e.id = r.enrollment_id
          INNER JOIN student_profiles AS sp
            ON sp.id = e.student_id
          INNER JOIN users AS u
            ON u.id = sp.user_id
          INNER JOIN courses AS c
            ON c.id = e.course_id
          INNER JOIN academic_periods AS ap
            ON ap.id = e.academic_period_id
          WHERE r.enrollment_id = ?
          LIMIT 1
        `,
    [enrollmentId],
  );

  return rows[0] || null;
};

export const findResultById = async (resultId, connection = pool) => {
  const [rows] = await connection.execute(
    `
        SELECT
          ${resultSelect}
        FROM results AS r
        INNER JOIN enrollments AS e
          ON e.id = r.enrollment_id
        INNER JOIN student_profiles AS sp
          ON sp.id = e.student_id
        INNER JOIN users AS u
          ON u.id = sp.user_id
        INNER JOIN courses AS c
          ON c.id = e.course_id
        INNER JOIN academic_periods AS ap
          ON ap.id = e.academic_period_id
        WHERE r.id = ?
        LIMIT 1
      `,
    [resultId],
  );

  return rows[0] || null;
};

export const createResultRecord = async (
  {
    enrollmentId,
    courseworkMark,
    examinationMark,
    finalMark,
    grade,
    gradePoint,
    outcome,
    remarks,
    capturedBy,
  },
  connection = pool,
) => {
  const [result] = await connection.execute(
    `
        INSERT INTO results (
          enrollment_id,
          coursework_mark,
          examination_mark,
          final_mark,
          grade,
          grade_point,
          outcome,
          publication_status,
          remarks,
          captured_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
      `,
    [
      enrollmentId,
      courseworkMark,
      examinationMark,
      finalMark,
      grade,
      gradePoint,
      outcome,
      remarks,
      capturedBy,
    ],
  );

  return findResultById(result.insertId, connection);
};

export const updateResultRecord = async (
  resultId,
  {
    courseworkMark,
    examinationMark,
    finalMark,
    grade,
    gradePoint,
    outcome,
    remarks,
  },
  connection = pool,
) => {
  await connection.execute(
    `
      UPDATE results
      SET
        coursework_mark = ?,
        examination_mark = ?,
        final_mark = ?,
        grade = ?,
        grade_point = ?,
        outcome = ?,
        remarks = ?,
        publication_status = 'draft',
        published_at = NULL
      WHERE id = ?
    `,
    [
      courseworkMark,
      examinationMark,
      finalMark,
      grade,
      gradePoint,
      outcome,
      remarks,
      resultId,
    ],
  );

  return findResultById(resultId, connection);
};

export const publishResultRecord = async (resultId, connection = pool) => {
  await connection.execute(
    `
        UPDATE results
        SET
          publication_status = 'published',
          published_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    [resultId],
  );

  return findResultById(resultId, connection);
};

export const unpublishResultRecord = async (resultId, connection = pool) => {
  await connection.execute(
    `
        UPDATE results
        SET
          publication_status = 'draft',
          published_at = NULL
        WHERE id = ?
      `,
    [resultId],
  );

  return findResultById(resultId, connection);
};

const sortColumnMap = {
  studentName: "u.last_name",
  studentNumber: "sp.student_number",
  courseCode: "c.course_code",
  finalMark: "r.final_mark",
  createdAt: "r.created_at",
};

export const findResults = async ({
  page,
  limit,
  search,
  academicPeriodId,
  courseId,
  outcome,
  publicationStatus,
  sortBy,
  sortOrder,
}) => {
  const conditions = [];
  const parameters = [];

  if (search) {
    const pattern = `%${search}%`;

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

    parameters.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }

  if (academicPeriodId) {
    conditions.push("ap.id = ?");

    parameters.push(academicPeriodId);
  }

  if (courseId) {
    conditions.push("c.id = ?");

    parameters.push(courseId);
  }

  if (outcome) {
    conditions.push("r.outcome = ?");

    parameters.push(outcome);
  }

  if (publicationStatus) {
    conditions.push("r.publication_status = ?");

    parameters.push(publicationStatus);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const safeSortColumn = sortColumnMap[sortBy] || sortColumnMap.createdAt;

  const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(
    `
        SELECT
          ${resultSelect}
        FROM results AS r
        INNER JOIN enrollments AS e
          ON e.id = r.enrollment_id
        INNER JOIN student_profiles AS sp
          ON sp.id = e.student_id
        INNER JOIN users AS u
          ON u.id = sp.user_id
        INNER JOIN courses AS c
          ON c.id = e.course_id
        INNER JOIN academic_periods AS ap
          ON ap.id = e.academic_period_id
        ${whereClause}
        ORDER BY
          ${safeSortColumn}
          ${safeSortOrder}
        LIMIT ? OFFSET ?
      `,
    [...parameters, limit, offset],
  );

  const [countRows] = await pool.execute(
    `
        SELECT COUNT(*) AS total
        FROM results AS r
        INNER JOIN enrollments AS e
          ON e.id = r.enrollment_id
        INNER JOIN student_profiles AS sp
          ON sp.id = e.student_id
        INNER JOIN users AS u
          ON u.id = sp.user_id
        INNER JOIN courses AS c
          ON c.id = e.course_id
        INNER JOIN academic_periods AS ap
          ON ap.id = e.academic_period_id
        ${whereClause}
      `,
    parameters,
  );

  return {
    results: rows,
    total: Number(countRows[0].total),
  };
};

export const findPublishedResultsForStudent = async (
  userId,
  { academicPeriodId, outcome },
) => {
  const conditions = ["sp.user_id = ?", "r.publication_status = 'published'"];

  const parameters = [userId];

  if (academicPeriodId) {
    conditions.push("ap.id = ?");

    parameters.push(academicPeriodId);
  }

  if (outcome) {
    conditions.push("r.outcome = ?");

    parameters.push(outcome);
  }

  const [rows] = await pool.execute(
    `
          SELECT
            ${resultSelect}
          FROM results AS r
          INNER JOIN enrollments AS e
            ON e.id = r.enrollment_id
          INNER JOIN student_profiles AS sp
            ON sp.id = e.student_id
          INNER JOIN users AS u
            ON u.id = sp.user_id
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
