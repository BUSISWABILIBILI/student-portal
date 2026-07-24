import pool from "../config/database.js";

const resultSelectColumns = `
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
  e.student_id,
  e.course_id,
  e.academic_period_id,
  e.status AS enrollment_status,
  u.first_name AS student_first_name,
  u.last_name AS student_last_name,
  u.email AS student_email,
  sp.student_number,
  sp.programme,
  sp.year_level,
  c.course_code,
  c.course_name,
  c.department,
  c.credits,
  ap.academic_year,
  ap.semester,
  captured.first_name AS captured_by_first_name,
  captured.last_name AS captured_by_last_name,
  captured.email AS captured_by_email
`;

const resultJoinClause = `
  FROM results AS r
  INNER JOIN enrollments AS e
    ON e.id = r.enrollment_id
  INNER JOIN users AS u
    ON u.id = e.student_id
  LEFT JOIN student_profiles AS sp
    ON sp.user_id = u.id
  INNER JOIN courses AS c
    ON c.id = e.course_id
  INNER JOIN academic_periods AS ap
    ON ap.id = e.academic_period_id
  LEFT JOIN users AS captured
    ON captured.id = r.captured_by
`;

const sortColumnMap = {
  studentName: "CONCAT(u.first_name, ' ', u.last_name)",
  studentNumber: "sp.student_number",
  courseCode: "c.course_code",
  finalMark: "r.final_mark",
  createdAt: "r.created_at",
};

export const findEnrollmentForResultById = async (
  enrollmentId,
  connection = pool,
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        e.id AS enrollment_id,
        e.student_id,
        e.course_id,
        e.academic_period_id,
        e.status AS enrollment_status,
        u.first_name AS student_first_name,
        u.last_name AS student_last_name,
        u.email AS student_email,
        sp.student_number,
        c.course_code,
        c.course_name,
        c.credits,
        ap.academic_year,
        ap.semester
      FROM enrollments AS e
      INNER JOIN users AS u
        ON u.id = e.student_id
      LEFT JOIN student_profiles AS sp
        ON sp.user_id = u.id
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

export const findResultById = async (resultId, connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT
        ${resultSelectColumns}
      ${resultJoinClause}
      WHERE r.id = ?
      LIMIT 1
    `,
    [resultId],
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
        ${resultSelectColumns}
      ${resultJoinClause}
      WHERE r.enrollment_id = ?
      LIMIT 1
    `,
    [enrollmentId],
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
  connection,
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

export const updateResultRecord = async (resultId, changes, connection) => {
  const fieldMap = {
    courseworkMark: "coursework_mark",
    examinationMark: "examination_mark",
    finalMark: "final_mark",
    grade: "grade",
    gradePoint: "grade_point",
    outcome: "outcome",
    publicationStatus: "publication_status",
    publishedAt: "published_at",
    remarks: "remarks",
  };

  const assignments = [];
  const values = [];

  for (const [field, value] of Object.entries(changes)) {
    const column = fieldMap[field];

    if (!column) {
      continue;
    }

    assignments.push(`${column} = ?`);
    values.push(value);
  }

  if (assignments.length === 0) {
    return findResultById(resultId, connection);
  }

  values.push(resultId);

  await connection.execute(
    `
      UPDATE results
      SET ${assignments.join(", ")}
      WHERE id = ?
    `,
    values,
  );

  return findResultById(resultId, connection);
};

export const publishResultRecord = async (resultId, connection) => {
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

export const unpublishResultRecord = async (resultId, connection) => {
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

  const safeLimit = Number(limit);

  const safeOffset = (Number(page) - 1) * safeLimit;

  const [rows] = await pool.execute(
    `
      SELECT
        ${resultSelectColumns}
      ${resultJoinClause}
      ${whereClause}
      ORDER BY ${safeSortColumn} ${safeSortOrder}, r.id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `,
    parameters,
  );

  const [countRows] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      ${resultJoinClause}
      ${whereClause}
    `,
    parameters,
  );

  return {
    results: rows,
    total: Number(countRows[0].total),
  };
};

export const findPublishedResultsForStudent = async (userId, filters) => {
  const conditions = [
    "e.student_id = ?",
    "r.publication_status = 'published'",
  ];

  const parameters = [userId];

  if (filters.academicPeriodId) {
    conditions.push("e.academic_period_id = ?");
    parameters.push(filters.academicPeriodId);
  }

  if (filters.outcome) {
    conditions.push("r.outcome = ?");
    parameters.push(filters.outcome);
  }

  const [rows] = await pool.execute(
    `
      SELECT
        ${resultSelectColumns}
      ${resultJoinClause}
      WHERE ${conditions.join(" AND ")}
      ORDER BY
        ap.academic_year DESC,
        c.course_code ASC
    `,
    parameters,
  );

  return rows;
};
