import React, { useEffect, useState, createContext } from "react";
import { authAPI } from "../utils/api";

const server = import.meta.env.VITE_SERVER_URL || "";

// Enhanced cookie utility functions
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

// Get auth token using multiple methods to ensure we get it
const getAuthToken = () => {
  // Try httpOnly cookie first (might not be accessible via JS)
  const token = getCookie("token");
  if (token) return token;

  // Try the non-httpOnly auth_token cookie
  const authToken = getCookie("auth_token");
  if (authToken) return authToken;

  // Try localStorage as last resort
  return localStorage.getItem("authToken");
};

const clearAuthCookies = () => {
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie =
    "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
};

// Create the context with default values
const AuthContext = createContext({
  isAuthenticated: null,
  userData: null,
  isLoading: true,
  authError: null,
  validateToken: () => {},
  handleLoginSuccess: () => {},
  handleLogout: () => {},
});

// Export the context separately
export { AuthContext };

// AuthProvider component - default export for Fast Refresh compatibility
function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [lastValidated, setLastValidated] = useState(0);

  const VALIDATION_CACHE_TIME = 15 * 60 * 1000;

  // Separate function to validate with server
  const validateTokenFromServer = async (token) => {
    try {
      console.log("🚀 REQUEST SENT: Token validation to /api/auth/validate");

      const data = await authAPI.validateToken();

      if (data.success) {
        setIsAuthenticated(true);
        setUserData(data.user);
        setAuthError(null);
        setLastValidated(Date.now());
        setIsLoading(false);
        return true;
      } else {
        setIsAuthenticated(false);
        setUserData(null);
        setAuthError(data.message || "Authentication failed");
        clearAuthCookies();
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("❌ ERROR: Token validation failed:", error);

      // Handle different types of errors
      if (error.message.includes("Failed to fetch")) {
        setAuthError("Backend server unavailable - please ensure server is running");
      } else {
        setAuthError("Server error during authentication");
      }

      // If there's a server error but we have stored user data, use it temporarily
      const storedUserData = localStorage.getItem("userData");
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setIsAuthenticated(true);
          setUserData(userData);
          setIsLoading(false);
          return true;
        } catch (e) {
          // Fall through to error handling
        }
      }

      setIsAuthenticated(false);
      setUserData(null);
      setIsLoading(false);
      return false;
    }
  };

  // Enhanced token validation with better error handling
  const validateToken = async (force = false) => {
    try {
      // Check if we have cached validation and it's still fresh
      const now = Date.now();
      if (!force && lastValidated > 0 && now - lastValidated < VALIDATION_CACHE_TIME) {
        return isAuthenticated;
      }

      // Get token using multiple methods
      const token = getAuthToken();

      if (!token) {
        setIsAuthenticated(false);
        setUserData(null);
        setAuthError("No authentication token found");
        setIsLoading(false);
        return false;
      }

      // Fast pre-check - if token is in localStorage and we have userData, trust it
      const storedUserData = localStorage.getItem("userData");
      if (!force && token && storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setIsAuthenticated(true);
          setUserData(userData);
          setAuthError(null);
          setIsLoading(false);
          return true;
        } catch (e) {
          // Continue with server validation if parsing fails
        }
      }

      return await validateTokenFromServer(token);
    } catch (error) {
      setIsAuthenticated(false);
      setUserData(null);
      setAuthError("Authentication error");
      setIsLoading(false);
      return false;
    }
  };

  // Use useEffect with better error handling
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (isMounted) {
        try {
          // Fast initial check
          const token = getAuthToken();
          const storedUserData = localStorage.getItem("userData");

          if (token && storedUserData) {
            try {
              // Immediately set authenticated to show dashboard
              const userData = JSON.parse(storedUserData);
              setIsAuthenticated(true);
              setUserData(userData);
              setIsLoading(false);
            } catch (e) {
              // If parsing fails, try server validation
              await validateToken();
            }
          } else {
            // No stored data, try server validation
            await validateToken();
          }
        } catch (error) {
          setIsAuthenticated(false);
          setUserData(null);
          setAuthError("Authentication check failed");
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  // Function to handle successful login
  const handleLoginSuccess = (user, token) => {
    // Store token in localStorage as a backup
    if (token) {
      localStorage.setItem("authToken", token);
      localStorage.setItem("userData", JSON.stringify(user));
    }

    setIsAuthenticated(true);
    setUserData(user);
    setAuthError(null);
    setIsLoading(false);
  };

  // Function to handle logout
  const handleLogout = async () => {
    try {
      // Call server logout endpoint using API utility
      await authAPI.logout();
      
      // Clear client-side data
      setIsAuthenticated(false);
      setUserData(null);
      setAuthError(null);
      clearAuthCookies();
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear client-side data even if server call fails
      setIsAuthenticated(false);
      setUserData(null);
      setAuthError(null);
      clearAuthCookies();
    }
  };

  const contextValue = {
    isAuthenticated,
    userData,
    isLoading,
    authError,
    validateToken,
    handleLoginSuccess,
    handleLogout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Custom hook specifically for user data
export const useUserData = () => {
  const { userData, isAuthenticated } = useAuth();
  return {
    userData: isAuthenticated ? userData : null,
    isLoggedIn: isAuthenticated === true,
  };
};

// Function to fetch complete user data from API
export const fetchUserData = async (userId) => {
  try {
    console.log(`🚀 REQUEST SENT: Fetching user data for ID: ${userId}`);

    const data = await authAPI.getUserData(userId);

    if (data.success) {
      // Cache the data for offline use
      localStorage.setItem("completeUserData", JSON.stringify(data.userData));
      return data.userData;
    } else {
      throw new Error(data.message || "Failed to fetch user data");
    }
  } catch (error) {
    console.error("❌ ERROR: Fetching user data failed:", error);

    // Try to get cached data as fallback
    const cachedData = localStorage.getItem("completeUserData");
    if (cachedData) {
      console.log("Using cached complete user data");
      return JSON.parse(cachedData);
    }

    throw error;
  }
};

// Default export the component for Fast Refresh compatibility
export default AuthProvider;
