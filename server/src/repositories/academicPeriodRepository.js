import pool from "../config/database.js";

export const findAcademicPeriodById = async (
  academicPeriodId,
  connection = pool,
) => {
  const [rows] = await connection.execute(
    `
      SELECT
        id,
        name,
        academic_year,
        start_date,
        end_date,
        registration_start_date,
        registration_end_date,
        is_active,
        created_at
      FROM academic_periods
      WHERE id = ?
      LIMIT 1
    `,
    [academicPeriodId],
  );

  return rows[0] || null;
};

export const findActiveAcademicPeriods = async () => {
  const [rows] = await pool.execute(
    `
        SELECT
          id,
          name,
          academic_year,
          start_date,
          end_date,
          registration_start_date,
          registration_end_date,
          is_active
        FROM academic_periods
        WHERE is_active = TRUE
        ORDER BY academic_year DESC, start_date ASC
      `,
  );

  return rows;
};
