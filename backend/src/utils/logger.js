const shouldSuppressLogs = () => process.env.NODE_ENV === "test";

const isProduction = () => process.env.NODE_ENV === "production";

const writeLog = (level, message, metadata = {}) => {
  if (shouldSuppressLogs()) {
    return;
  }

  if (isProduction()) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };
    const line = JSON.stringify(entry);

    if (level === "error") {
      console.error(line);
      return;
    }

    if (level === "warn") {
      console.warn(line);
      return;
    }

    console.log(line);
    return;
  }

  const output =
    Object.keys(metadata).length > 0 ? [message, metadata] : [message];

  if (level === "error") {
    console.error(...output);
    return;
  }

  if (level === "warn") {
    console.warn(...output);
    return;
  }

  console.log(...output);
};

const logger = {
  error: (message, metadata) => writeLog("error", message, metadata),
  info: (message, metadata) => writeLog("info", message, metadata),
  warn: (message, metadata) => writeLog("warn", message, metadata),
};

export default logger;
