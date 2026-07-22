const handleDatabaseError = (error) => {
  switch (error.code) {
    case "ER_DUP_ENTRY":
      return {
        statusCode: 409,
        message: "A record with these details already exists.",
      };

    case "ER_NO_REFERENCED_ROW_2":
      return {
        statusCode: 400,
        message: "The related record does not exist.",
      };

    case "ER_ROW_IS_REFERENCED_2":
      return {
        statusCode: 409,
        message:
          "This record cannot be removed because another record depends on it.",
      };

    default:
      return null;
  }
};

const errorHandler = (error, req, res, next) => {
  const databaseError = handleDatabaseError(error);

  const statusCode = databaseError?.statusCode || error.statusCode || 500;

  const message =
    databaseError?.message ||
    error.message ||
    "An unexpected server error occurred.";

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.details && {
      details: error.details,
    }),
    ...(process.env.NODE_ENV !== "production" && {
      stack: error.stack,
    }),
  });
};

export default errorHandler;
