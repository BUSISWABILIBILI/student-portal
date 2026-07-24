import pool from "../config/database.js";

const announcementSelect = `
  a.id,
  a.title,
  a.content,
  a.target_type,
  a.target_role,
  a.target_student_id,
  a.priority,
  a.publication_status,
  a.publish_at,
  a.expires_at,
  a.created_by,
  a.created_at,
  a.updated_at,

  creator.first_name AS creator_first_name,
  creator.last_name AS creator_last_name,

  target_student.student_number
    AS target_student_number,

  target_user.first_name
    AS target_student_first_name,

  target_user.last_name
    AS target_student_last_name
`;

export const findStudentProfileById = async (
  studentProfileId,
  connection = pool,
) => {
  const [rows] = await connection.execute(
    `
          SELECT
            sp.id,
            sp.user_id,
            sp.student_number,
            u.first_name,
            u.last_name,
            u.is_active
          FROM student_profiles AS sp
          INNER JOIN users AS u
            ON u.id = sp.user_id
          WHERE sp.id = ?
          LIMIT 1
        `,
    [studentProfileId],
  );

  return rows[0] || null;
};

export const createAnnouncementRecord = async (
  {
    title,
    content,
    targetType,
    targetRole,
    targetStudentId,
    priority,
    publishAt,
    expiresAt,
    createdBy,
  },
  connection = pool,
) => {
  const [result] = await connection.execute(
    `
          INSERT INTO announcements (
            title,
            content,
            target_type,
            target_role,
            target_student_id,
            priority,
            publication_status,
            publish_at,
            expires_at,
            created_by
          )
          VALUES (
            ?, ?, ?, ?, ?, ?,
            'draft', ?, ?, ?
          )
        `,
    [
      title,
      content,
      targetType,
      targetRole,
      targetStudentId,
      priority,
      publishAt,
      expiresAt,
      createdBy,
    ],
  );

  return findAnnouncementById(result.insertId, connection);
};

export const findAnnouncementById = async (
  announcementId,
  connection = pool,
) => {
  const [rows] = await connection.execute(
    `
          SELECT
            ${announcementSelect}
          FROM announcements AS a
          INNER JOIN users AS creator
            ON creator.id = a.created_by
          LEFT JOIN student_profiles
            AS target_student
            ON target_student.id =
              a.target_student_id
          LEFT JOIN users AS target_user
            ON target_user.id =
              target_student.user_id
          WHERE a.id = ?
          LIMIT 1
        `,
    [announcementId],
  );

  return rows[0] || null;
};

export const updateAnnouncementRecord = async (
  announcementId,
  {
    title,
    content,
    targetType,
    targetRole,
    targetStudentId,
    priority,
    publishAt,
    expiresAt,
  },
  connection = pool,
) => {
  await connection.execute(
    `
        UPDATE announcements
        SET
          title = ?,
          content = ?,
          target_type = ?,
          target_role = ?,
          target_student_id = ?,
          priority = ?,
          publish_at = ?,
          expires_at = ?,
          publication_status = 'draft'
        WHERE id = ?
      `,
    [
      title,
      content,
      targetType,
      targetRole,
      targetStudentId,
      priority,
      publishAt,
      expiresAt,
      announcementId,
    ],
  );

  return findAnnouncementById(announcementId, connection);
};

export const publishAnnouncementRecord = async (
  announcementId,
  publishAt,
  connection = pool,
) => {
  await connection.execute(
    `
        UPDATE announcements
        SET
          publication_status = 'published',
          publish_at = ?
        WHERE id = ?
      `,
    [publishAt, announcementId],
  );

  return findAnnouncementById(announcementId, connection);
};

export const unpublishAnnouncementRecord = async (
  announcementId,
  connection = pool,
) => {
  await connection.execute(
    `
        UPDATE announcements
        SET publication_status = 'draft'
        WHERE id = ?
      `,
    [announcementId],
  );

  return findAnnouncementById(announcementId, connection);
};

export const deleteAnnouncementRecord = async (
  announcementId,
  connection = pool,
) => {
  const [result] = await connection.execute(
    `
          DELETE FROM announcements
          WHERE id = ?
        `,
    [announcementId],
  );

  return result.affectedRows > 0;
};

export const findAnnouncements = async ({
  page,
  limit,
  search,
  publicationStatus,
  priority,
  targetType,
  sortOrder,
}) => {
  const conditions = [];
  const values = [];

  if (search) {
    const pattern = `%${search}%`;

    conditions.push(`
        (
          a.title LIKE ?
          OR a.content LIKE ?
        )
      `);

    values.push(pattern, pattern);
  }

  if (publicationStatus) {
    conditions.push("a.publication_status = ?");

    values.push(publicationStatus);
  }

  if (priority) {
    conditions.push("a.priority = ?");

    values.push(priority);
  }

  if (targetType) {
    conditions.push("a.target_type = ?");

    values.push(targetType);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const direction = sortOrder === "asc" ? "ASC" : "DESC";

  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(
    `
          SELECT
            ${announcementSelect}
          FROM announcements AS a
          INNER JOIN users AS creator
            ON creator.id = a.created_by
          LEFT JOIN student_profiles
            AS target_student
            ON target_student.id =
              a.target_student_id
          LEFT JOIN users AS target_user
            ON target_user.id =
              target_student.user_id
          ${whereClause}
          ORDER BY
            a.created_at ${direction}
          LIMIT ? OFFSET ?
        `,
    [...values, limit, offset],
  );

  const [countRows] = await pool.execute(
    `
          SELECT COUNT(*) AS total
          FROM announcements AS a
          ${whereClause}
        `,
    values,
  );

  return {
    announcements: rows,
    total: Number(countRows[0].total),
  };
};

export const findVisibleAnnouncements = async ({
  userId,
  role,
  studentProfileId,
  limit,
  priority,
}) => {
  const conditions = [
    "a.publication_status = 'published'",

    `
        (
          a.publish_at IS NULL
          OR a.publish_at <= CURRENT_TIMESTAMP
        )
      `,

    `
        (
          a.expires_at IS NULL
          OR a.expires_at > CURRENT_TIMESTAMP
        )
      `,

    `
        (
          a.target_type = 'all'
          OR (
            a.target_type = 'role'
            AND a.target_role = ?
          )
          OR (
            a.target_type = 'student'
            AND a.target_student_id = ?
          )
        )
      `,
  ];

  const values = [role, studentProfileId || 0];

  if (priority) {
    conditions.push("a.priority = ?");

    values.push(priority);
  }

  const [rows] = await pool.execute(
    `
          SELECT
            ${announcementSelect}
          FROM announcements AS a
          INNER JOIN users AS creator
            ON creator.id = a.created_by
          LEFT JOIN student_profiles
            AS target_student
            ON target_student.id =
              a.target_student_id
          LEFT JOIN users AS target_user
            ON target_user.id =
              target_student.user_id
          WHERE ${conditions.join(" AND ")}
          ORDER BY
            FIELD(
              a.priority,
              'urgent',
              'high',
              'normal',
              'low'
            ),
            COALESCE(
              a.publish_at,
              a.created_at
            ) DESC
          LIMIT ?
        `,
    [...values, limit],
  );

  return rows;
};
