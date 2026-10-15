const db = require("../../../../db/db.config");
const { geminiClient, geminiModel } = require("../../../utils/gemini");
const SYSTEM_PROMPT = require("../../../utils/system-prompt");

const formatConversation = (row) => ({
  id: row.id,
  chatId: row.chat_id,
  role: row.role,
  content: row.content,
  tokenCount: row.token_count,
  createdAt: row.created_at,
});

const getChatsService = async (userId) => {
  const [rows] = await db.execute(
    `SELECT id, title, created_at, updated_at
     FROM chats
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId],
  );

  return rows;
};

const getConversationService = async (userId, chatId) => {
  if (!chatId) {
    const [rows] = await db.execute(
      `SELECT m.id, m.chat_id, m.role, m.content,
              m.token_count, m.created_at
       FROM messages m
       JOIN chats c ON c.id = m.chat_id
       WHERE c.user_id = ?
       ORDER BY m.id DESC
       LIMIT 100`,
      [userId],
    );

    return rows.reverse().map(formatConversation);
  }

  const [ownedChats] = await db.execute(
    "SELECT id FROM chats WHERE id = ? AND user_id = ?",
    [chatId, userId],
  );

  if (!ownedChats.length) {
    const error = new Error("Chat not found.");
    error.statusCode = 404;
    throw error;
  }

  const [rows] = await db.execute(
    `SELECT id, chat_id, role, content, token_count, created_at
     FROM messages
     WHERE chat_id = ?
     ORDER BY id DESC
     LIMIT 100`,
    [chatId],
  );

  return rows.reverse().map(formatConversation);
};

const createConversationService = async (userId, question, requestedChatId) => {
  if (typeof question !== "string" || !question.trim()) {
    const error = new Error("question is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedQuestion = question.trim();

  if (normalizedQuestion.length > 10000) {
    const error = new Error("Question is too long.");
    error.statusCode = 400;
    throw error;
  }

  let chatId = requestedChatId;
  let isNewChat = false;

  if (chatId) {
    const [ownedChats] = await db.execute(
      "SELECT id FROM chats WHERE id = ? AND user_id = ?",
      [chatId, userId],
    );

    if (!ownedChats.length) {
      const error = new Error("Chat not found.");
      error.statusCode = 404;
      throw error;
    }
  } else {
    const title = normalizedQuestion.slice(0, 200);

    const [createdChat] = await db.execute(
      "INSERT INTO chats (user_id, title) VALUES (?, ?)",
      [userId, title],
    );

    chatId = createdChat.insertId;
    isNewChat = true;
  }

  try {
    const [historyRows] = await db.execute(
      `SELECT role, content
       FROM messages
       WHERE chat_id = ?
       ORDER BY id DESC
       LIMIT 10`,
      [chatId],
    );

    const history = historyRows.reverse();

    const contents = history.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    contents.push({
      role: "user",
      parts: [{ text: normalizedQuestion }],
    });

    const response = await geminiClient.models.generateContent({
      model: geminiModel,
      contents,
      config: { systemInstruction: SYSTEM_PROMPT },
    });

    const rawAnswer =
      typeof response.text === "function" ? response.text() : response.text;

    const answer = typeof rawAnswer === "string" ? rawAnswer.trim() : "";

    if (!answer) {
      throw new Error("The AI returned an empty response.");
    }

    const tokenCount = response.usageMetadata?.totalTokenCount || 0;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [userInsert] = await connection.execute(
        `INSERT INTO messages (chat_id, role, content, token_count)
         VALUES (?, 'user', ?, 0)`,
        [chatId, normalizedQuestion],
      );

      const [assistantInsert] = await connection.execute(
        `INSERT INTO messages (chat_id, role, content, token_count)
         VALUES (?, 'assistant', ?, ?)`,
        [chatId, answer, tokenCount],
      );

      await connection.execute(
        "UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        [chatId, userId],
      );

      const [savedRows] = await connection.execute(
        `SELECT id, chat_id, role, content, token_count, created_at
         FROM messages
         WHERE id IN (?, ?)
         ORDER BY id`,
        [userInsert.insertId, assistantInsert.insertId],
      );

      await connection.commit();

      return {
        chatId,
        isNewChat,
        userConversation: formatConversation(
          savedRows.find(
            (row) => String(row.id) === String(userInsert.insertId),
          ),
        ),
        assistantConversation: formatConversation(
          savedRows.find(
            (row) => String(row.id) === String(assistantInsert.insertId),
          ),
        ),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    // If we created a new, empty chat but the AI request failed,
    // remove that unused chat. Existing chats are left intact.
    if (isNewChat) {
      await db
        .execute("DELETE FROM chats WHERE id = ? AND user_id = ?", [
          chatId,
          userId,
        ])
        .catch(() => {});
    }

    throw error;
  }
};

module.exports = {
  getChatsService,
  getConversationService,
  createConversationService,
  formatConversation,
};
