const requiredVariables = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_NAME",
  "JWT_SECRET",
];

export const validateEnvironment = () => {
  const missingVariables = requiredVariables.filter(
    (variableName) => !process.env[variableName],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(", ")}`,
    );
  }
};
