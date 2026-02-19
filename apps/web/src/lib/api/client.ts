import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api/v1";

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // For httpOnly cookies
  validateStatus: function (status) {
    // Let ALL status codes through to the success handler
    // EXCEPT 401 - route that to the error handler for token refresh
    return status !== 401;
  },
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// Subscribe to token refresh
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// Notify all subscribers when token is refreshed
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Helper: determine which token to use based on the current route
function getActiveToken(): string | null {
  const isClientRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/client");

  if (isClientRoute) {
    // Client portal: use accessToken (client's key)
    return localStorage.getItem("accessToken");
  }

  // Admin portal: use Zustand store or admin localStorage key
  const adminStore = useAuthStore.getState();
  return adminStore.token || localStorage.getItem("greenex_token");
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getActiveToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle FormData requests - remove Content-Type to let axios set multipart/form-data
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Handle error responses manually since validateStatus allows non-401 errors through
    if (!response.data.success && response.status >= 400) {
      // Don't process login/register errors here - let the calling code handle them
      const isAuthEndpoint =
        response.config?.url?.includes("/auth/login") ||
        response.config?.url?.includes("/auth/register");

      if (isAuthEndpoint) {
        return response;
      }

      // For other errors, show toast and reject
      const errorMessage =
        response.data?.error?.message || `Error: ${response.status}`;
      const skipToast = ["/auth/refresh", "/auth/me"].some((endpoint) =>
        response.config?.url?.includes(endpoint)
      );

      if (!skipToast) {
        toast.error(errorMessage);
      }

      return Promise.reject(response);
    }

    return response;
  },
  async (error) => {
    // This handler fires for 401 responses (validateStatus excludes 401)
    const originalRequest = error.config || {};

    // Handle 401 errors for non-auth endpoints (token expired)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        // Call refresh endpoint using raw axios (not apiClient) to avoid interceptor loop
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken, user, tokens } = response.data.data;
        if (accessToken) {
          const isClientRoute =
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/client");

          if (isClientRoute) {
            // Client context: update client localStorage key
            localStorage.setItem("accessToken", accessToken);
          } else {
            // Admin context: update admin localStorage + Zustand store
            localStorage.setItem("greenex_token", accessToken);
            const adminStore = useAuthStore.getState();
            if (user) {
              adminStore.setUser(user, accessToken, tokens);
            } else {
              adminStore.updateTokens(
                accessToken,
                tokens?.accessTokenExpiresAt,
                tokens?.refreshTokenExpiresAt
              );
            }
          }

          // Notify queued requests
          onTokenRefreshed(accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear everything and redirect to login
        localStorage.removeItem("greenex_token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        const adminStore = useAuthStore.getState();
        adminStore.clearAuth();

        refreshSubscribers = [];

        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/auth") &&
          !window.location.pathname.includes("/client/login")
        ) {
          const isClientRoute =
            window.location.pathname.startsWith("/client");
          window.location.href = isClientRoute
            ? "/client/login"
            : "/auth/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper function for making API calls with typed responses
export const createApiCall = <T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string
) => {
  return (data?: any, config?: any): Promise<T> => {
    switch (method) {
      case "GET":
        return apiClient.get(url, config);
      case "POST":
        return apiClient.post(url, data, config);
      case "PUT":
        return apiClient.put(url, data, config);
      case "PATCH":
        return apiClient.patch(url, data, config);
      case "DELETE":
        return apiClient.delete(url, config);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  };
};

export default apiClient;
