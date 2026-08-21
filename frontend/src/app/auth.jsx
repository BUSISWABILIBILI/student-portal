import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate, useLocation } from "react-router-dom";

import api, {
  ACCESS_TOKEN_KEY,
  SESSION_EXPIRED_EVENT,
  SESSION_EXPIRED_MESSAGE,
} from "../lib/api";
import { PageLoader } from "../components/ui";
import { AuthContext, useAuth } from "./authContext";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    window.localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(Boolean(token));
  const [sessionMessage, setSessionMessage] = useState("");

  const clearSession = useCallback(({ message } = {}) => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setIsBooting(false);

    if (message !== undefined) {
      setSessionMessage(message);
    }
  }, []);

  const clearSessionMessage = useCallback(() => {
    setSessionMessage("");
  }, []);

  const handleSessionExpired = useCallback(
    (event) => {
      clearSession({
        message: event.detail?.message || SESSION_EXPIRED_MESSAGE,
      });
    },
    [clearSession],
  );

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [handleSessionExpired]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsBooting(false);
      return;
    }

    let cancelled = false;

    const loadCurrentUser = async () => {
      try {
        const response = await api.get("/auth/me");

        if (!cancelled) {
          setUser(response.data.data.user);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [clearSession, token]);

  const signIn = useCallback(
    async ({ email, password }) => {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const nextToken = response.data.data.accessToken;
      const nextUser = response.data.data.user;

      window.localStorage.setItem(ACCESS_TOKEN_KEY, nextToken);
      setToken(nextToken);
      setUser(nextUser);
      clearSessionMessage();

      return nextUser;
    },
    [clearSessionMessage],
  );

  const signOut = useCallback(async () => {
    try {
      if (token) {
        await api.post("/auth/logout");
      }
    } finally {
      clearSession({
        message: "",
      });
    }
  }, [clearSession, token]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token && user),
      isBooting,
      clearSessionMessage,
      signIn,
      signOut,
      sessionMessage,
      token,
      user,
    }),
    [
      clearSessionMessage,
      isBooting,
      sessionMessage,
      signIn,
      signOut,
      token,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isBooting } = useAuth();
  const location = useLocation();

  if (isBooting) {
    return <PageLoader label="Checking session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
