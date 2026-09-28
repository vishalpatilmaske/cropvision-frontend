import { createContext, useCallback, useContext, useEffect, useState } from "react";
import apiClient, { SESSION_EXPIRED_EVENT, TOKEN_KEY } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    // A rejected token is cleared by the client's 401 handler; a network error
    // keeps it, so a brief backend outage doesn't sign the farmer out for good.
    apiClient
      .get("/api/auth/me")
      .then((res) => setUser(res.data.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onExpired(event) {
      if (event.detail?.tokenKey === TOKEN_KEY) setUser(null);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Passwordless: step 1 emails a 6-digit code, step 2 exchanges it for a session.
  // purpose is "login" or "register" (register also sends { name, phone }).
  async function requestOtp(email, purpose, details = {}) {
    const res = await apiClient.post("/api/auth/otp/request", { email, purpose, ...details });
    return res.data.data;
  }

  async function verifyOtp(email, purpose, code) {
    const res = await apiClient.post("/api/auth/otp/verify", { email, purpose, code });
    const { user: signedInUser, access_token: token } = res.data.data;
    localStorage.setItem(TOKEN_KEY, token);
    setUser(signedInUser);
    return signedInUser;
  }

  // Exchanges the token from Google's sign-in popup for our own session.
  const signInWithGoogle = useCallback(async (googleAccessToken) => {
    const res = await apiClient.post("/api/auth/google", { access_token: googleAccessToken });
    const { user: signedInUser, access_token: token } = res.data.data;
    localStorage.setItem(TOKEN_KEY, token);
    setUser(signedInUser);
    return signedInUser;
  }, []);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
