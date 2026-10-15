import { MessageSquare, Plus, LogOut } from "lucide-react";
import styles from "./Sidebar.module.css";

export default function Sidebar({
  user,
  chats = [],
  activeChatId,
  onNewChat,
  onSelectChat,
  onLogout,
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <MessageSquare size={20} />
          <span>GPT Clone</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <button type="button" className={styles.item} onClick={onNewChat}>
          <Plus size={18} />
          <span>New chat</span>
        </button>

        <p style={{ padding: "12px 10px 4px", color: "#999", fontSize: 12 }}>
          Your chats
        </p>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {chats.length === 0 ? (
            <p style={{ padding: 10, color: "#999", fontSize: 13 }}>
              No chats yet
            </p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                className={styles.item}
                onClick={() => onSelectChat(chat.id)}
                title={chat.title || "New chat"}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background:
                    String(chat.id) === String(activeChatId)
                      ? "#333"
                      : "transparent",
                  border: 0,
                }}
              >
                <MessageSquare size={17} />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chat.title || "New chat"}
                </span>
              </button>
            ))
          )}
        </div>
      </nav>

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>
            {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
          </div>

          <div className={styles.userInfo} style={{ flex: 1, minWidth: 0 }}>
            <span className={styles.userName}>{user?.name || "Account"}</span>
            <span className={styles.userPlan}>{user?.email || ""}</span>
          </div>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
