import db from "../../../../db/db.config.js";
import { geminiClient, geminiModel } from "../../../utils/gemini.js";
import SYSTEM_PROMPT from "../../../utils/system-prompt.js";
import mammoth from "mammoth";

const TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown", "text/csv"]);

const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const MAX_EXTRACTED_TEXT = 100000;
const MAX_QUESTION_LENGTH = 10000;

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const SUPPORTED_MIME_TYPES = new Set([
  ...TEXT_MIME_TYPES,
  ...IMAGE_MIME_TYPES,
  "application/pdf",
  DOCX_MIME_TYPE,
]);

const attachmentToPart = async (file) => {
  const name = String(file.originalname || "attachment").replace(
    /[\r\n]/g,
    "_",
  );

  const mime = String(file.mimetype || "").toLowerCase();

  if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
    const error = new Error(`Invalid attachment data: ${name}`);
    error.statusCode = 400;
    throw error;
  }

  if (!SUPPORTED_MIME_TYPES.has(mime)) {
    const error = new Error(`Unsupported file type: ${name}`);
    error.statusCode = 415;
    throw error;
  }

  // Images and PDFs are sent to Gemini as inline data.
  if (IMAGE_MIME_TYPES.has(mime) || mime === "application/pdf") {
    return {
      inlineData: {
        mimeType: mime,
        data: file.buffer.toString("base64"),
      },
    };
  }

  // Plain text, Markdown and CSV files are extracted in memory.
  if (TEXT_MIME_TYPES.has(mime)) {
    const text = file.buffer.toString("utf8").slice(0, MAX_EXTRACTED_TEXT);

    return {
      text: `\n\n[Attachment: ${name}]\n${text}`,
    };
  }

  // Extract text from Word documents in memory.
  if (mime === DOCX_MIME_TYPE) {
    const result = await mammoth.extractRawText({
      buffer: file.buffer,
    });

    return {
      text: `\n\n[Attachment: ${name}]\n${result.value.slice(
        0,
        MAX_EXTRACTED_TEXT,
      )}`,
    };
  }

  const error = new Error(`Unsupported file type: ${name}`);
  error.statusCode = 415;
  throw error;
};

export const formatConversation = (row) => ({
  id: row.id,
  chatId: row.chat_id,
  role: row.role,
  content: row.content,
  tokenCount: row.token_count,
  createdAt: row.created_at,
});

export const getChatsService = async (userId) => {
  const [rows] = await db.execute(
    `SELECT id, title, created_at, updated_at
     FROM chats
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId],
  );

  return rows;
};

export const getConversationService = async (userId, chatId) => {
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

export const createConversationService = async (
  userId,
  question,
  requestedChatId,
  files = [],
) => {
  if (!Array.isArray(files)) {
    const error = new Error("Invalid attachments.");
    error.statusCode = 400;
    throw error;
  }

  if (
    (typeof question !== "string" || !question.trim()) &&
    files.length === 0
  ) {
    const error = new Error(
      "A question or at least one attachment is required.",
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedQuestion =
    typeof question === "string" ? question.trim() : "";

  if (normalizedQuestion.length > MAX_QUESTION_LENGTH) {
    const error = new Error("Question must be 10000 characters or fewer.");
    error.statusCode = 400;
    throw error;
  }

  const promptQuestion =
    normalizedQuestion ||
    "Please analyze the attached file(s) and summarize the key information.";

  const attachmentNames = files.map((file) =>
    String(file.originalname || "attachment").replace(/[\r\n]/g, "_"),
  );

  const savedQuestion = [
    promptQuestion,
    attachmentNames.length
      ? `\n\nAttachments: ${attachmentNames.join(", ")}`
      : "",
  ].join("");

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
    const title = promptQuestion.slice(0, 200);

    const [createdChat] = await db.execute(
      "INSERT INTO chats (user_id, title) VALUES (?, ?)",
      [userId, title],
    );

    chatId = createdChat.insertId;
    isNewChat = true;
  }

  try {
    // Preserve the existing behavior of using the most recent 10 messages.
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

    // Include the user's question and each uploaded attachment in this turn.
    const userParts = [{ text: promptQuestion }];

    for (const file of files) {
      userParts.push(await attachmentToPart(file));
    }

    contents.push({
      role: "user",
      parts: userParts,
    });

    const response = await geminiClient.models.generateContent({
      model: geminiModel,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const rawAnswer =
      typeof response.text === "function" ? response.text() : response.text;

    const answer = typeof rawAnswer === "string" ? rawAnswer.trim() : "";

    if (!answer) {
      const error = new Error("The AI returned an empty response.");
      error.statusCode = 502;
      throw error;
    }

    const tokenCount = response.usageMetadata?.totalTokenCount || 0;

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [userInsert] = await connection.execute(
        `INSERT INTO messages (chat_id, role, content, token_count)
         VALUES (?, 'user', ?, 0)`,
        [chatId, savedQuestion],
      );

      const [assistantInsert] = await connection.execute(
        `INSERT INTO messages (chat_id, role, content, token_count)
         VALUES (?, 'assistant', ?, ?)`,
        [chatId, answer, tokenCount],
      );

      await connection.execute(
        `UPDATE chats
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
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
    // Remove a newly created empty chat if processing failed.
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
