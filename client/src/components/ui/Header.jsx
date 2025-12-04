import React, { useState, useRef, useEffect } from "react";
import Icon from "../AppIcon";
import { notificationsAPI } from "../../utils/api";
import { debounce } from "../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";

const server = import.meta.env.VITE_SERVER_URL || "";

const Header = ({ userData }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState(null);
  const [hideMobileSearch, setHideMobileSearch] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const { isDarkMode, toggleTheme } = useTheme();

  // Debounced notification fetch to prevent rapid successive calls
  const debouncedFetchNotifications = debounce(async () => {
    if (!userData?.email) {
      console.log("❌ No user email available for fetching notifications");
      return;
    }

    try {
      setNotificationLoading(true);
      setNotificationError(null);

      console.log("🚀 Fetching notifications for user:", userData.email);

      const response = await notificationsAPI.getAll();

      console.log("📤 Notifications API response:", response);

      if (response.success) {
        const notificationsData = response.notifications || [];
        const unreadCountData = response.pagination?.unreadCount || 0;

        console.log(
          "✅ Notifications loaded:",
          notificationsData.length,
          "Unread:",
          unreadCountData
        );

        setNotifications(notificationsData);
        setUnreadCount(unreadCountData);
      } else if (response.isEmpty || response.isNewUser) {
        // Handle new user with no notifications
        console.log("📭 No notifications found (new user)");
        setNotifications([]);
        setUnreadCount(0);
      } else {
        throw new Error(response.message || "Failed to fetch notifications");
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
      setNotificationError("Failed to load notifications");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationLoading(false);
    }
  }, 500);

  // Optimized notification fetching
  const fetchNotifications = () => {
    debouncedFetchNotifications();
  };

  // Load notifications only when user data is available and component mounts
  useEffect(() => {
    if (userData?.email) {
      console.log("👤 User data available, fetching notifications...");
      fetchNotifications();
      // Notifications are now only fetched on manual load, not auto-polled
    } else {
      console.log("👤 No user data available yet");
    }
  }, [userData?.email]);

  // Removed polling to stop auto-refresh. Users can manually refresh as needed.

  const profileMenuItems = [
    {
      label: "Account Settings",
      icon: "Settings",
      action: () => {
        // Navigate to account settings
        window.location.href = "/dashboard/account-settings";
      },
    },
    {
      label: "Help & Support",
      icon: "HelpCircle",
      action: () => {
        // Open help documentation
        window.location.href = "/contact";
      },
    },
    {
      label: "Sign Out",
      icon: "LogOut",
      action: async () => {
        // Handle logout
        try {
          const response = await fetch(
            `${server}/api/auth/logout`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            // Clear localStorage
            localStorage.removeItem("authToken");
            localStorage.removeItem("userData");
            localStorage.removeItem("completeUserData");

            // Clear any other stored data
            document.cookie =
              "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie =
              "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie =
              "email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

            // Redirect to login page
            window.location.href = "/login";
          } else {
            console.error("Logout failed");
            // Force redirect anyway
            window.location.href = "/login";
          }
        } catch (error) {
          console.error("Logout error:", error);
          // Force redirect anyway
          window.location.href = "/login";
        }
      },
      variant: "danger",
    },
  ];

  const toggleProfileDropdown = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsNotificationOpen(false);
  };

  const toggleNotificationDropdown = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsProfileOpen(false);
  };

  const handleProfileMenuClick = (item) => {
    item.action();
    setIsProfileOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Hide mobile search button if sidebar is open on mobile
  useEffect(() => {
    const handleSidebarState = () => {
      // Check if sidebar is open on mobile by inspecting the sidebar element
      const sidebar = document.querySelector("aside");
      const isMobile = window.innerWidth < 1024;
      if (sidebar && isMobile) {
        // Sidebar is open if it does NOT have -translate-x-full
        setHideMobileSearch(!sidebar.className.includes("-translate-x-full"));
      } else {
        setHideMobileSearch(false);
      }
    };

    // Listen for sidebar open/close and window resize
    window.addEventListener("resize", handleSidebarState);
    const observer = new MutationObserver(handleSidebarState);
    const sidebar = document.querySelector("aside");
    if (sidebar)
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ["class"],
      });

    handleSidebarState();

    return () => {
      window.removeEventListener("resize", handleSidebarState);
      if (sidebar) observer.disconnect();
    };
  }, []);

  // Display user information in the header
  const displayName =
    userData?.name || userData?.uname || userData?.email || "User";
  const businessName = userData?.businessName || "Business";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const formatNotificationTime = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifTime.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "payment_completed":
        return "CheckCircle";
      case "payment_failed":
        return "XCircle";
      case "payment_pending":
        return "Clock";
      case "order_created":
        return "ShoppingCart";
      case "welcome":
        return "Heart";
      case "system":
        return "Settings";
      default:
        return "Bell";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "payment_completed":
        return "text-green-600";
      case "payment_failed":
        return "text-red-600";
      case "payment_pending":
        return "text-yellow-600";
      case "order_created":
        return "text-blue-600";
      case "welcome":
        return "text-purple-600";
      case "system":
        return "text-gray-600";
      default:
        return "text-gray-500";
    }
  };

  // Optimized mark as read with immediate UI update
  const markAsRead = async (notificationId) => {
    try {
      // Optimistic update - update UI immediately
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Then make API call
      await notificationsAPI.markAsRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  };

  // Optimized mark all as read
  const markAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);

      await notificationsAPI.markAllAsRead();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  // Optimized clear all
  const clearAllNotifications = async () => {
    try {
      // Optimistic update
      setNotifications([]);
      setUnreadCount(0);
      setIsNotificationOpen(false);

      await notificationsAPI.clearAll();
    } catch (error) {
      console.error("Error clearing notifications:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  return (
    <header className="fixed top-0 right-0 h-16 left-0 lg:left-60 bg-surface dark:bg-gray-800 border-b border-border dark:border-gray-700 px-4 lg:px-6 z-50 transition-layout">
      <div className="flex items-center justify-between h-16">
        {/* Left Section - Search or Title */}
        <div className="flex items-center space-x-4 flex-1">
          {/* Mobile spacing for menu button */}
          <div className="w-10 lg:w-0"></div>

          <div className="hidden sm:block flex-1 max-w-md">
            <div className="relative">
              <Icon
                name="Search"
                size={18}
                color="currentColor"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-400"
              />
              <input
                type="text"
                placeholder="Search transactions..."
                className="
                  w-full pl-10 pr-4 py-2
                  bg-background dark:bg-gray-700 border border-border dark:border-gray-600 rounded-lg
                  text-text-primary dark:text-white placeholder-text-secondary dark:placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 focus:border-transparent
                  transition-colors duration-200 text-sm h-9
                "
              />
            </div>
          </div>
        </div>

        {/* Right Section - Theme Toggle, Notifications and Profile */}
        <div className="flex items-center space-x-2 lg:space-x-3">
          {/* Mobile Search Button */}
          {!hideMobileSearch && (
            <button
              className="
              sm:hidden p-2 rounded-lg
              hover:bg-secondary-100 dark:hover:bg-gray-700 transition-colors duration-200
              text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white
            "
            >
              <Icon name="Search" size={18} color="currentColor" />
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="
              relative p-2 rounded-lg 
              hover:bg-secondary-100 dark:hover:bg-gray-700
              transition-colors duration-200 
              text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white
              group
            "
            aria-label="Toggle theme"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {/* Sun Icon (Light Mode) */}
            {!isDarkMode && (
              <svg
                className="w-5 h-5 text-yellow-500 transition-transform group-hover:rotate-45"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            
            {/* Moon Icon (Dark Mode) */}
            {isDarkMode && (
              <svg
                className="w-5 h-5 text-blue-400 transition-transform group-hover:-rotate-12"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={toggleNotificationDropdown}
              className="relative p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-gray-700 transition-colors duration-200 text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
            >
              <Icon name="Bell" size={18} color="currentColor" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-error dark:bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-700">
                  <h3 className="font-semibold text-text-primary dark:text-white">Notifications</h3>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto">
                  {notificationLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Icon
                        name="Loader2"
                        size={20}
                        color="currentColor"
                        className="animate-spin"
                      />
                      <span className="ml-2 text-text-secondary">
                        Loading notifications...
                      </span>
                    </div>
                  ) : notificationError ? (
                    <div className="text-center py-8">
                      <Icon
                        name="AlertCircle"
                        size={32}
                        color="var(--color-error)"
                        className="mx-auto mb-2"
                      />
                      <p className="text-error text-sm">{notificationError}</p>
                      <button
                        onClick={fetchNotifications}
                        className="text-xs text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300 mt-2"
                      >
                        Retry
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Icon
                        name="Bell"
                        size={32}
                        color="var(--color-text-secondary)"
                        className="mx-auto mb-2"
                      />
                      <p className="text-text-secondary">No notifications yet</p>
                      <p className="text-xs text-text-secondary mt-1">
                        You'll see payment updates and system messages here
                      </p>
                    </div>
                  ) : (
                    notifications
                      .slice(0, 10)
                      .map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-4 border-b border-border dark:border-gray-700 last:border-b-0 hover:bg-secondary-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                            !notification.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
                          }`}
                          onClick={() => {
                            if (!notification.isRead) {
                              markAsRead(notification._id);
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`mt-1 ${getNotificationColor(
                                notification.type
                              )}`}
                            >
                              <Icon
                                name={getNotificationIcon(notification.type)}
                                size={16}
                                color="currentColor"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${
                                  !notification.isRead ? "font-semibold" : ""
                                } text-text-primary dark:text-white`}
                              >
                                {notification.message}
                              </p>
                              <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                                {formatNotificationTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary dark:bg-teal-500 rounded-full mt-2"></div>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 10 && (
                  <div className="p-3 border-t border-border dark:border-gray-700 text-center">
                    <button
                      onClick={() => {
                        setIsNotificationOpen(false);
                        // Navigate to notifications page if you have one
                        window.location.href = "/dashboard/notifications";
                      }}
                      className="text-sm text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleProfileDropdown}
              className="
                flex items-center space-x-2 lg:space-x-3 p-2 rounded-lg
                hover:bg-secondary-100 dark:hover:bg-gray-700 transition-colors duration-200
                text-text-primary dark:text-white h-10
              "
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-medium">
                  {userInitials}
                </span>
              </div>
              <div className="hidden lg:block text-left min-w-0">
                <p className="text-sm font-medium text-text-primary truncate mb-2 mt-3">
                  {displayName}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {businessName}
                </p>
              </div>
              <Icon
                name="ChevronDown"
                size={16}
                color="currentColor"
                className={`transition-transform duration-200 hidden lg:block ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div
                className="
                absolute right-0 top-full mt-2 w-64
                bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg shadow-lg
                py-2 z-50
              "
              >
                {/* User Info */}
                <div className="px-4 py-3 border-b border-border dark:border-gray-700">
                  <p className="text-sm font-medium text-text-primary dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400 truncate">
                    {userData?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  {profileMenuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleProfileMenuClick(item)}
                      className={`
                        w-full flex items-center space-x-3 px-4 py-2
                        hover:bg-secondary-100 dark:hover:bg-gray-700 transition-colors duration-200 text-left
                        ${
                          item.variant === "danger"
                            ? "text-error dark:text-red-400 hover:bg-error-50 dark:hover:bg-red-500/10"
                            : "text-text-primary dark:text-white"
                        }
                      `}
                    >
                      <Icon name={item.icon} size={16} color="currentColor" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
