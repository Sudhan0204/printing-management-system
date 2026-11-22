import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  fetchCsrfToken,
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
} from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetchCurrentUser();

        if (!active) {
          return;
        }

        setUser(response.data.user);
        setCsrfToken(response.data.csrf_token || "");
      } catch {
        if (!active) {
          return;
        }

        setUser(null);

        try {
          const response = await fetchCsrfToken();

          if (active) {
            setCsrfToken(response.data.csrf_token || "");
          }
        } catch {
          if (active) {
            setCsrfToken("");
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  async function login(email, password) {
    const response = await loginRequest(email, password, csrfToken);
    setUser(response.data.user);
    setCsrfToken(response.data.csrf_token || "");
    return response.data.user;
  }

  async function logout() {
    await logoutRequest(csrfToken);
    setUser(null);

    try {
      const response = await fetchCsrfToken();
      setCsrfToken(response.data.csrf_token || "");
    } catch {
      setCsrfToken("");
    }
  }

  const clearSession = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, csrfToken, loading, login, logout, clearSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
