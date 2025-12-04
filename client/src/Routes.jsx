import React, { useContext, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes as RouterRoutes,
  Route,
  Navigate,
} from "react-router-dom";
import { useLocation } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import Sidebar, {
  SidebarProvider,
  SidebarContext,
} from "components/ui/Sidebar";
import Header from "components/ui/Header";
import { AuthContext } from "contexts/AuthContext";
import AuthProvider from "contexts/AuthContext";
import { authAPI } from "utils/api"; // Fixed import path

// Page imports
import Home from "landingpages/Home";
import Login from "landingpages/Login";
import Signup from "landingpages/Signup";
import Contact from "landingpages/Contact";
import Cryptocurrencies from "landingpages/Cryptocurrencies";
import Pricing from "landingpages/Pricing";
// Add payment page imports
import CoinSelect from "pages/payment/CoinSelect";
import FinalPayment from "pages/payment/FinalPayment";
import PaymentRedirect from "pages/payment/PaymentRedirect";
import Dashboard from "pages/dashboard";
import PaymentsManagement from "pages/payments-management";
import PaymentDetailsModal from "pages/payment-details-modal";
import AccountSettings from "pages/account-settings";
import TransactionExport from "pages/transaction-export";
import PortfolioManagement from "pages/portfolio-management";
import NotFound from "pages/NotFound";

// Create a mapping for the routes that don't exist yet
const OrderManagement = PortfolioManagement; // Use PortfolioManagement as OrderManagement for now

const server = import.meta.env.VITE_SERVER_URL || "";
// Error display component
const AuthErrorDisplay = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
      <div className="mb-4">
        <svg
          className="mx-auto h-12 w-12 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Authentication Error
      </h2>
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        onClick={() => (window.location.href = "/login")}
        className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
      >
        Go to Login
      </button>
    </div>
  </div>
);

// Enhanced Dashboard Data Provider that fetches complete user data
const DashboardDataProvider = ({ children, userData: authUserData }) => {
  const [completeUserData, setCompleteUserData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [userDataError, setUserDataError] = useState(null);

  // Function to fetch user data using new API
  const fetchCompleteUserData = async (userId, forceRefresh = false) => {
    try {
      setIsLoadingUserData(true);
      console.log(
        `🚀 REQUEST SENT: Fetching complete user data for ID: ${userId}`
      );

      // Check if we have cached data and don't need force refresh
      const cachedData = localStorage.getItem("completeUserData");
      if (!forceRefresh && cachedData && completeUserData) {
        try {
          const parsed = JSON.parse(cachedData);
          console.log("Using cached user data:", parsed);
          setCompleteUserData(parsed);
          setUserDataError(null);
          return parsed;
        } catch (e) {
          console.log("Cache invalid, fetching fresh data");
        }
      }

      const data = await authAPI.getUserData(userId);

      if (data.success) {
        console.log("Complete user data received:", data.userData);
        setCompleteUserData(data.userData);
        setUserDataError(null);

        // Cache the data
        localStorage.setItem("completeUserData", JSON.stringify(data.userData));

        return data.userData;
      } else {
        throw new Error(data.message || "Failed to fetch user data");
      }
    } catch (error) {
      console.error("❌ ERROR: Fetching complete user data:", error);
      setUserDataError(error.message);

      // Try to use cached data as fallback
      const cachedData = localStorage.getItem("completeUserData");
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          console.log("Using cached data as fallback:", parsed);
          setCompleteUserData(parsed);
          return parsed;
        } catch (e) {
          console.log("Cache invalid, using auth data fallback");
        }
      }

      // Final fallback to auth data
      console.log("Using auth data as final fallback:", authUserData);
      setCompleteUserData(authUserData);
      return authUserData;
    } finally {
      setIsLoadingUserData(false);
    }
  };

  // Function to refresh user data (called after profile updates)
  const refreshUserData = () => {
    if (authUserData?.id) {
      return fetchCompleteUserData(authUserData.id, true); // Force refresh
    }
  };

  useEffect(() => {
    if (authUserData?.id) {
      fetchCompleteUserData(authUserData.id);
    } else {
      setIsLoadingUserData(false);
      setCompleteUserData(authUserData);
    }
  }, [authUserData?.id]);

  // Show loading if still fetching user data
  if (isLoadingUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-lg">Loading complete user profile...</div>
          {userDataError && (
            <div className="text-sm text-orange-600 max-w-md text-center">
              Using cached data due to: {userDataError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Clone children and pass complete user data with refresh function
  return React.cloneElement(children, {
    userData: completeUserData,
    userDataError: userDataError,
    refreshUserData: refreshUserData,
  });
};

// Protected Route Component - now with enhanced data
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, authError, userData } =
    useContext(AuthContext);

  // Show loading while checking authentication
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-lg">Verifying authentication...</div>
        </div>
      </div>
    );
  }

  // Show error message if not authenticated
  if (isAuthenticated === false) {
    return <AuthErrorDisplay error={authError} />;
  }

  // Render protected content if authenticated - wrap with data provider
  return (
    <DashboardDataProvider userData={userData}>
      {children}
    </DashboardDataProvider>
  );
};

