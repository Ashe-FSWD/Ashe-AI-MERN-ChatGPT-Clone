import "dotenv/config";
import express from "express";
import cors from "cors";

import db from "./db/db.config.js";
import mainRouter from "./src/app/main.route.js";
import logger from "./src/middleware/logger.js";
import errorHandler from "./src/middleware/error-handler.js";

const app = express();
const PORT = Number(process.env.PORT) || 3777;

// Allow the local frontend and the deployed Vercel frontend.
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://ashe-ai-gpt-app-clone.vercel.app",
];

const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.disable("x-powered-by");

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as curl and
      // server-to-server requests. Browser origins must be explicitly allowed.
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
        return callback(null, true);
      }

      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(logger);

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "GPT Clone API is running",
  });
});

// Health-check endpoint for Render
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
});

// API routes
app.use("/api", mainRouter);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Central error handler
app.use(errorHandler);

// Verify database connectivity before starting the server
async function startServer() {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.ping();

    console.log("Database connection verified.");
  } catch (error) {
    console.error(
      "Unable to connect to the database. Check DB_* environment variables, " +
        "database SSL settings, and network access.",
      error.message,
    );

    process.exitCode = 1;
    return;
  } finally {
    connection?.release();
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API listening on port ${PORT}`);
  });
}

startServer();
