import { useState } from "react";
import { Plus, Mic, ArrowUp } from "lucide-react";
import styles from "./ChatInput.module.css";

export default function ChatInput({ handleSendMessage, isLoading }) {
  const [input, setInput] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const question = input.trim();

    if (!question || isLoading) return;

    try {
      const success = await handleSendMessage(question);

      if (success) {
        setInput("");
      }
    } catch (error) {
      console.error("Message submission failed:", error);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.icon}>
          <Plus size={20} />
        </div>

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

        {input.trim() ? (
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
