import React, { useState } from "react";
import { AuthAPI } from "../api/client.js";
import { APP_VERSION } from "../App.jsx";
import "../styles/auth.css";

export default function Login({ onLogin }) {
  const resetParams = new URLSearchParams(window.location.search);
  const resetToken = resetParams.get("reset_token");
  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [email, setEmail] = useState(resetParams.get("email") || "admin@ridedesk.test");
  const [password, setPassword] = useState("password");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "forgot") {
        await AuthAPI.forgotPassword(email);
        setMessage("If an account exists for this email, a reset link has been sent.");
      } else if (mode === "reset") {
        await AuthAPI.resetPassword({ email, token: resetToken, password, password_confirmation: passwordConfirmation });
        setMessage("Password reset successfully. You can now sign in.");
        setMode("login");
        setPassword("");
        setPasswordConfirmation("");
        window.history.replaceState({}, "", window.location.pathname);
      } else {
        const response = await AuthAPI.login({ email, password });
        onLogin(response);
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";
  const isReset = mode === "reset";

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <form className="card form auth-form" onSubmit={submit}>
          <h1>Rent A Ride Desk</h1>
          <p>{isLogin ? "Sign in to manage taxis and drivers." : isReset ? "Create a new password for your account." : "Enter your email and we will send you a reset link."}</p>
          <label>
            Email
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {isLogin || isReset ? (
            <label>
              Password
              <input type="password" minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          ) : null}
          {isReset ? (
            <label>
              Confirm password
              <input type="password" minLength="8" required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
            </label>
          ) : null}
          {error && <p className="error">{error}</p>}
          {message && <p className="success-message">{message}</p>}
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign in" : isReset ? "Reset password" : "Send reset link"}
          </button>
          {isLogin ? (
            <button type="button" className="auth-link" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}>
              Forgot password?
            </button>
          ) : (
            <button type="button" className="auth-link" onClick={() => { setMode("login"); setError(""); setMessage(""); }}>
              Back to sign in
            </button>
          )}
        </form>
        <footer className="app-footer auth-footer">
          <span>Rent A Ride Desk</span>
          <span>Taxi &amp; Driver Management</span>
          <span>v{APP_VERSION}</span>
        </footer>
      </div>
    </main>
  );
}
