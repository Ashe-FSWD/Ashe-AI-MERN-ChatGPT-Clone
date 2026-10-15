import { useCallback, useEffect, useRef, useState } from "react";

import Auth from "./components/Auth/Auth";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatHeader from "./components/ChatHeader/ChatHeader";
import MessageList from "./components/MessageList/MessageList";
import ChatInput from "./components/ChatInput/ChatInput";

import {
  getChats,
  getConversations,
  sendMessage,
  getErrorMessage,
  logout,
} from "./api/chatApi";

import "./App.css";

export default function App() {
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem("authToken")) return null;

    try {
      return JSON.parse(localStorage.getItem("authUser") || "null");
    } catch {
      return null;
    }
  });

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  const signOut = useCallback(() => {
    logout();
    setUser(null);
    setChats([]);
    setActiveChatId(null);
    setConversations([]);
    setError("");
  }, []);

  const refreshChats = useCallback(async () => {
    const result = await getChats();

    if (!result?.success) {
      throw new Error(result?.message || "Unable to load chats.");
    }

    const items = result.data?.chats ?? [];
    setChats(items);
    return items;
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    refreshChats().catch((err) => {
      if (cancelled) return;

      if (err?.response?.status === 401) {
        signOut();
      } else {
        setError(getErrorMessage(err));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, refreshChats, signOut]);

  const loadChat = useCallback(
    async (chatId) => {
      setActiveChatId(chatId);
      setConversations([]);
      setError("");

      if (!chatId) return;

      setIsLoadingHistory(true);

      try {
        const result = await getConversations(chatId);

        if (!result?.success) {
          throw new Error(result?.message || "Unable to load conversation.");
        }

        setConversations(result.data?.conversations ?? []);
      } catch (err) {
        if (err?.response?.status === 401) {
          signOut();
        } else {
          setError(getErrorMessage(err));
        }
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [signOut],
  );

  const handleAuthenticated = (authenticatedUser) => {
    setUser(authenticatedUser);
    setChats([]);
    setActiveChatId(null);
    setConversations([]);
    setError("");
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setConversations([]);
    setError("");
  };

  const handleSendMessage = async (question) => {
    if (!question?.trim() || isLoading || isLoadingHistory) {
      return false;
    }

    const tempId = `temp-${Date.now()}`;

    setConversations((previous) => [
      ...previous,
      { id: tempId, role: "user", content: question },
    ]);

    setIsLoading(true);
    setError("");

    try {
      const result = await sendMessage(question, activeChatId);

      const data = result?.data;

      if (
        !result?.success ||
        !data?.chatId ||
        !data?.userConversation ||
        !data?.assistantConversation
      ) {
        throw new Error("The server returned an invalid chat response.");
      }

      setActiveChatId(data.chatId);

      setConversations((previous) => [
        ...previous.filter((message) => message.id !== tempId),
        data.userConversation,
        data.assistantConversation,
      ]);

      await refreshChats();

      return true;
    } catch (err) {
      setConversations((previous) =>
        previous.filter((message) => message.id !== tempId),
      );

      if (err?.response?.status === 401) {
        signOut();
      } else {
        setError(getErrorMessage(err));
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, isLoading]);

  if (!user) {
    return <Auth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app">
      <Sidebar
        user={user}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={loadChat}
        onLogout={signOut}
      />

      <main className="chat">
        <ChatHeader />

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="error-banner__retry"
              onClick={() => {
                if (activeChatId) {
                  loadChat(activeChatId);
                } else {
                  refreshChats().catch((err) => {
                    setError(getErrorMessage(err));
                  });
                }
              }}
            >
              Retry
            </button>
          </div>
        )}

        {isLoadingHistory ? (
          <div style={{ padding: 24 }}>Loading chat history...</div>
        ) : (
          <MessageList
            conversations={conversations}
            isLoading={isLoading}
            messagesEndRef={messagesEndRef}
          />
        )}

        <ChatInput
          handleSendMessage={handleSendMessage}
          isLoading={isLoading || isLoadingHistory}
        />
      </main>
    </div>
  );
}
