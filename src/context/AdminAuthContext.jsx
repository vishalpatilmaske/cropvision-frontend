import { createContext, useContext, useEffect, useState } from "react";
import { adminLogin as apiAdminLogin } from "../api/adminApi";
import { ADMIN_TOKEN_KEY, SESSION_EXPIRED_EVENT } from "../api/client";

const ADMIN_EMAIL_KEY = "cropvision_admin_email";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const email = localStorage.getItem(ADMIN_EMAIL_KEY);
    if (token && email) setAdmin({ email });
    setLoading(false);
  }, []);

  useEffect(() => {
    function onExpired(event) {
      if (event.detail?.tokenKey !== ADMIN_TOKEN_KEY) return;
      localStorage.removeItem(ADMIN_EMAIL_KEY);
      setAdmin(null);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  async function login(email, password) {
    const data = await apiAdminLogin(email, password);
    localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
    localStorage.setItem(ADMIN_EMAIL_KEY, data.admin.email);
    setAdmin(data.admin);
    return data.admin;
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_EMAIL_KEY);
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
