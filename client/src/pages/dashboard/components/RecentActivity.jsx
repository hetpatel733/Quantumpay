import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { dashboardAPI } from 'utils/api';

const RecentActivity = ({ onPaymentStatusChange }) => {
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real recent activity data on initial load only
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await dashboardAPI.getRecentActivity(5);
        
        if (response.success) {
          setRecentTransactions(response.recentActivity || []);
        } else {
          throw new Error(response.message || 'Failed to fetch recent activity');
        }
      } catch (err) {
        console.error('Error fetching recent activity:', err);
        setError('Failed to load recent activity');
        setRecentTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return {
          color: 'text-success',
          bgColor: 'bg-success-100',
          icon: 'CheckCircle',
          label: 'Completed'
        };
      case 'pending':
        return {
          color: 'text-warning',
          bgColor: 'bg-warning-100 pulse-pending',
          icon: 'Clock',
          label: 'Pending'
        };
      case 'failed':
        return {
          color: 'text-error',
          bgColor: 'bg-error-100',
          icon: 'XCircle',
          label: 'Failed'
        };
      default:
        return {
          color: 'text-text-secondary',
          bgColor: 'bg-secondary-100',
          icon: 'HelpCircle',
          label: 'Unknown'
        };
    }
  };

  const getCryptoIcon = (crypto) => {
    switch (crypto?.toLowerCase()) {
      case 'btc':
        return 'Bitcoin';
      case 'eth':
        return 'Zap';
      case 'usdt':
      case 'pyusd':
        return 'DollarSign';
      case 'matic':
        return 'Triangle';
      default:
        return 'Coins';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const generateCustomerAvatar = (customerName, customerEmail) => {
    // Generate a consistent color based on customer name/email
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const hash = (customerName || customerEmail).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const color = colors[Math.abs(hash) % colors.length];
    
    const initials = customerName 
      ? customerName.split(' ').map(n => n[0]).join('').substring(0, 2)
      : (customerEmail ? customerEmail.substring(0, 2) : '??');
    
    return { color, initials: initials.toUpperCase() };
  };

  const handleTransactionClick = (transactionId) => {
    window.location.href = `/dashboard/payment-details-modal?id=${transactionId}&from=dashboard`;
  };

  if (loading) {
    return (
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary dark:border-teal-500"></div>
          <span className="ml-3 text-text-secondary dark:text-gray-400">Loading recent activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary dark:text-white">Recent Activity</h2>
          <p className="text-text-secondary dark:text-gray-400 text-sm">Latest payment transactions</p>
        </div>
        <Link
          to="/dashboard/payments-management"
          className="
            flex items-center space-x-2 px-4 py-2
            text-primary dark:text-teal-400 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg
            transition-smooth font-medium text-sm
          "
        >
          <span>View All</span>
          <Icon name="ArrowRight" size={16} color="currentColor" />
        </Link>
      </div>

      {error && (
        <div className="bg-error-50 dark:bg-red-900/20 border border-error-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} color="var(--color-error)" />
            <p className="text-error dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {recentTransactions.map((transaction) => {
          const statusConfig = getStatusConfig(transaction.status);
          const avatar = generateCustomerAvatar(transaction.customer, transaction.customerEmail);
          
          return (
            <div
              key={transaction.id}
              onClick={() => handleTransactionClick(transaction.id)}
              className="
                flex items-center space-x-4 p-4 rounded-lg
                hover:bg-background dark:hover:bg-gray-700 transition-smooth cursor-pointer
                border border-transparent dark:border-gray-700 hover:border-border dark:hover:border-gray-600
                group
              "
            >
              {/* Customer Avatar */}
              <div className="flex-shrink-0">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: avatar.color }}
                >
                  {avatar.initials}
                </div>
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-text-primary dark:text-white font-medium truncate">
                    {transaction.customer}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Icon 
                      name={getCryptoIcon(transaction.cryptocurrency)} 
                      size={16} 
                      color="var(--color-text-secondary)"
                    />
                    <span className="text-text-primary dark:text-white font-medium">
                      ${transaction.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-text-secondary dark:text-gray-400 text-sm">
                      {transaction.cryptoAmount} {transaction.cryptoSymbol}
                    </span>
                    <span className="text-text-secondary dark:text-gray-400 text-sm">•</span>
                    <span className="text-text-secondary dark:text-gray-400 text-sm">
                      {formatTimeAgo(transaction.timestamp)}
                    </span>
                  </div>
                  
                  <div className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${statusConfig.color} ${statusConfig.bgColor}
                  `}>
                    <Icon 
                      name={statusConfig.icon} 
                      size={12} 
                      color="currentColor"
                      className="mr-1"
                    />
                    {statusConfig.label}
                  </div>
                </div>
              </div>

              {/* Action Arrow */}
              <div className="flex-shrink-0">
                <Icon 
                  name="ChevronRight" 
                  size={16} 
                  color="var(--color-text-secondary)"
                  className="opacity-0 group-hover:opacity-100 transition-smooth"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!loading && !error && recentTransactions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-secondary-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Activity" size={32} color="var(--color-text-secondary)" />
          </div>
          <h3 className="text-text-primary dark:text-white font-medium mb-2">No Recent Activity</h3>
          <p className="text-text-secondary dark:text-gray-400 text-sm mb-4">
            Your recent transactions will appear here once you start processing payments.
          </p>
          <Link
            to="/dashboard/payments-management"
            className="
              inline-flex items-center space-x-2 px-4 py-2
              bg-primary dark:bg-teal-500 text-white rounded-lg
              hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
              font-medium text-sm
            "
          >
            <Icon name="Plus" size={16} color="currentColor" />
            <span>View Payments</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;