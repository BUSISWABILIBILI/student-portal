const requiredVariables = [
  "PORT",
  "CLIENT_URL",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_NAME",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
];

const allowedNodeEnvironments = new Set(["development", "test", "production"]);

const placeholderSecrets = new Set([
  "replace_with_a_long_random_secret",
  "ci-test-secret-change-before-production",
  "test-secret",
]);

const assertPort = (name, value) => {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }
};

const assertClientUrl = (value) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("CLIENT_URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("CLIENT_URL must use http or https.");
  }

  if (
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash ||
    value.endsWith("/")
  ) {
    throw new Error(
      "CLIENT_URL must be an origin without a path, query, or hash.",
    );
  }
};

const assertJwtExpiry = (value) => {
  if (!/^\d+(ms|s|m|h|d|w|y)?$/.test(value)) {
    throw new Error(
      "JWT_EXPIRES_IN must be a duration such as 15m, 1h, 1d, or 7d.",
    );
  }
};

const assertProductionSecret = (value) => {
  if (value.length < 32 || placeholderSecrets.has(value)) {
    throw new Error(
      [
        "JWT_SECRET must be at least 32 characters",
        "and not use an example value in production.",
      ].join(" "),
    );
  }
};

export const validateEnvironment = (env = process.env) => {
  const missingVariables = requiredVariables.filter(
    (variableName) => !env[variableName]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(", ")}`,
    );
  }

  const nodeEnvironment = env.NODE_ENV || "development";

  if (!allowedNodeEnvironments.has(nodeEnvironment)) {
    throw new Error(
      "NODE_ENV must be one of development, test, or production.",
    );
  }

  assertPort("PORT", env.PORT);
  assertPort("DB_PORT", env.DB_PORT);
  assertClientUrl(env.CLIENT_URL);
  assertJwtExpiry(env.JWT_EXPIRES_IN);

  if (nodeEnvironment === "production") {
    assertProductionSecret(env.JWT_SECRET);
  }
};
