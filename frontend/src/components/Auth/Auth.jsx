import { useState } from "react";
import { login, register, getErrorMessage } from "../../api/chatApi";

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "register" && password.length < 12) {
      setError("Your password must contain at least 12 characters.");
      return;
    }

    setLoading(true);

    try {
      const result =
        mode === "register"
          ? await register(name.trim(), normalizedEmail, password)
          : await login(normalizedEmail, password);

      const token = result?.data?.token;
      const user = result?.data?.user;

      if (!result?.success || !token || !user) {
        throw new Error(
          "The server returned an invalid authentication response.",
        );
      }

      localStorage.setItem("authToken", token);
      localStorage.setItem("authUser", JSON.stringify(user));

      onAuthenticated(user);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || getErrorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    border: "1px solid #444",
    borderRadius: "8px",
    background: "#252525",
    color: "#fff",
    boxSizing: "border-box",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background: "#171717",
        color: "#f5f5f5",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "28px",
          border: "1px solid #383838",
          borderRadius: "16px",
          background: "#202020",
          boxSizing: "border-box",
        }}
      >
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>

        <p style={{ color: "#aaa", lineHeight: 1.5 }}>
          Sign in to access your own private conversations.
        </p>

        {mode === "register" && (
          <label style={{ display: "block", marginTop: "18px" }}>
            Full name
            <input
              style={inputStyle}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={100}
              required
            />
          </label>
        )}

        <label style={{ display: "block", marginTop: "18px" }}>
          Email address
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            maxLength={255}
            required
          />
        </label>

        <label style={{ display: "block", marginTop: "18px" }}>
          Password
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={mode === "register" ? 12 : undefined}
            maxLength={72}
            required
          />
        </label>

        {error && (
          <p role="alert" style={{ color: "#fca5a5", fontSize: "14px" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "22px",
            border: 0,
            borderRadius: "8px",
            background: "#fff",
            color: "#111",
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        <p style={{ textAlign: "center", color: "#aaa", fontSize: "14px" }}>
          {mode === "login" ? "New here? " : "Already registered? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            style={{
              color: "#fff",
              background: "none",
              border: 0,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </form>
    </main>
  );
}
