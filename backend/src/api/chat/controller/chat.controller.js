const {
  createConversationService,
  getConversationService,
  getChatsService,
} = require("../service/chat.service");

const createConversationController = async (req, res, next) => {
  try {
    const { question, chatId } = req.body || {};

    const result = await createConversationService(
      req.user.id,
      question,
      chatId,
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

const getConversationController = async (req, res, next) => {
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

const getChatsController = async (req, res, next) => {
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

module.exports = {
  createConversationController,
  getConversationController,
  getChatsController,
};
