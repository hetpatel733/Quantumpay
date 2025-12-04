import React from 'react';
import Icon from 'components/AppIcon';

const ExportConfiguration = ({ config, onConfigChange }) => {
  // Add missing data arrays
  const dateRangeOptions = [
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'last90days', label: 'Last 90 Days' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' }
  ];

  const cryptocurrencyOptions = [
    { value: 'Bitcoin', label: 'Bitcoin (BTC)' },
    { value: 'Ethereum', label: 'Ethereum (ETH)' },
    { value: 'USDT', label: 'Tether (USDT)' },
    { value: 'USDC', label: 'USD Coin (USDC)' },
    { value: 'MATIC', label: 'Polygon (MATIC)' },
    { value: 'SOL', label: 'Solana (SOL)' }
  ];

  const formatOptions = [
    { value: 'csv', label: 'CSV', icon: 'FileText' },
    { value: 'excel', label: 'Excel', icon: 'FileSpreadsheet' },
    { value: 'pdf', label: 'PDF', icon: 'FileType' }
  ];

  const columnOptions = [
    { value: 'transactionId', label: 'Transaction ID' },
    { value: 'amount', label: 'Amount' },
    { value: 'cryptocurrency', label: 'Cryptocurrency' },
    { value: 'status', label: 'Status' },
    { value: 'date', label: 'Date' },
    { value: 'customer', label: 'Customer' },
    { value: 'fees', label: 'Fees' }
  ];

  // Add missing handler functions
  const handleConfigChange = (key, value) => {
    onConfigChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCryptocurrencyToggle = (crypto) => {
    const currentCryptos = config.cryptocurrencies || [];
    const newCryptos = currentCryptos.includes(crypto)
      ? currentCryptos.filter(c => c !== crypto)
      : [...currentCryptos, crypto];
    
    handleConfigChange('cryptocurrencies', newCryptos);
  };

  const handleColumnToggle = (column) => {
    const currentColumns = config.columns || [];
    const newColumns = currentColumns.includes(column)
      ? currentColumns.filter(c => c !== column)
      : [...currentColumns, column];
    
    handleConfigChange('columns', newColumns);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Filters */}
      <div className="space-y-6">
        {/* Date Range */}
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-4 flex items-center space-x-2">
            <Icon name="Calendar" size={20} color="currentColor" />
            <span>Date Range</span>
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                Select Range
              </label>
              <select
                value={config.dateRange}
                onChange={(e) => handleConfigChange('dateRange', e.target.value)}
                className="
                  w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                  bg-background dark:bg-gray-900 text-text-primary dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                  transition-smooth
                "
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {config.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={config.customStartDate}
                    onChange={(e) => handleConfigChange('customStartDate', e.target.value)}
                    className="
                      w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                      bg-background dark:bg-gray-900 text-text-primary dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                      transition-smooth
                    "
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={config.customEndDate}
                    onChange={(e) => handleConfigChange('customEndDate', e.target.value)}
                    className="
                      w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                      bg-background dark:bg-gray-900 text-text-primary dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                      transition-smooth
                    "
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-4 flex items-center space-x-2">
            <Icon name="Filter" size={20} color="currentColor" />
            <span>Transaction Status</span>
          </h3>
          
          <select
            value={config.status}
            onChange={(e) => handleConfigChange('status', e.target.value)}
            className="
              w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
              bg-background dark:bg-gray-900 text-text-primary dark:text-white
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              transition-smooth
            "
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cryptocurrency Filter */}
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-4 flex items-center space-x-2">
            <Icon name="Coins" size={20} color="currentColor" />
            <span>Cryptocurrencies</span>
          </h3>
          
          <div className="space-y-2">
            {cryptocurrencyOptions.map(crypto => (
              <label key={crypto.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.cryptocurrencies?.includes(crypto.value) || false}
                  onChange={() => handleCryptocurrencyToggle(crypto.value)}
                  className="
                    w-4 h-4 text-primary border-border rounded
                    focus:ring-2 focus:ring-primary
                  "
                />
                <span className="text-text-primary dark:text-white">{crypto.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Amount Range */}
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-4 flex items-center space-x-2">
            <Icon name="DollarSign" size={20} color="currentColor" />
            <span>Amount Range</span>
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                Minimum Amount
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={config.amountRange?.min || ''}
                onChange={(e) => handleConfigChange('amountRange', {
                  ...config.amountRange,
                  min: e.target.value
                })}
                className="
                  w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                  bg-background dark:bg-gray-900 text-text-primary dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                  transition-smooth
                "
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                Maximum Amount
              </label>
              <input
                type="number"
                placeholder="10000.00"
                value={config.amountRange?.max || ''}
                onChange={(e) => handleConfigChange('amountRange', {
                  ...config.amountRange,
                  max: e.target.value
                })}
                className="
                  w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                  bg-background dark:bg-gray-900 text-text-primary dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                  transition-smooth
                "
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Format & Options */}
      <div className="space-y-6">
        {/* Export Format */}
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-4 flex items-center space-x-2">
            <Icon name="FileType" size={20} color="currentColor" />
            <span>Export Format</span>
          </h3>
          
          <div className="grid grid-cols-3 gap-3">
            {formatOptions.map(format => (
              <button
                key={format.value}
                onClick={() => handleConfigChange('format', format.value)}
                className={`
                  flex flex-col items-center space-y-2 p-4 rounded-lg border-2 transition-smooth
                  ${config.format === format.value
                    ? 'border-primary dark:border-teal-500 bg-primary-50 dark:bg-teal-900/20 text-primary dark:text-teal-400' 
                    : 'border-border dark:border-gray-700 hover:border-secondary-300 dark:hover:border-gray-600 text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
                  }
                `}
              >
                <Icon name={format.icon} size={24} color="currentColor" />
                <span className="text-sm font-medium">{format.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Column Selection */}
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-4 flex items-center space-x-2">
            <Icon name="Columns" size={20} color="currentColor" />
            <span>Include Columns</span>
          </h3>
          
          <div className="space-y-2">
            {columnOptions.map(column => (
              <label key={column.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.columns?.includes(column.value) || false}
                  onChange={() => handleColumnToggle(column.value)}
                  className="
                    w-4 h-4 text-primary border-border rounded
                    focus:ring-2 focus:ring-primary
                  "
                />
                <span className="text-text-primary dark:text-white">{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-4 flex items-center space-x-2">
            <Icon name="Settings" size={20} color="currentColor" />
            <span>Additional Options</span>
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeHeaders}
                onChange={(e) => handleConfigChange('includeHeaders', e.target.checked)}
                className="
                  w-4 h-4 text-primary border-border rounded
                  focus:ring-2 focus:ring-primary
                "
              />
              <span className="text-text-primary dark:text-white">Include column headers</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.emailDelivery}
                onChange={(e) => handleConfigChange('emailDelivery', e.target.checked)}
                className="
                  w-4 h-4 text-primary border-border rounded
                  focus:ring-2 focus:ring-primary
                "
              />
              <span className="text-text-primary dark:text-white">Email when ready</span>
            </label>

            {config.emailDelivery && (
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={config.emailAddress}
                  onChange={(e) => handleConfigChange('emailAddress', e.target.value)}
                  className="
                    w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                    bg-background dark:bg-gray-900 text-text-primary dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    transition-smooth
                  "
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportConfiguration;
