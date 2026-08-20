import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import mysql from "mysql2/promise";

const rootDir = path.resolve(import.meta.dirname, "../../..");
const migrationsDir = path.join(rootDir, "database", "migrations");
const migrationTableName = "schema_migrations";

const usage = `
Usage:
  node src/scripts/runMigrations.js [options]

Options:
  --status       Show applied and pending migrations.
  --dry-run      Show pending migrations without executing SQL.
  --baseline     Mark pending migrations as already applied.
  --help         Show this help text.

The runner connects to DB_NAME from the environment and ignores USE statements
inside migration files so deployments are not tied to a hard-coded database.
`;

const parseArgs = (args) => {
  const options = {
    baseline: false,
    dryRun: false,
    help: false,
    status: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "--baseline":
        options.baseline = true;
        break;

      case "--dry-run":
        options.dryRun = true;
        break;

      case "--help":
      case "-h":
        options.help = true;
        break;

      case "--status":
        options.status = true;
        break;

      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  const selectedModes = [
    options.baseline,
    options.dryRun,
    options.status,
  ].filter(Boolean);

  if (selectedModes.length > 1) {
    throw new Error("Choose only one of --baseline, --dry-run, or --status.");
  }

  return options;
};

const assertRequiredEnvironment = () => {
  const requiredVariables = ["DB_HOST", "DB_PORT", "DB_USER", "DB_NAME"];
  const missingVariables = requiredVariables.filter(
    (variableName) => !process.env[variableName],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(", ")}`,
    );
  }
};

const createConnection = () =>
  mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    decimalNumbers: true,
  });

const ensureMigrationTable = async (connection) => {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${migrationTableName} (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      execution_ms INT UNSIGNED NULL,

      UNIQUE KEY uq_schema_migrations_name (migration_name)
    )
  `);
};

const getAppliedMigrations = async (connection) => {
  const [rows] = await connection.query(`
    SELECT
      migration_name,
      checksum,
      applied_at,
      execution_ms
    FROM ${migrationTableName}
    ORDER BY migration_name ASC
  `);

  return new Map(rows.map((row) => [row.migration_name, row]));
};

const splitSqlStatements = (sql) => {
  const statements = [];
  let current = "";
  let quote = null;
  let isLineComment = false;
  let isBlockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    const previous = sql[index - 1];

    if (isLineComment) {
      current += char;

      if (char === "\n") {
        isLineComment = false;
      }

      continue;
    }

    if (isBlockComment) {
      current += char;

      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        isBlockComment = false;
      }

      continue;
    }

    if (!quote && char === "-" && next === "-") {
      isLineComment = true;
      current += char;
      continue;
    }

    if (!quote && char === "/" && next === "*") {
      isBlockComment = true;
      current += char;
      continue;
    }

    if (
      ["'", '"', "`"].includes(char) &&
      (!quote || quote === char) &&
      previous !== "\\"
    ) {
      quote = quote === char ? null : char;
      current += char;
      continue;
    }

    if (!quote && char === ";") {
      const statement = current.trim();

      if (statement) {
        statements.push(statement);
      }

      current = "";
      continue;
    }

    current += char;
  }

  const finalStatement = current.trim();

  if (finalStatement) {
    statements.push(finalStatement);
  }

  return statements;
};

const loadMigrationFiles = async () => {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const migrationFileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    migrationFileNames.map(async (name) => {
      const filePath = path.join(migrationsDir, name);
      const sql = await fs.readFile(filePath, "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      const statements = splitSqlStatements(sql).filter(
        (statement) => !/^USE\s+/i.test(statement),
      );

      return {
        checksum,
        name,
        statements,
      };
    }),
  );
};

const validateChecksums = (migrations, appliedMigrations) => {
  for (const migration of migrations) {
    const applied = appliedMigrations.get(migration.name);

    if (applied && applied.checksum !== migration.checksum) {
      throw new Error(
        [
          `Checksum mismatch for ${migration.name}.`,
          "The migration file changed after it was recorded as applied.",
        ].join(" "),
      );
    }
  }
};

const recordMigration = async (connection, migration, executionMs) => {
  await connection.execute(
    `
      INSERT INTO ${migrationTableName} (
        migration_name,
        checksum,
        execution_ms
      )
      VALUES (?, ?, ?)
    `,
    [migration.name, migration.checksum, executionMs],
  );
};

const applyMigration = async (connection, migration) => {
  const startedAt = Date.now();

  for (const [index, statement] of migration.statements.entries()) {
    try {
      await connection.query(statement);
    } catch (error) {
      throw new Error(
        `Failed ${migration.name} at statement ${index + 1}: ${error.message}`,
      );
    }
  }

  const executionMs = Date.now() - startedAt;

  await recordMigration(connection, migration, executionMs);

  return executionMs;
};

const withMigrationLock = async (connection, task) => {
  const lockName = `${process.env.DB_NAME}:${migrationTableName}`;
  const [[lockRow]] = await connection.execute(
    "SELECT GET_LOCK(?, 30) AS acquired",
    [lockName],
  );

  if (lockRow.acquired !== 1) {
    throw new Error("Could not acquire migration lock.");
  }

  try {
    return await task();
  } finally {
    await connection.execute("SELECT RELEASE_LOCK(?)", [lockName]);
  }
};

const printStatus = (migrations, appliedMigrations) => {
  for (const migration of migrations) {
    const applied = appliedMigrations.get(migration.name);
    const status = applied ? "applied" : "pending";
    const suffix = applied ? ` at ${applied.applied_at.toISOString()}` : "";

    console.log(`${status.padEnd(8)} ${migration.name}${suffix}`);
  }
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage.trim());
    return;
  }

  assertRequiredEnvironment();

  const connection = await createConnection();

  try {
    await ensureMigrationTable(connection);

    await withMigrationLock(connection, async () => {
      const migrations = await loadMigrationFiles();
      const appliedMigrations = await getAppliedMigrations(connection);

      validateChecksums(migrations, appliedMigrations);

      const pendingMigrations = migrations.filter(
        (migration) => !appliedMigrations.has(migration.name),
      );

      if (options.status) {
        printStatus(migrations, appliedMigrations);
        return;
      }

      if (pendingMigrations.length === 0) {
        console.log("No pending migrations.");
        return;
      }

      if (options.dryRun) {
        for (const migration of pendingMigrations) {
          console.log(
            `pending  ${migration.name} (${migration.statements.length} statements)`,
          );
        }

        return;
      }

      if (options.baseline) {
        for (const migration of pendingMigrations) {
          await recordMigration(connection, migration, 0);
          console.log(`Marked ${migration.name} as applied.`);
        }

        return;
      }

      for (const migration of pendingMigrations) {
        const executionMs = await applyMigration(connection, migration);

        console.log(`Applied ${migration.name} in ${executionMs}ms.`);
      }
    });
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