// Login wrapper - simplified since we're not auto-redirecting
const LoginWrapper = () => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  // Show loading while checking
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated === true) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show login form if not authenticated
  return <Login />;
};

//data handling from Landing page to Dashboard - simplified and cleaned up
const DashboardWithData = ({ userData, userDataError, refreshUserData }) => {
  return (
    <Dashboard
      userData={userData}
      userDataError={userDataError}
      refreshUserData={refreshUserData}
    />
  );
};

// Enhanced components that receive userData - Fix loading issues
const EnhancedAccountSettings = ({
  userData,
  userDataError,
  refreshUserData,
}) => {
  console.log("🎯 EnhancedAccountSettings received userData:", userData);
  
  // Show loading if userData is still being fetched
  if (!userData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AccountSettings
      userData={userData}
      userDataError={userDataError}
      refreshUserData={refreshUserData}
    />
  );
};

// Apply same pattern to other enhanced components
const EnhancedPaymentsManagement = ({
  userData,
  userDataError,
  refreshUserData,
}) => {
  if (!userData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PaymentsManagement
      userData={userData}
      userDataError={userDataError}
      refreshUserData={refreshUserData}
    />
  );
};

const EnhancedTransactionExport = ({
  userData,
  userDataError,
  refreshUserData,
}) => {
  if (!userData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TransactionExport
      userData={userData}
      userDataError={userDataError}
      refreshUserData={refreshUserData}
    />
  );
};

const EnhancedPortfolioManagement = ({
  userData,
  userDataError,
  refreshUserData,
}) => {
  if (!userData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PortfolioManagement
      userData={userData}
      userDataError={userDataError}
      refreshUserData={refreshUserData}
    />
  );
};

const EnhancedPaymentDetailsModal = ({
  userData,
  userDataError,
  refreshUserData,
}) => (
  <PaymentDetailsModal
    userData={userData}
    userDataError={userDataError}
    refreshUserData={refreshUserData}
  />
);

// Dashboard layout with user data context
const DashboardLayout = ({
  children,
  userData,
  userDataError,
  refreshUserData,
}) => {
  console.log("🎯 DashboardLayout received userData:", userData);
  console.log(
    "🎯 DashboardLayout received refreshUserData:",
    typeof refreshUserData
  );
  return (
    <SidebarProvider>
      <ErrorBoundary>
        <ScrollToTop />
        <div className="min-h-screen bg-background flex flex-col">
          <Sidebar userData={userData} />
          <Header userData={userData} />
          <MainContent>
            {React.cloneElement(children, {
              userData,
              userDataError,
              refreshUserData,
            })}
          </MainContent>
        </div>
      </ErrorBoundary>
    </SidebarProvider>
  );
};

