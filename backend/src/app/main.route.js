const express = require("express");

const chatRouter = require("../api/chat/chat.route");
const authRouter = require("../api/auth/auth.route");

const mainRouter = express.Router();

mainRouter.use("/auth", authRouter);
mainRouter.use("/chat", chatRouter);

module.exports = mainRouter;
