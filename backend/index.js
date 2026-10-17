import "dotenv/config";
import express from "express";
import cors from "cors";

import db from "./db/db.config.js";
import mainRouter from "./src/app/main.route.js";
import logger from "./src/middleware/logger.js";
import errorHandler from "./src/middleware/error-handler.js";

const app = express();
const PORT = Number(process.env.PORT) || 3777;

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl/health checks) and explicitly configured sites only.
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(logger);

app.get("/", (_req, res) => {
  res.status(200).json({ success: true, message: "GPT Clone API is running" });
});

// Lightweight platform health check. Database readiness is verified at startup.
app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.use("/api", mainRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

async function startServer() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.ping();
    console.log("Database connection verified.");
  } catch (error) {
    console.error(
      "Unable to connect to the database. Check DB_* environment variables and network access.",
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
