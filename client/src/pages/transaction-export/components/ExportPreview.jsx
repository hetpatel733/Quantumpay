import React from 'react';
import Icon from 'components/AppIcon';

const ExportPreview = ({ config }) => {
  const mockTransactions = [
    {
      id: 'TXN_2024_001234',
      date: '2024-01-15T10:30:00Z',
      amount: 1250.00,
      cryptocurrency: 'Bitcoin',
      cryptoAmount: 0.03245,
      status: 'completed',
      customer: 'Acme Corporation',
      fees: 12.50,
      confirmations: 6
    },
    {
      id: 'TXN_2024_001235',
      date: '2024-01-15T09:15:00Z',
      amount: 750.00,
      cryptocurrency: 'Ethereum',
      cryptoAmount: 0.4521,
      status: 'pending',
      customer: 'Tech Solutions Ltd',
      fees: 7.50,
      confirmations: 3
    },
    {
      id: 'TXN_2024_001236',
      date: '2024-01-14T16:45:00Z',
      amount: 2100.00,
      cryptocurrency: 'USDT',
      cryptoAmount: 2100.00,
      status: 'completed',
      customer: 'Global Enterprises',
      fees: 21.00,
      confirmations: 12
    },
    {
      id: 'TXN_2024_001237',
      date: '2024-01-14T14:20:00Z',
      amount: 450.00,
      cryptocurrency: 'Litecoin',
      cryptoAmount: 6.25,
      status: 'failed',
      customer: 'StartupCo',
      fees: 0.00,
      confirmations: 0
    },
    {
      id: 'TXN_2024_001238',
      date: '2024-01-13T11:30:00Z',
      amount: 3200.00,
      cryptocurrency: 'Bitcoin',
      cryptoAmount: 0.08456,
      status: 'completed',
      customer: 'Enterprise Corp',
      fees: 32.00,
      confirmations: 8
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success-100';
      case 'pending':
        return 'text-warning bg-warning-100';
      case 'failed':
        return 'text-error bg-error-100';
      default:
        return 'text-text-secondary bg-secondary-100';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getColumnHeader = (column) => {
    const headers = {
      date: 'Date',
      id: 'Transaction ID',
      amount: 'Amount (USD)',
      cryptocurrency: 'Cryptocurrency',
      status: 'Status',
      customer: 'Customer',
      fees: 'Fees',
      confirmations: 'Confirmations'
    };
    return headers[column] || column;
  };

  const getColumnValue = (transaction, column) => {
    switch (column) {
      case 'date':
        return formatDate(transaction.date);
      case 'id':
        return transaction.id;
      case 'amount':
        return `$${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      case 'cryptocurrency':
        return `${transaction.cryptoAmount} ${transaction.cryptocurrency}`;
      case 'status':
        return transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1);
      case 'customer':
        return transaction.customer;
      case 'fees':
        return `$${transaction.fees.toFixed(2)}`;
      case 'confirmations':
        return transaction.confirmations.toString();
      default:
        return '-';
    }
  };

  const selectedColumns = config.columns || [];
  const estimatedRecords = 1247;

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary flex items-center space-x-2">
            <Icon name="Eye" size={20} color="currentColor" />
            <span>Data Preview</span>
          </h3>
          <div className="flex items-center space-x-4 text-sm text-text-secondary dark:text-gray-400">
            <span>Format: {config.format?.toUpperCase()}</span>
            <span>•</span>
            <span>Estimated records: {estimatedRecords.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Icon name="Calendar" size={16} color="currentColor" className="text-text-secondary dark:text-gray-400" />
            <span className="text-text-secondary dark:text-gray-400">
              Range: {config.dateRange === 'custom' 
                ? `${config.customStartDate} to ${config.customEndDate}`
                : config.dateRange?.replace(/([A-Z])/g, ' $1').toLowerCase()
              }
            </span>
          </div>
          {config.status !== 'all' && (
            <>
              <span className="text-text-secondary dark:text-gray-400">•</span>
              <div className="flex items-center space-x-2">
                <Icon name="Filter" size={16} color="currentColor" className="text-text-secondary dark:text-gray-400" />
                <span className="text-text-secondary dark:text-gray-400">
                  Status: {config.status.charAt(0).toUpperCase() + config.status.slice(1)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {config.includeHeaders && (
              <thead className="bg-secondary-50 border-b border-border">
                <tr>
                  {selectedColumns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-left text-sm font-medium text-text-secondary dark:text-gray-400"
                    >
                      {getColumnHeader(column)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-border">
              {mockTransactions.slice(0, 5).map((transaction, index) => (
                <tr key={transaction.id} className="hover:bg-secondary-50 dark:hover:bg-gray-700 transition-smooth">
                  {selectedColumns.map((column) => (
                    <td key={column} className="px-4 py-3 text-sm">
                      {column === 'status' ? (
                        <span className={`
                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${getStatusColor(transaction.status)}
                        `}>
                          {getColumnValue(transaction, column)}
                        </span>
                      ) : column === 'id' ? (
                        <code className="font-mono text-xs bg-secondary-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {getColumnValue(transaction, column)}
                        </code>
                      ) : (
                        <span className="text-text-primary dark:text-white">
                          {getColumnValue(transaction, column)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Preview Footer */}
        <div className="bg-secondary-50 px-4 py-3 border-t border-border">
          <div className="flex items-center justify-between text-sm text-text-secondary dark:text-gray-400">
            <span>Showing first 5 rows of {estimatedRecords.toLocaleString()} records</span>
            <div className="flex items-center space-x-4">
              <span>{selectedColumns.length} columns selected</span>
              <span>•</span>
              <span>Estimated file size: 2.3 MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Column Summary */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <h4 className="text-md font-medium text-text-primary dark:text-white mb-3">Selected Columns</h4>
        <div className="flex flex-wrap gap-2">
          {selectedColumns.map((column) => (
            <span
              key={column}
              className="
                inline-flex items-center px-3 py-1 rounded-full text-sm
                bg-primary-100 text-primary border border-primary-200
              "
            >
              {getColumnHeader(column)}
            </span>
          ))}
        </div>
        {selectedColumns.length === 0 && (
          <p className="text-text-secondary dark:text-gray-400 text-sm">No columns selected. Please select columns to include in the export.</p>
        )}
      </div>
    </div>
  );
};

export default ExportPreview;
