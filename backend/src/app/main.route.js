import express from "express";

import chatRouter from "../api/chat/chat.route.js";
import authRouter from "../api/auth/auth.route.js";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/chat", chatRouter);

export default router;
