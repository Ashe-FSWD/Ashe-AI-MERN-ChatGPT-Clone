import {
  createConversationService,
  getConversationService,
  getChatsService,
} from "../service/chat.service.js";
// import {
//   createConversationController,
//   getConversationController,
//   getChatsController,
// } from "./controller/chat.controller.js";

export const createConversationController = async (req, res, next) => {
  try {
    const { question, message, chatId } = req.body || {};
    const prompt = typeof question === "string" ? question : message;
    const files = req.files || [];

    const result = await createConversationService(
      req.user.id,
      prompt,
      chatId,
      files,
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationController = async (req, res, next) => {
  try {
    const conversations = await getConversationService(
      req.user.id,
      req.query.chatId,
    );

    res.json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
};

export const getChatsController = async (req, res, next) => {
  try {
    const chats = await getChatsService(req.user.id);

    res.json({
      success: true,
      data: { chats },
    });
  } catch (error) {
    next(error);
  }
};
