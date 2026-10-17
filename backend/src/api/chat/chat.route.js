import express from "express";
import multer from "multer";
import requireAuth from "../../middleware/auth.js";

import {
  createConversationController,
  getConversationController,
  getChatsController,
} from "./controller/chat.controller.js";

const chatRouter = express.Router();

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// Allow only the listed file extensions.
const allowedExtensions = /\.(png|jpe?g|webp|gif|pdf|txt|md|csv|docx)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 4,
  },
  fileFilter(_req, file, callback) {
    const extensionAllowed = allowedExtensions.test(file.originalname);

    if (allowedMimeTypes.has(file.mimetype) && extensionAllowed) {
      return callback(null, true);
    }

    const error = new Error(`Unsupported file type: ${file.originalname}`);

    error.statusCode = 415;
    return callback(error);
  },
});

// All chat endpoints require authentication.
chatRouter.use(requireAuth);

chatRouter.get("/conversations", getConversationController);
chatRouter.get("/chats", getChatsController);

chatRouter.post(
  "/conversations",
  (req, res, next) => {
    upload.array("files", 4)(req, res, (error) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          error.statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

          error.message =
            error.code === "LIMIT_FILE_SIZE"
              ? "Each attachment must be 8 MB or smaller."
              : "Invalid upload. You can attach up to 4 files.";
        }

        return next(error);
      }

      next();
    });
  },
  createConversationController,
);

export default chatRouter;
