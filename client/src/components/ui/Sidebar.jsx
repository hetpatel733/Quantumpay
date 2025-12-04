import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';

// SidebarContext and Provider for global collapsed state
export const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

const Sidebar = () => {
  const { isCollapsed, setIsCollapsed } = useContext(SidebarContext);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'BarChart3',
      tooltip: 'Payment analytics and system overview'
    },
    {
      label: 'Payments',
      path: '/dashboard/payments-management',
      icon: 'CreditCard',
      tooltip: 'Transaction management and monitoring'
    },
    {
      label: 'Portfolio',
      path: '/dashboard/portfolio-management',
      icon: 'ShoppingBag',
      tooltip: 'Manage your product catalog'
    },
    {
      label: 'Reports',
      path: '/dashboard/transaction-export',
      icon: 'FileText',
      tooltip: 'Export and analysis tools'
    },
    {
      label: 'Settings',
      path: '/dashboard/account-settings',
      icon: 'Settings',
      tooltip: 'Account and system configuration'
    }
  ];

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide search button on mobile when sidebar is open
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchBtn = document.querySelector('button.sm\\:hidden');
      if (searchBtn) {
        if (isMobileOpen && window.innerWidth < 1024) {
          searchBtn.style.display = 'none';
        } else {
          searchBtn.style.display = '';
        }
      }
    }
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isMobileOpen && (
        <button
          onClick={toggleMobileSidebar}
          className="
            fixed top-4 left-4 z-300 lg:hidden
            w-10 h-10 bg-surface border border-border rounded-lg
            flex items-center justify-center
            shadow-dropdown transition-smooth
            hover:bg-secondary-50
          "
        >
          <Icon name="Menu" size={20} color="currentColor" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-200 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:fixed top-0 left-0 h-full bg-surface dark:bg-gray-800 border-r border-border dark:border-gray-700 z-200
        transition-layout ${isCollapsed ? '' : 'overflow-y-auto'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        ${isCollapsed ? 'lg:w-18 overflow-hidden' : 'lg:w-60'}
        w-64
        max-w-full
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-border dark:border-gray-700">
          <div className={`flex items-center space-x-3 ${isCollapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-8 h-8 bg-primary dark:bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon name="Atom" size={25} color="white" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className={`${isCollapsed ? 'lg:hidden' : ''}`}>
                <h1 className="text-lg font-semibold text-text-primary dark:text-white">QuantumPay</h1>
                <p className="text-xs text-text-secondary dark:text-gray-400">Payment Gateway</p>
              </div>
            )}
          </div>
          
          {/* Mobile Close Button */}
          <button
            onClick={closeMobileSidebar}
            className="lg:hidden p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth"
          >
            <Icon name="X" size={20} color="currentColor" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <div key={item.path} className="relative group">
              <Link
                to={item.path}
                onClick={closeMobileSidebar}
                className={`
                  flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-smooth
                  ${isActiveRoute(item.path)
                    ? 'bg-primary dark:bg-teal-500 text-white' 
                    : 'text-text-secondary dark:text-gray-400 hover:bg-secondary-100 dark:hover:bg-gray-700 hover:text-text-primary dark:hover:text-white'
                  }
                  ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}
                `}
                title={isCollapsed ? item.tooltip : ''}
              >
                <Icon 
                  name={item.icon} 
                  size={20} 
                  color="currentColor"
                  className="flex-shrink-0"
                />
                {(!isCollapsed || isMobileOpen) && (
                  <span className={`font-medium ${isCollapsed ? 'lg:hidden' : ''}`}>
                    {item.label}
                  </span>
                )}
              </Link>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="
                  absolute left-full top-1/2 transform -translate-y-1/2 ml-2
                  bg-secondary-800 dark:bg-gray-900 text-white text-sm px-2 py-1 rounded
                  opacity-0 group-hover:opacity-100 transition-smooth
                  pointer-events-none whitespace-nowrap z-300
                  hidden lg:block
                ">
                  {item.label}
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 
                    w-0 h-0 border-t-4 border-b-4 border-r-4 
                    border-transparent border-r-secondary-800 dark:border-r-gray-900">
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Collapse Toggle (Desktop) */}
        <div className="absolute bottom-4 left-4 right-4 hidden lg:block">
          <button
            onClick={toggleSidebar}
            className="
              w-full flex items-center justify-center space-x-2 
              px-3 py-2 rounded-lg border border-border dark:border-gray-700
              hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth
              text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white
            "
          >
            <Icon 
              name={isCollapsed ? "ChevronRight" : "ChevronLeft"} 
              size={16} 
              color="currentColor"
              className="flex-shrink-0"
            />
            {!isCollapsed && (
              <span className="text-sm font-medium">Collapse</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;