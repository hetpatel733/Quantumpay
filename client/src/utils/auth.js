const API_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

export const isAuthenticated = () => {
  const token = localStorage.getItem("authToken");
  const userData = localStorage.getItem("userData");
  return !!(token && userData);
};

export const logout = async () => {
  try {
    // Call server logout endpoint
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  }
  
  // Clear client-side data regardless of server response
  localStorage.removeItem("authToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("completeUserData");
  
  // Clear cookies
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  
  // Redirect to home page
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
      logout(); // Clear invalid data
      return null;
    }
  }
  
  return null;
};

export const validateAuthToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.success;
    }
    
    return false;
  } catch (error) {
    console.error("Token validation failed:", error);
    return false;
  }
};
