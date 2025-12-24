import React, { useContext } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "contexts/AuthContext";
import AuthProvider from "contexts/AuthContext";

// Component imports
import ErrorBoundary from "components/ErrorBoundary";
import ScrollToTop from "components/ScrollToTop";
import Sidebar from "components/ui/Sidebar";
import { SidebarContext, SidebarProvider } from "components/ui/Sidebar";
import Header from "components/ui/Header";

// Page imports
import Home from "landingpages/Home";
import Login from "landingpages/Login";
import Signup from "landingpages/Signup";
import Contact from "landingpages/Contact";
import Cryptocurrencies from "landingpages/Cryptocurrencies";
import Pricing from "landingpages/Pricing";
import AdminPanel from "pages/admin-panel";

// Payment pages
import CoinSelect from "pages/payment/CoinSelect";
import FinalPayment from "pages/payment/FinalPayment";
import PaymentRedirect from "pages/payment/PaymentRedirect";

// Dashboard pages
import Dashboard from "pages/dashboard";
import PaymentsManagement from "pages/payments-management";
import PaymentDetailsModal from "pages/payment-details-modal";
import AccountSettings from "pages/account-settings";
import TransactionExport from "pages/transaction-export";
import PortfolioManagement from "pages/portfolio-management";
import NotFound from "pages/NotFound";

// Error display component
const AuthErrorDisplay = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-900">
    <div className="max-w-md mx-auto text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Authentication Error</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
      <button onClick={() => window.location.href = "/login"} className="px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-md hover:bg-primary-700 dark:hover:bg-teal-600">
        Go to Login
      </button>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, authError, userData } = useContext(AuthContext);

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
          <div className="text-lg text-gray-900 dark:text-white">Verifying authentication...</div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return <AuthErrorDisplay error={authError} />;
  }

  // Clone children and pass userData prop
  return React.cloneElement(children, { userData });
};

// Login wrapper
const LoginWrapper = () => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
      </div>
    );
  }

  if (isAuthenticated === true) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
};

// Simple layout wrappers
const LandingLayout = ({ children }) => (
  <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col">{children}</div>
);

const MainContent = ({ children }) => {
  const { isCollapsed } = useContext(SidebarContext);
  return (
    <main className={`transition-layout pt-16 pb-6 ${isCollapsed ? "lg:ml-16" : "lg:ml-60"} px-0 sm:px-1 md:px-2 lg:px-4 min-h-[calc(100vh-4rem)] overflow-x-hidden w-screen lg:w-auto bg-background dark:bg-gray-900`}>
      {children}
    </main>
  );
};

// Dashboard layout - receive and pass userData
const DashboardLayout = ({ children, userData }) => (
  <SidebarProvider>
    <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col">
      <Sidebar userData={userData} />
      <Header userData={userData} />
      <MainContent>
        {React.cloneElement(children, { userData })}
      </MainContent>
    </div>
  </SidebarProvider>
);

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <RouterRoutes>
            {/* Landing Routes */}
            <Route path="/" element={<LandingLayout><Home /></LandingLayout>} />
            <Route path="/admin" element={<LandingLayout><AdminPanel /></LandingLayout>} />
            <Route path="/login" element={<LandingLayout><LoginWrapper /></LandingLayout>} />
            <Route path="/signup" element={<LandingLayout><Signup /></LandingLayout>} />
            <Route path="/contact" element={<LandingLayout><Contact /></LandingLayout>} />
            <Route path="/cryptocurrencies" element={<LandingLayout><Cryptocurrencies /></LandingLayout>} />
            <Route path="/pricing" element={<LandingLayout><Pricing /></LandingLayout>} />

            {/* Payment Routes - Public */}
            <Route path="/payment/:api/:order_id" element={<LandingLayout><PaymentRedirect /></LandingLayout>} />
            <Route path="/payment/coinselect" element={<LandingLayout><CoinSelect /></LandingLayout>} />
            <Route path="/payment/final-payment" element={<LandingLayout><FinalPayment /></LandingLayout>} />

            {/* Protected Dashboard Routes - Pass userData through */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/payments-management" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PaymentsManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/payment-details-modal" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PaymentDetailsModal />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/account-settings" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AccountSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/transaction-export" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <TransactionExport />
                  </DashboardLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/portfolio-management" 
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PortfolioManagement />
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
