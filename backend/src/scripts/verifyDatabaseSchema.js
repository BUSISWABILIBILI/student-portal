import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import mysql from "mysql2/promise";

const rootDir = path.resolve(import.meta.dirname, "../..");
const schemaPath = path.join(rootDir, "database", "schema.sql");
const allowedExtraTables = new Set(["schema_migrations"]);

const usage = `
Usage:
  node src/scripts/verifyDatabaseSchema.js [options]

Options:
  --help    Show this help text.

The verifier compares the configured live database against
backend/database/schema.sql. It checks tables, columns, required indexes,
foreign keys, and check constraints.
`;

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
  });

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

const splitTableDefinitionItems = (body) => {
  const items = [];
  let current = "";
  let quote = null;
  let depth = 0;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const previous = body[index - 1];

    if (
      ["'", '"', "`"].includes(char) &&
      (!quote || quote === char) &&
      previous !== "\\"
    ) {
      quote = quote === char ? null : char;
      current += char;
      continue;
    }

    if (!quote && char === "(") {
      depth += 1;
    }

    if (!quote && char === ")") {
      depth -= 1;
    }

    if (!quote && depth === 0 && char === ",") {
      const item = current.trim();

      if (item) {
        items.push(item);
      }

      current = "";
      continue;
    }

    current += char;
  }

  const finalItem = current.trim();

  if (finalItem) {
    items.push(finalItem);
  }

  return items;
};

const parseCreateTable = (statement) => {
  const tableMatch = statement.match(/CREATE\s+TABLE\s+`?([a-zA-Z0-9_]+)`?/i);

  if (!tableMatch) {
    return null;
  }

  const openingParenthesis = statement.indexOf("(");
  const closingParenthesis = statement.lastIndexOf(")");

  if (openingParenthesis === -1 || closingParenthesis === -1) {
    throw new Error(`Could not parse CREATE TABLE for ${tableMatch[1]}.`);
  }

  const table = {
    checks: new Set(),
    columns: new Set(),
    foreignKeys: new Set(),
    indexes: new Set(),
    name: tableMatch[1],
  };

  const body = statement.slice(openingParenthesis + 1, closingParenthesis);

  for (const item of splitTableDefinitionItems(body)) {
    const normalizedItem = item.replace(/\s+/g, " ").trim();

    if (/^PRIMARY\s+KEY/i.test(normalizedItem)) {
      table.indexes.add("PRIMARY");
      continue;
    }

    const namedIndex = normalizedItem.match(
      /^(?:UNIQUE\s+)?(?:KEY|INDEX)\s+`?([a-zA-Z0-9_]+)`?/i,
    );

    if (namedIndex) {
      table.indexes.add(namedIndex[1]);
      continue;
    }

    const namedConstraint = normalizedItem.match(
      /^CONSTRAINT\s+`?([a-zA-Z0-9_]+)`?\s+(FOREIGN\s+KEY|CHECK)\b/i,
    );

    if (namedConstraint) {
      const [, constraintName, constraintType] = namedConstraint;

      if (/FOREIGN\s+KEY/i.test(constraintType)) {
        table.foreignKeys.add(constraintName);
      } else {
        table.checks.add(constraintName);
      }

      continue;
    }

    const column = normalizedItem.match(/^`?([a-zA-Z0-9_]+)`?\s+/);

    if (column) {
      table.columns.add(column[1]);
    }
  }

  return table;
};

const parseExpectedSchema = async () => {
  const sql = await fs.readFile(schemaPath, "utf8");
  const tables = new Map();

  for (const statement of splitSqlStatements(sql)) {
    if (!/^CREATE\s+TABLE\b/i.test(statement)) {
      continue;
    }

    const table = parseCreateTable(statement);

    if (table) {
      tables.set(table.name, table);
    }
  }

  return tables;
};

const toSet = (rows, property) => new Set(rows.map((row) => row[property]));

const getActualSchema = async (connection) => {
  const databaseName = process.env.DB_NAME;
  const [tableRows] = await connection.execute(
    `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
    `,
    [databaseName],
  );
  const actualSchema = new Map();

  for (const { TABLE_NAME: tableName } of tableRows) {
    const [columnRows] = await connection.execute(
      `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
      `,
      [databaseName, tableName],
    );

    const [indexRows] = await connection.execute(
      `
        SELECT DISTINCT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
      `,
      [databaseName, tableName],
    );

    const [constraintRows] = await connection.execute(
      `
        SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
      `,
      [databaseName, tableName],
    );

    actualSchema.set(tableName, {
      checks: new Set(
        constraintRows
          .filter((row) => row.CONSTRAINT_TYPE === "CHECK")
          .map((row) => row.CONSTRAINT_NAME),
      ),
      columns: toSet(columnRows, "COLUMN_NAME"),
      foreignKeys: new Set(
        constraintRows
          .filter((row) => row.CONSTRAINT_TYPE === "FOREIGN KEY")
          .map((row) => row.CONSTRAINT_NAME),
      ),
      indexes: toSet(indexRows, "INDEX_NAME"),
      name: tableName,
    });
  }

  return actualSchema;
};

const compareSets = ({
  actual,
  expected,
  objectName,
  problems,
  reportExtras = false,
  tableName,
}) => {
  for (const name of expected) {
    if (!actual.has(name)) {
      problems.push(`Missing ${objectName}: ${tableName}.${name}`);
    }
  }

  if (!reportExtras) {
    return;
  }

  for (const name of actual) {
    if (!expected.has(name)) {
      problems.push(`Unexpected ${objectName}: ${tableName}.${name}`);
    }
  }
};

const compareSchemas = (expectedSchema, actualSchema) => {
  const problems = [];

  for (const tableName of expectedSchema.keys()) {
    if (!actualSchema.has(tableName)) {
      problems.push(`Missing table: ${tableName}`);
    }
  }

  for (const tableName of actualSchema.keys()) {
    if (!expectedSchema.has(tableName) && !allowedExtraTables.has(tableName)) {
      problems.push(`Unexpected table: ${tableName}`);
    }
  }

  for (const [tableName, expectedTable] of expectedSchema.entries()) {
    const actualTable = actualSchema.get(tableName);

    if (!actualTable) {
      continue;
    }

    compareSets({
      actual: actualTable.columns,
      expected: expectedTable.columns,
      objectName: "column",
      problems,
      reportExtras: true,
      tableName,
    });
    compareSets({
      actual: actualTable.indexes,
      expected: expectedTable.indexes,
      objectName: "index",
      problems,
      tableName,
    });
    compareSets({
      actual: actualTable.foreignKeys,
      expected: expectedTable.foreignKeys,
      objectName: "foreign key",
      problems,
      tableName,
    });
    compareSets({
      actual: actualTable.checks,
      expected: expectedTable.checks,
      objectName: "check constraint",
      problems,
      tableName,
    });
  }

  return problems;
};

const run = async () => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage.trim());
    return;
  }

  assertRequiredEnvironment();

  const expectedSchema = await parseExpectedSchema();
  const connection = await createConnection();

  try {
    const actualSchema = await getActualSchema(connection);
    const problems = compareSchemas(expectedSchema, actualSchema);

    if (problems.length > 0) {
      console.error("Database schema verification failed:");

      for (const problem of problems) {
        console.error(`- ${problem}`);
      }

      process.exitCode = 1;
      return;
    }

    console.log("Live database schema matches backend/database/schema.sql.");
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
