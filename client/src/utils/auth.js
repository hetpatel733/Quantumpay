const API_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

export const isAuthenticated = () => {
  const token = localStorage.getItem("authToken");
  const userData = localStorage.getItem("userData");
  return !!(token && userData);
};

export const logout = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  }
  
  // Clear all auth data
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("completeUserData");
  
  // Redirect to home
  window.location.href = "/";
};

export const getAuthData = () => {
  const token = localStorage.getItem("authToken");
  const userData = localStorage.getItem("userData");
  
  if (token && userData) {
    try {
      return {
        token,
        user: JSON.parse(userData)
      };
    } catch (error) {
      console.error("Error parsing user data:", error);
      logout();
      return null;
    }
  }
  
  return null;
};
