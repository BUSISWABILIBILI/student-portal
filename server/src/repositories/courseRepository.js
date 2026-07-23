import pool from "../config/database.js";

const courseColumns = `
  c.id,
  c.course_code,
  c.course_name,
  c.description,
  c.department,
  c.credit_value,
  c.capacity,
  c.is_active,
  c.created_by,
  c.created_at,
  c.updated_at,
  COUNT(
    CASE
      WHEN e.status = 'registered'
      THEN 1
    END
  ) AS enrolled_count
`;

export const findCourseByCode = async (courseCode, connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        c.description,
        c.department,
        c.credit_value,
        c.capacity,
        c.is_active,
        c.created_by,
        c.created_at,
        c.updated_at
      FROM courses AS c
      WHERE c.course_code = ?
      LIMIT 1
    `,
    [courseCode],
  );

  return rows[0] || null;
};

export const findCourseById = async (courseId, connection = pool) => {
  const [rows] = await connection.execute(
    `
      SELECT
        ${courseColumns}
      FROM courses AS c
      LEFT JOIN enrollments AS e
        ON e.course_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
      LIMIT 1
    `,
    [courseId],
  );

  return rows[0] || null;
};

export const createCourseRecord = async (
  {
    courseCode,
    courseName,
    description,
    department,
    creditValue,
    capacity,
    isActive,
    createdBy,
  },
  connection = pool,
) => {
  const [result] = await connection.execute(
    `
      INSERT INTO courses (
        course_code,
        course_name,
        description,
        department,
        credit_value,
        capacity,
        is_active,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      courseCode,
      courseName,
      description,
      department,
      creditValue,
      capacity,
      isActive,
      createdBy,
    ],
  );

  return findCourseById(result.insertId, connection);
};

const sortColumnMap = {
  courseCode: "c.course_code",
  courseName: "c.course_name",
  department: "c.department",
  creditValue: "c.credit_value",
  capacity: "c.capacity",
  createdAt: "c.created_at",
};

export const findCourses = async ({
  page,
  limit,
  search,
  department,
  status,
  availability,
  sortBy,
  sortOrder,
}) => {
  const conditions = [];
  const parameters = [];

  if (search) {
    const searchPattern = `%${search}%`;

    conditions.push(`
      (
        c.course_code LIKE ?
        OR c.course_name LIKE ?
        OR c.description LIKE ?
        OR c.department LIKE ?
      )
    `);

    parameters.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (department) {
    conditions.push("c.department = ?");
    parameters.push(department);
  }

  if (status) {
    conditions.push("c.is_active = ?");
    parameters.push(status === "active");
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const havingConditions = [];

  if (availability === "available") {
    havingConditions.push(`
      enrolled_count < c.capacity
    `);
  }

  if (availability === "full") {
    havingConditions.push(`
      enrolled_count >= c.capacity
    `);
  }

  const havingClause =
    havingConditions.length > 0
      ? `HAVING ${havingConditions.join(" AND ")}`
      : "";

  const safeSortColumn = sortColumnMap[sortBy] || sortColumnMap.courseCode;

  const safeSortOrder = sortOrder === "desc" ? "DESC" : "ASC";

  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(
    `
      SELECT
        ${courseColumns}
      FROM courses AS c
      LEFT JOIN enrollments AS e
        ON e.course_id = c.id
      ${whereClause}
      GROUP BY c.id
      ${havingClause}
      ORDER BY ${safeSortColumn} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `,
    [...parameters, limit, offset],
  );

  const [allMatchingRows] = await pool.execute(
    `
        SELECT
          c.id,
          c.capacity,
          COUNT(
            CASE
              WHEN e.status = 'registered'
              THEN 1
            END
          ) AS enrolled_count
        FROM courses AS c
        LEFT JOIN enrollments AS e
          ON e.course_id = c.id
        ${whereClause}
        GROUP BY c.id
        ${havingClause}
      `,
    parameters,
  );

  return {
    courses: rows,
    total: allMatchingRows.length,
  };
};

export const updateCourseRecord = async (courseId, changes) => {
  const fieldMap = {
    courseCode: "course_code",
    courseName: "course_name",
    description: "description",
    department: "department",
    creditValue: "credit_value",
    capacity: "capacity",
    isActive: "is_active",
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
    return findCourseById(courseId);
  }

  values.push(courseId);

  await pool.execute(
    `
      UPDATE courses
      SET ${assignments.join(", ")}
      WHERE id = ?
    `,
    values,
  );

  return findCourseById(courseId);
};

export const countRegisteredStudents = async (
  courseId,
  academicPeriodId,
  connection = pool,
) => {
  const [rows] = await connection.execute(
    `
      SELECT COUNT(*) AS total
      FROM enrollments
      WHERE course_id = ?
        AND academic_period_id = ?
        AND status = 'registered'
    `,
    [courseId, academicPeriodId],
  );

  return Number(rows[0].total);
};
