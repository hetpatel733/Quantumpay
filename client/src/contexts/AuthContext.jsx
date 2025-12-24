import React, { createContext, useEffect, useState, useContext } from "react";
import { authAPI } from "../utils/api";

export const AuthContext = createContext();

// Add useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [userData, setUserData] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");
      const storedUserData = localStorage.getItem("userData");

      if (!token || !storedUserData) {
        //console.log("❌ No auth data found");
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      //console.log("🔍 Validating token...");
      const response = await authAPI.validateToken();

      if (response.success) {
        //console.log("✅ Token valid");
        setIsAuthenticated(true);
        
        const basicUserData = JSON.parse(storedUserData);
        setUserData(basicUserData);
        
        // Fetch complete user data immediately
        if (basicUserData.id) {
          //console.log("🔄 Fetching complete user data for:", basicUserData.id);
          const completeData = await fetchUserData(basicUserData.id);
          if (completeData) {
            setUserData(completeData);
          }
        }
        
        setAuthError(null);
      } else {
        //console.log("❌ Token invalid");
        setIsAuthenticated(false);
        setAuthError("Session expired. Please login again.");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        localStorage.removeItem("completeUserData");
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      setIsAuthenticated(false);
      setAuthError("Authentication failed");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("completeUserData");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async (userId) => {
    try {
      //console.log('🔄 Fetching complete user data for:', userId);
      const response = await authAPI.getUserData(userId);
      if (response.success && response.userData) {
        //console.log('✅ Complete user data fetched:', response.userData);
        // Save to both localStorage keys
        localStorage.setItem("completeUserData", JSON.stringify(response.userData));
        localStorage.setItem("userData", JSON.stringify(response.userData));
        return response.userData;
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
    return null;
  };

  const handleLoginSuccess = (user, token) => {
    //console.log("✅ Login success handler called with user:", user);
    
    // Save both basic and complete user data
    localStorage.setItem("userData", JSON.stringify(user));
    localStorage.setItem("completeUserData", JSON.stringify(user));
    
    setIsAuthenticated(true);
    setUserData(user);
    setAuthError(null);
    
    // Fetch latest user data in background
    if (user.id) {
      fetchUserData(user.id).then(completeData => {
        if (completeData) {
          setUserData(completeData);
        }
      });
    }
  };

  const validateToken = async () => {
    try {
      const response = await authAPI.validateToken();
      if (response.success && response.user) {
        setIsAuthenticated(true);
        const basicUserData = response.user;
        setUserData(basicUserData);

        // Fetch complete user data in background
        if (basicUserData.id) {
          fetchUserData(basicUserData.id);
        }
      } else {
        setIsAuthenticated(false);
        setAuthError("Session expired. Please login again.");
        // Clear invalid data
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        localStorage.removeItem("completeUserData");
      }
    } catch (error) {
      console.error("❌ Token validation failed:", error);
      setIsAuthenticated(false);
      setAuthError("Authentication failed");
      // Clear data on error
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("completeUserData");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear all auth data
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("completeUserData");

    setIsAuthenticated(false);
    setUserData(null);

    // Redirect to login
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        authError,
        userData,
        checkAuth,
        handleLoginSuccess,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
