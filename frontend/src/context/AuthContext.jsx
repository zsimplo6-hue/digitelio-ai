import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../utils/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await api.me();
      setUser(data.user);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  async function signup(fullName, email, password) {
    const data = await api.signup(fullName, email, password);
    setUser(data.user);
    return data.user;
  }

  async function login(email, password) {
    const data = await api.login(email, password);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}

