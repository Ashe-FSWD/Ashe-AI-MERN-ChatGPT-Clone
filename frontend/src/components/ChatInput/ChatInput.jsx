import { useRef, useState } from "react";
import { Plus, Mic, ArrowUp, X, FileText } from "lucide-react";
import styles from "./ChatInput.module.css";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_FILES = 4;

export default function ChatInput({ handleSendMessage, isLoading }) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    const valid = [];

    for (const file of selected) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} exceeds the 8 MB limit.`);
        continue;
      }

      valid.push(file);
    }

    setFiles((previous) => {
      const combined = [...previous, ...valid];
      const unique = combined.filter(
        (file, index, all) =>
          all.findIndex(
            (item) =>
              item.name === file.name &&
              item.size === file.size &&
              item.lastModified === file.lastModified,
          ) === index,
      );

      if (unique.length > MAX_FILES) {
        alert("You can attach up to 4 files per message.");
      }

      return unique.slice(0, MAX_FILES);
    });

    // Allows selecting the same file again later.
    event.target.value = "";
  };

  // const handleSubmit = async (event) => {
  //   event.preventDefault();

  //   const question = input.trim();

  //   if ((!question && files.length === 0) || isLoading) {
  //     return;
  //   }

  //   if (files.length > 0) {
  //     alert(
  //       "Files are selected, but your chat API must support file uploads before they can be sent to Gemini.",
  //     );
  //     return;
  //   }

  //   const success = await handleSendMessage(question);

  //   if (success) {
  //     setInput("");
  //   }
  // };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const question = input.trim();

    if ((!question && files.length === 0) || isLoading) {
      return;
    }

    // Pass BOTH the message and the selected File objects.
    // The parent component must forward these to chatApi.js.
    try {
      const success = await handleSendMessage(question, files);

      // Keep the draft and attachments when the request fails so the user can retry.
      if (success) {
        setInput("");
        setFiles([]);
      }
    } catch (error) {
      console.error("Failed to send message and attachments:", error);
    }
  };

  return (
    <div className={styles.container}>
      {files.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 10px",
                borderRadius: 10,
                background: "var(--bg-input)",
                color: "var(--text-primary)",
              }}
            >
              <FileText size={16} />
              <span>{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  setFiles((previous) => previous.filter((_, i) => i !== index))
                }
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.csv,.docx"
        multiple
        hidden
        onChange={handleFileChange}
      />

      <form className={styles.form} onSubmit={handleSubmit}>
        <button
          type="button"
          className={styles.icon}
          aria-label="Attach files"
          title="Attach images or documents"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus size={20} />
        </button>

        <input
          type="text"
          className={styles.input}
          placeholder="Ask anything"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isLoading}
          maxLength={10000}
          aria-label="Message"
        />

        {input.trim() || files.length > 0 ? (
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
            aria-label="Send message"
          >
            <ArrowUp size={18} />
          </button>
        ) : (
          <div className={styles.icon}>
            <Mic size={20} />
          </div>
        )}
      </form>
    </div>
  );
}
