import pool from "../config/database.js";

export const getAdminDashboardStatistics = async () => {
  const [
    [userRows],
    [courseRows],
    [enrollmentRows],
    [resultRows],
    [announcementRows],
    [recentStudents],
  ] = await Promise.all([
    pool.execute(`
        SELECT
          COUNT(*) AS total_users,

          SUM(
            role = 'student'
          ) AS total_students,

          SUM(
            role = 'admin'
          ) AS total_administrators,

          SUM(
            is_active = 1
          ) AS active_users,

          SUM(
            is_active = 0
          ) AS inactive_users
        FROM users
      `),

    pool.execute(`
        SELECT
          COUNT(*) AS total_courses,

          SUM(
            is_active = 1
          ) AS active_courses,

          SUM(
            is_active = 0
          ) AS inactive_courses,

          COALESCE(
            SUM(credit_value),
            0
          ) AS total_course_credits
        FROM courses
      `),

    pool.execute(`
        SELECT
          COUNT(*) AS total_enrollments,

          SUM(
            status = 'registered'
          ) AS registered_enrollments,

          SUM(
            status = 'cancelled'
          ) AS cancelled_enrollments,

          SUM(
            status = 'completed'
          ) AS completed_enrollments
        FROM enrollments
      `),

    pool.execute(`
        SELECT
          COUNT(*) AS total_results,

          SUM(
            publication_status =
              'published'
          ) AS published_results,

          SUM(
            publication_status =
              'draft'
          ) AS draft_results,

          SUM(
            outcome = 'pass'
          ) AS passed_results,

          SUM(
            outcome = 'fail'
          ) AS failed_results,

          ROUND(
            AVG(final_mark),
            2
          ) AS average_final_mark
        FROM results
        WHERE final_mark IS NOT NULL
      `),

    pool.execute(`
        SELECT
          COUNT(*) AS total_announcements,

          SUM(
            publication_status =
              'published'
          ) AS published_announcements,

          SUM(
            publication_status =
              'draft'
          ) AS draft_announcements
        FROM announcements
      `),

    pool.execute(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.created_at,
          sp.student_number,
          sp.programme
        FROM student_profiles AS sp
        INNER JOIN users AS u
          ON u.id = sp.user_id
        ORDER BY
          u.created_at DESC
        LIMIT 5
      `),
  ]);

  return {
    users: userRows[0],
    courses: courseRows[0],
    enrollments: enrollmentRows[0],
    results: resultRows[0],
    announcements: announcementRows[0],
    recentStudents,
  };
};

export const getStudentDashboardStatistics = async (userId) => {
  const [[profileRows], [enrollmentRows], [resultRows], [recentResults]] =
    await Promise.all([
      pool.execute(
        `
          SELECT
            sp.id,
            sp.student_number,
            sp.programme,
            sp.year_level,
            u.first_name,
            u.last_name,
            u.email
          FROM student_profiles AS sp
          INNER JOIN users AS u
            ON u.id = sp.user_id
          WHERE sp.user_id = ?
          LIMIT 1
        `,
        [userId],
      ),

      pool.execute(
        `
          SELECT
            COUNT(*) AS total_enrollments,

            SUM(
              e.status = 'registered'
            ) AS registered_courses,

            SUM(
              e.status = 'completed'
            ) AS completed_courses,

            SUM(
              e.status = 'cancelled'
            ) AS cancelled_courses
          FROM enrollments AS e
          INNER JOIN student_profiles AS sp
            ON sp.id = e.student_id
          WHERE sp.user_id = ?
        `,
        [userId],
      ),

      pool.execute(
        `
          SELECT
            COUNT(*) AS published_results,

            SUM(
              r.outcome = 'pass'
            ) AS passed_courses,

            SUM(
              r.outcome = 'fail'
            ) AS failed_courses,

            ROUND(
              AVG(r.final_mark),
              2
            ) AS average_mark,

            COALESCE(
              SUM(
                CASE
                  WHEN r.outcome = 'pass'
                  THEN c.credit_value
                  ELSE 0
                END
              ),
              0
            ) AS earned_credits,

            ROUND(
              SUM(
                r.grade_point *
                c.credit_value
              ) /
              NULLIF(
                SUM(c.credit_value),
                0
              ),
              2
            ) AS gpa
          FROM results AS r
          INNER JOIN enrollments AS e
            ON e.id = r.enrollment_id
          INNER JOIN student_profiles AS sp
            ON sp.id = e.student_id
          INNER JOIN courses AS c
            ON c.id = e.course_id
          WHERE
            sp.user_id = ?
            AND r.publication_status =
              'published'
            AND r.final_mark IS NOT NULL
        `,
        [userId],
      ),

      pool.execute(
        `
          SELECT
            r.id,
            r.final_mark,
            r.grade,
            r.outcome,
            r.published_at,
            c.course_code,
            c.course_name,
            c.credit_value
          FROM results AS r
          INNER JOIN enrollments AS e
            ON e.id = r.enrollment_id
          INNER JOIN student_profiles AS sp
            ON sp.id = e.student_id
          INNER JOIN courses AS c
            ON c.id = e.course_id
          WHERE
            sp.user_id = ?
            AND r.publication_status =
              'published'
          ORDER BY
            r.published_at DESC
          LIMIT 5
        `,
        [userId],
      ),
    ]);

  return {
    profile: profileRows[0] || null,

    enrollments: enrollmentRows[0],

    results: resultRows[0],

    recentResults,
  };
};
