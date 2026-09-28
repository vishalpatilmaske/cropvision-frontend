import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import { useAdminAuth } from "../context/AdminAuthContext";
import "../styles/admin.css";

export default function AdminLogin() {
  const { admin, login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (admin) return <Navigate to="/admin" replace />;

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-badge">
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h1>Admin Console</h1>
        <p>Sign in to manage CropVision AI users.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Admin email</label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn btn-primary admin-login-btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
