const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Please log in to continue.",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new Error("JWT_SECRET is not configured."));
  }

  try {
    const payload = jwt.verify(token, secret);

    if (
      !Number.isInteger(payload.userId) &&
      typeof payload.userId !== "number" &&
      typeof payload.userId !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = { id: payload.userId };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
};

module.exports = requireAuth;
