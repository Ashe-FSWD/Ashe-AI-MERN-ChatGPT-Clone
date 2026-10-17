const errorHandler = (err, req, res, next) => {
  console.error("=================================");
  console.error("ERROR MESSAGE:", err.message);
  console.error("ERROR STACK:", err.stack);
  console.error("=================================");

  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = "Something went wrong. Please try again later.";

  // Invalid request or validation errors.
  if (statusCode >= 400 && statusCode < 500) {
    message = err.message || "Invalid request.";
  }

  // MySQL database errors.
  if (err.code && String(err.code).startsWith("ER_")) {
    statusCode = 503;
    message = "A database error occurred. Please try again later.";
  }

  // AI provider errors.
  if (
    err.name === "ApiError" ||
    /gemini|google genai|model not found/i.test(err.message || "")
  ) {
    statusCode = 502;
    message =
      "The AI provider is currently unavailable. Please try again later.";
  }

  // Never expose internal details for server errors.
  if (statusCode >= 500) {
    if (statusCode !== 502 && statusCode !== 503) {
      statusCode = 500;
      message = "Something went wrong. Please try again later.";
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;
