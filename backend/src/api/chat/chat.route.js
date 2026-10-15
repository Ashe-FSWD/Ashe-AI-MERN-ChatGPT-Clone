const express = require("express");
const requireAuth = require("../../middleware/auth");

const {
  createConversationController,
  getConversationController,
  getChatsController,
} = require("./controller/chat.controller");

const chatRouter = express.Router();

// All chat endpoints require a valid login.
chatRouter.use(requireAuth);

chatRouter.get("/conversations", getConversationController);
chatRouter.get("/chats", getChatsController);
chatRouter.post("/conversations", createConversationController);

module.exports = chatRouter;