// Create a wrapper component to handle nested dashboard routes with userData
const DashboardRoutesWrapper = ({ userData, userDataError, refreshUserData }) => {
  console.log('🎯 DashboardRoutesWrapper received userData:', userData);
  console.log('🎯 DashboardRoutesWrapper received refreshUserData:', typeof refreshUserData);
  
  return (
    <RouterRoutes>
      <Route 
        index 
        element={
          <DashboardWithData 
            userData={userData} 
            userDataError={userDataError} 
            refreshUserData={refreshUserData} 
          />
        } 
      />
      <Route
        path="payments-management"
        element={
          <EnhancedPaymentsManagement 
            userData={userData} 
            userDataError={userDataError} 
            refreshUserData={refreshUserData} 
          />
        }
      />
      <Route
        path="payment-details-modal"
        element={
          <EnhancedPaymentDetailsModal 
            userData={userData} 
            userDataError={userDataError} 
            refreshUserData={refreshUserData} 
          />
        }
      />
      <Route
        path="account-settings"
        element={
          <EnhancedAccountSettings 
            userData={userData} 
            userDataError={userDataError} 
            refreshUserData={refreshUserData} 
          />
        }
      />
      <Route
        path="transaction-export"
        element={
          <EnhancedTransactionExport 
            userData={userData} 
            userDataError={userDataError} 
            refreshUserData={refreshUserData} 
          />
        }
      />
      <Route
        path="portfolio-management"
        element={
          <EnhancedPortfolioManagement 
            userData={userData} 
            userDataError={userDataError} 
            refreshUserData={refreshUserData} 
          />
        }
      />
      <Route
        path="order-management"
        element={
          <EnhancedPortfolioManagement 
            userData={userData} 
            userDataError={userDataError} 
            refreshUserData={refreshUserData} 
          />
        }
      />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
};

// Landing layout for Home (no sidebar/header)
const LandingLayout = ({ children }) => (
  <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col">{children}</div>
);

// Dashboard layout (sidebar/header)
const MainContent = ({ children }) => {
  const { isCollapsed } = useContext(SidebarContext);
  return (
    <main
      className={`
        transition-layout
        pt-16 pb-6
        ${isCollapsed ? "lg:ml-16" : "lg:ml-60"}
        px-1 sm:px-2 md:px-4
        min-h-[calc(100vh-4rem)]
        overflow-x-hidden
        max-w-full
        bg-background dark:bg-gray-900
      `}
      style={{
        maxWidth: "100vw",
        transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {children}
    </main>
  );
};

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <RouterRoutes>
            {/* Landing Routes */}
            <Route
              path="/"
              element={
                <LandingLayout>
                  <Home />
                </LandingLayout>
              }
            />
            <Route
              path="/login"
              element={
                <LandingLayout>
                  <LoginWrapper />
                </LandingLayout>
              }
            />
            <Route
              path="/signup"
              element={
                <LandingLayout>
                  <Signup />
                </LandingLayout>
              }
            />
            <Route
              path="/contact"
              element={
                <LandingLayout>
                  <Contact />
                </LandingLayout>
              }
            />
            <Route
              path="/cryptocurrencies"
              element={
                <LandingLayout>
                  <Cryptocurrencies />
                </LandingLayout>
              }
            />
            <Route
              path="/pricing"
              element={
                <LandingLayout>
                  <Pricing />
                </LandingLayout>
              }
            />

            {/* Payment Routes - Public (no authentication required) */}
            {/* Handle direct payment URLs with API key and order ID */}
            <Route
              path="/payment/:api/:order_id"
              element={
                <LandingLayout>
                  <PaymentRedirect />
                </LandingLayout>
              }
            />
            <Route
              path="/payment/coinselect"
              element={
                <LandingLayout>
                  <CoinSelect />
                </LandingLayout>
              }
            />
            <Route
              path="/payment/final-payment"
              element={
                <LandingLayout>
                  <FinalPayment />
                </LandingLayout>
              }
            />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DashboardRoutesWrapper />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
