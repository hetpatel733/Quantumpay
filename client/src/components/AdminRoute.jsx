import React, { useContext, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

/**
 * AdminRoute — Protects the /admin route.
 * 
 * 1. Checks if the user is authenticated (via AuthContext).
 * 2. Verifies the user's role is 'admin' both client-side AND server-side.
 * 3. Shows a loading state while verifying.
 * 4. Redirects non-admin users to /login (not logged in) or shows access denied (wrong role).
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, userData } = useContext(AuthContext);
  const [adminVerified, setAdminVerified] = useState(null); // null = checking, true/false = result
  const [verifyError, setVerifyError] = useState(null);

  useEffect(() => {
    // Only verify if authenticated and role looks like admin on client side
    if (isAuthenticated && userData?.role === 'admin') {
      verifyAdminAccess();
    } else if (isAuthenticated === false || (isAuthenticated && userData?.role !== 'admin')) {
      setAdminVerified(false);
    }
  }, [isAuthenticated, userData]);

  const verifyAdminAccess = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/verify`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdminVerified(data.success === true);
      } else {
        setAdminVerified(false);
        if (response.status === 403) {
          setVerifyError('Access denied. Admin privileges required.');
        } else if (response.status === 401) {
          setVerifyError('Session expired. Please log in again.');
        }
      }
    } catch (error) {
      console.error('Admin verification failed:', error);
      setAdminVerified(false);
      setVerifyError('Unable to verify admin access.');
    }
  };

  // Still loading auth state
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Client-side role check fails immediately (no need to even hit the server)
  if (userData?.role !== 'admin') {
    return <AccessDenied />;
  }

  // Waiting for server-side verification
  if (adminVerified === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Server-side verification failed
  if (!adminVerified) {
    return <AccessDenied error={verifyError} />;
  }

  // Verified admin — render children with userData
  return React.cloneElement(children, { userData });
};

/**
 * Access Denied page shown to non-admin users.
 * Clean, professional design that gives away nothing about what's behind it.
 */
const AccessDenied = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
    <div className="max-w-md w-full text-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-200 dark:border-gray-700">
        {/* Shield icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v.01M12 9v2m-7 8h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Access Restricted
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {error || "You don't have permission to view this page. This area is restricted to authorized administrators only."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/"
            className="px-5 py-2.5 bg-primary dark:bg-teal-500 text-white rounded-lg font-medium hover:bg-primary-700 dark:hover:bg-teal-600 transition-colors"
          >
            Go to Home
          </a>
          <a
            href="/login"
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  </div>
);

export default AdminRoute;
