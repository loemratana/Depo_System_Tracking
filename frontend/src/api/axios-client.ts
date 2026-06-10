import axios from "axios";

// Create a separate instance for refresh to avoid circular interceptor calls
const refreshClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

const axiosClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

const SESSION_KEY = "bdms_session";
const REMEMBER_KEY = "bdms_remember";

// Helper to get session from storage
const getStoredSession = () => {
  try {
    const remember = localStorage.getItem(REMEMBER_KEY) === "1";
    const store = remember ? localStorage : sessionStorage;
    const raw = store.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Helper to save session to storage
const saveStoredSession = (session: any) => {
  try {
    const remember = localStorage.getItem(REMEMBER_KEY) === "1";
    const store = remember ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
};

// Interceptor to add auth token
axiosClient.interceptors.request.use((config) => {
  try {
    const session = getStoredSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
  } catch {}
  return config;
});

// Flag and queue for refresh logic
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Function to parse expiry string (same as in auth.tsx for consistency)
function parseExpiry(expiresIn: string): number {
  const num = parseInt(expiresIn);
  const unit = expiresIn.toLowerCase().slice(-1);
  const ms = 1000;
  if (unit === "m") return Date.now() + num * 60 * ms;
  if (unit === "h") return Date.now() + num * 60 * 60 * ms;
  if (unit === "d") return Date.now() + num * 24 * 60 * 60 * ms;
  if (unit === "s" || !isNaN(Number(unit))) return Date.now() + num * ms;
  return Date.now() + 15 * 60 * ms;
}

// Interceptor to handle errors and auto-refresh
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const session = getStoredSession();
        if (!session?.refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await refreshClient.post("/auth/refresh", {
          refreshToken: session.refreshToken,
        });

        if (response.data.success) {
          const { accessToken, refreshToken, expiresIn } = response.data.data;
          
          // Update session
          const updatedSession = {
            ...session,
            accessToken,
            refreshToken: refreshToken || session.refreshToken,
            expiresAt: parseExpiry(expiresIn),
          };

          saveStoredSession(updatedSession);
          
          // Retry original request
          axiosClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          
          processQueue(null, accessToken);
          return axiosClient(originalRequest);
        } else {
          throw new Error("Refresh failed");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Log out user on refresh failure
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        
        // Redirect to login if possible (or let the app state handle it)
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login?expired=true";
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

