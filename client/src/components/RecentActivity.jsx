import React from 'react';
import Icon from 'components/AppIcon';

const RecentActivity = ({ transactions = [] }) => {
  const handleViewAll = () => {
    // Logic to view all transactions
  };

  const handleTransactionClick = (transaction) => {
    // Logic to handle transaction click
  };

  return (
    <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-text-primary dark:text-white">
              Recent Activity
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 mt-0.5">
              Latest payment transactions
            </p>
          </div>
          <button
            onClick={handleViewAll}
            className="
              flex items-center space-x-1 sm:space-x-2 
              text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300
              text-xs sm:text-sm font-medium transition-smooth
            "
          >
            <span>View All</span>
            <Icon name="ArrowRight" size={14} className="sm:w-4 sm:h-4" color="currentColor" />
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="divide-y divide-border dark:divide-gray-700">
        {transactions.length > 0 ? (
          transactions.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              className="p-3 sm:p-4 hover:bg-secondary-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => handleTransactionClick(transaction)}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                  <span className="text-sm sm:text-base font-semibold text-primary dark:text-teal-400">
                    {transaction.customer?.name?.substring(0, 2).toUpperCase() || 'HP'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    {/* Name and Amount */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-medium text-text-primary dark:text-white truncate">
                        {transaction.customer?.name || 'Unknown Customer'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm sm:text-base font-semibold text-text-primary dark:text-white">
                          ${transaction.amount?.toLocaleString() || '0.00'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0
                      ${transaction.status === 'completed' || transaction.status === 'success'
                        ? 'bg-success-100 dark:bg-green-900/30 text-success dark:text-green-400'
                        : transaction.status === 'pending'
                        ? 'bg-warning-100 dark:bg-yellow-900/30 text-warning dark:text-yellow-400'
                        : 'bg-error-100 dark:bg-red-900/30 text-error dark:text-red-400'
                      }
                    `}>
                      <Icon 
                        name={transaction.status === 'failed' ? 'XCircle' : 'CheckCircle'} 
                        size={10} 
                        className="mr-1" 
                        color="currentColor" 
                      />
                      {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1) || 'Unknown'}
                    </span>
                  </div>

                  {/* Crypto and Time */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-text-secondary dark:text-gray-400">
                    <span className="truncate">
                      {transaction.cryptoAmount || '0.00'} {transaction.cryptocurrency || 'USDT'}
                    </span>
                    <span className="flex-shrink-0">•</span>
                    <span className="flex-shrink-0">
                      {transaction.timestamp || transaction.createdAt 
                        ? formatTimestamp(transaction.timestamp || transaction.createdAt)
                        : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          /* Empty State */
          <div className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Icon name="Activity" size={24} className="sm:w-8 sm:h-8" color="var(--color-text-secondary)" />
            </div>
            <h4 className="text-sm sm:text-base font-medium text-text-primary dark:text-white mb-1 sm:mb-2">
              No Recent Activity
            </h4>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">
              Transaction activity will appear here once you start processing payments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default RecentActivity;