import "dotenv/config";

import pool from "../config/database.js";
import { testDatabaseConnection } from "../config/database.js";
import { hashPassword } from "../utils/password.js";

const seedUsers = async () => {
  try {
    await testDatabaseConnection();

    const adminPassword = await hashPassword("Admin@123");

    const studentPassword = await hashPassword("Student@123");

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `
          INSERT INTO users (
            first_name,
            last_name,
            email,
            password_hash,
            role,
            is_active
          )
          VALUES (?, ?, ?, ?, 'admin', TRUE)
          ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            password_hash = VALUES(password_hash),
            role = 'admin',
            is_active = TRUE
        `,
        ["Portal", "Administrator", "admin@studentportal.local", adminPassword],
      );

      await connection.execute(
        `
          INSERT INTO users (
            first_name,
            last_name,
            email,
            password_hash,
            role,
            is_active
          )
          VALUES (?, ?, ?, ?, 'student', TRUE)
          ON DUPLICATE KEY UPDATE
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            password_hash = VALUES(password_hash),
            role = 'student',
            is_active = TRUE
        `,
        ["Demo", "Student", "student@studentportal.local", studentPassword],
      );

      const [studentRows] = await connection.execute(
        `
            SELECT id
            FROM users
            WHERE email = ?
            LIMIT 1
          `,
        ["student@studentportal.local"],
      );

      const studentUser = studentRows[0];

      await connection.execute(
        `
          INSERT INTO student_profiles (
            user_id,
            student_number,
            phone_number,
            programme,
            year_level,
            admission_date,
            city,
            province
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            student_number =
              VALUES(student_number),
            phone_number =
              VALUES(phone_number),
            programme =
              VALUES(programme),
            year_level =
              VALUES(year_level),
            admission_date =
              VALUES(admission_date),
            city =
              VALUES(city),
            province =
              VALUES(province)
        `,
        [
          studentUser.id,
          "STU2026001",
          "0712345678",
          "Diploma in Information Technology",
          2,
          "2025-02-03",
          "Johannesburg",
          "Gauteng",
        ],
      );

      await connection.commit();

      console.log("Demo users created successfully.");

      console.log("");
      console.log("Administrator:");
      console.log("Email: admin@studentportal.local");
      console.log("Password: Admin@123");

      console.log("");
      console.log("Student:");
      console.log("Email: student@studentportal.local");
      console.log("Password: Student@123");
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("User seeding failed:", error.message);

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedUsers();
