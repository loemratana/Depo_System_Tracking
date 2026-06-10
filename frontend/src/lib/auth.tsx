import * as React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "manager" | "field_agent" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  workspace: string;
  lastLogin?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp ms
  user: User;
}

export interface AuthState {
  session: AuthSession | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  error: string | null;
}

type AuthAction =
  | { type: "SET_LOADING" }
  | { type: "SET_SESSION"; payload: AuthSession }
  | { type: "CLEAR_SESSION" }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" };

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  isAuthenticated: boolean;
  user: User | null;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, status: "loading", error: null };
    case "SET_SESSION":
      return { ...state, status: "authenticated", session: action.payload, error: null };
    case "CLEAR_SESSION":
      return { ...state, status: "unauthenticated", session: null, error: null };
    case "SET_ERROR":
      return { ...state, status: "unauthenticated", error: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const SESSION_KEY = "bdms_session";
const REMEMBER_KEY = "bdms_remember";

function saveSession(session: AuthSession, remember: boolean) {
  try {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {}
}

function loadSession(): AuthSession | null {
  try {
    const remember = localStorage.getItem(REMEMBER_KEY) === "1";
    const store = remember ? localStorage : sessionStorage;
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;

    // We allow loading expired sessions because we have a long-lived refresh token
    // that will be handled by the axios interceptor or the refresh watcher.
    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

import { authService } from "@/services/auth-service";

// ─── API Integration ──────────────────────────────────────────────────────────
function parseExpiry(expiresIn: string): number {
  const num = parseInt(expiresIn);
  const unit = expiresIn.toLowerCase().slice(-1);
  const ms = 1000;

  if (unit === "m") return Date.now() + num * 60 * ms;
  if (unit === "h") return Date.now() + num * 60 * 60 * ms;
  if (unit === "d") return Date.now() + num * 24 * 60 * 60 * ms;
  if (unit === "s" || !isNaN(Number(unit))) return Date.now() + num * ms;

  return Date.now() + 15 * 60 * ms; // Default 15m
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthCtx = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(authReducer, {
    session: null,
    status: "idle",
    error: null,
  });

  // Restore session on mount
  React.useEffect(() => {
    dispatch({ type: "SET_LOADING" });
    const stored = loadSession();
    if (stored) {
      dispatch({ type: "SET_SESSION", payload: stored });
    } else {
      dispatch({ type: "CLEAR_SESSION" });
    }
  }, []);

  // Token expiry watcher
  React.useEffect(() => {
    if (!state.session) return;
    const msUntilExpiry = state.session.expiresAt - Date.now();

    if (msUntilExpiry <= 0) {
      // Instead of clearing immediately, try to refresh
      refreshSession().then((success) => {
        if (!success) {
          dispatch({ type: "CLEAR_SESSION" });
        }
      });
      return;
    }

    // Refresh 1 min before expiry
    const refreshAt = Math.max(msUntilExpiry - 1 * 60 * 1000, 0);
    const timer = setTimeout(async () => {
      await refreshSession();
    }, refreshAt);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.session?.expiresAt]);

  const login = React.useCallback(async (email: string, password: string, remember = false) => {
    dispatch({ type: "SET_LOADING" });
    try {
      const result = await authService.login({ email, password });

      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }

      const { user, tokens } = result.data;

      const session: AuthSession = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: parseExpiry(tokens.expiresIn),
        user: {
          id: user.id.toString(),
          name: user.employee?.khmerName || user.username,
          email: user.employee?.email || user.username,
          role: user.role,
          workspace: "Brand Depot",
          emailVerified: true,
          twoFactorEnabled: false,
        },
      };

      saveSession(session, remember);
      dispatch({ type: "SET_SESSION", payload: session });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: (err as Error).message });
      throw err;
    }
  }, []);

  const register = React.useCallback(async (data: any) => {
    dispatch({ type: "SET_LOADING" });

    try {
      const result = await authService.register(data);

      if (result.errors?.length) {
        throw new Error(result.errors[0].message || "Registration failed");
      }

      if (result.success === false) {
        throw new Error(result.message || "Registration failed");
      }

      dispatch({ type: "CLEAR_ERROR" });
      //IMPORTANT FIX: reset loading state
      dispatch({ type: "CLEAR_SESSION" }); // or "SET_SESSION" depending on flow
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: (err as Error).message });
      dispatch({ type: "CLEAR_SESSION" }); //ensure loading stops
      throw err;
    }
  }, []);
  const logout = React.useCallback(async () => {
    if (state.session?.refreshToken) {
      try {
        await authService.logout(state.session.refreshToken);
      } catch {}
    }
    clearSession();
    dispatch({ type: "CLEAR_SESSION" });
  }, [state.session]);

  const refreshSession = React.useCallback(async (): Promise<boolean> => {
    if (!state.session?.refreshToken) return false;
    try {
      const result = await authService.refreshToken(state.session.refreshToken);
      if (!result.success) {
        clearSession();
        dispatch({ type: "CLEAR_SESSION" });
        return false;
      }

      const tokens = result.data;
      const stored = loadSession();
      if (!stored) return false;

      const refreshed: AuthSession = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || state.session.refreshToken,
        expiresAt: parseExpiry(tokens.expiresIn),
        user: stored.user,
      };

      saveSession(refreshed, localStorage.getItem(REMEMBER_KEY) === "1");
      dispatch({ type: "SET_SESSION", payload: refreshed });
      return true;
    } catch {
      return false;
    }
  }, [state.session]);

  const hasRole = React.useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!state.session?.user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(state.session.user.role);
    },
    [state.session],
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.status === "authenticated",
      user: state.session?.user ?? null,
      login,
      register,
      logout,
      refreshSession,
      hasRole,
    }),
    [state, login, register, logout, refreshSession, hasRole],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
