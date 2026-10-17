import mysql from "mysql2/promise";
import fs from "node:fs";

const useSSL = process.env.DB_SSL === "true";
const caPath = process.env.DB_SSL_CA_PATH;

let ssl;

if (useSSL) {
  if (!caPath) {
    throw new Error(
      "DB_SSL_CA_PATH is required when DB_SSL=true. " +
        "Configure the Aiven CA certificate before connecting.",
    );
  }

  if (!fs.existsSync(caPath)) {
    throw new Error(`Database CA certificate not found at: ${caPath}`);
  }

  ssl = {
    ca: fs.readFileSync(caPath, "utf8"),
    rejectUnauthorized: true,
  };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ...(ssl ? { ssl } : {}),

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export default pool;
