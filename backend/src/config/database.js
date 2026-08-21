import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  decimalNumbers: true,
});

export const checkDatabaseConnection = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.query("SELECT 1");
  } finally {
    connection.release();
  }
};

export const testDatabaseConnection = async () => {
  await checkDatabaseConnection();
  console.log("MySQL database connected successfully.");
};

export const closeDatabaseConnection = () => pool.end();

export default pool;
