import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../../db/db.config.js";

const authRouter = express.Router();

const createToken = (user) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ userId: user.id }, secret, {
    expiresIn: "1d",
  });
};

authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      password.length < 12 ||
      password.length > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide a name, valid email, and password of 12–72 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (normalizedName.length > 100 || normalizedEmail.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Name or email is too long.",
      });
    }

    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail],
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [normalizedName, normalizedEmail, passwordHash],
    );

    const user = {
      id: result.insertId,
      name: normalizedName,
      email: normalizedEmail,
    };

    return res.status(201).json({
      success: true,
      data: {
        user,
        token: createToken(user),
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const [rows] = await db.execute(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email.trim().toLowerCase()],
    );

    const userRow = rows[0];

    if (!userRow || !(await bcrypt.compare(password, userRow.password_hash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
    };

    return res.json({
      success: true,
      data: {
        user,
        token: createToken(user),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default authRouter;
