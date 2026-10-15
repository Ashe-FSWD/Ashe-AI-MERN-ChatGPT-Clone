const errorHandler = (err, req, res, next) => {
  console.error("=================================");
  console.error("ERROR MESSAGE:", err.message);
  console.error("ERROR STACK:", err.stack);
  console.error("=================================");

  if (res.headersSent) {
    return next(err);
  }

  let statusCode =
    err.statusCode || err.status || 500;

  let message = err.message;

  // MySQL driver errors (e.g. ER_DUP_ENTRY, ER_NO_SUCH_TABLE)
  if (
    err.code &&
    String(err.code).startsWith("ER_")
  ) {
    statusCode = 503;
    message =
      "A database error occurred. Please try again later.";
  }

  // Upstream AI provider errors
  // (e.g. invalid model, quota, network to Google)
  if (
    err.name === "ApiError" ||
    /gemini|google genai|model not found/i.test(
      err.message || ""
    )
  ) {
    statusCode = 502;
    message =
      "The AI provider is currently unavailable. Please try again later.";
  }

  // Never leak internal details for unexpected errors
  if (statusCode === 500) {
    message = "Something went wrong try again later";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;