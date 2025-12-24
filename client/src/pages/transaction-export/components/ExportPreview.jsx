import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { paymentsAPI } from 'utils/api';

const ExportPreview = ({ config }) => {
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState('0 KB');

  // Only use the columns selected in config - NO EXTRA COLUMNS
  const displayColumns = config.columns && config.columns.length > 0 
    ? config.columns 
    : [];

  useEffect(() => {
    fetchPreviewData();
  }, [config]);

  const fetchPreviewData = async () => {
    try {
      setLoading(true);

      const params = {
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      // Apply status filter
      if (config.status && config.status !== 'all') {
        params.status = config.status;
      }

      // Apply cryptocurrency filter
      if (config.cryptocurrencies && 
          config.cryptocurrencies.length > 0 && 
          !config.cryptocurrencies.includes('all')) {
        params.cryptoType = config.cryptocurrencies[0];
      }

      // Apply amount range filters
      if (config.amountRange?.min && config.amountRange.min !== '') {
        params.amountMin = parseFloat(config.amountRange.min);
      }
      if (config.amountRange?.max && config.amountRange.max !== '') {
        params.amountMax = parseFloat(config.amountRange.max);
      }

      console.log('📊 Fetching preview data with params:', params);

      const response = await paymentsAPI.getAll(params);

      if (response.success) {
        let payments = response.payments || [];
        
        // Client-side filtering for amount range (backup if server doesn't support it)
        if (config.amountRange?.min && config.amountRange.min !== '') {
          const minAmount = parseFloat(config.amountRange.min);
          payments = payments.filter(p => (p.amountUSD || 0) >= minAmount);
        }
        if (config.amountRange?.max && config.amountRange.max !== '') {
          const maxAmount = parseFloat(config.amountRange.max);
          payments = payments.filter(p => (p.amountUSD || 0) <= maxAmount);
        }
        
        setPreviewData(payments);
        setTotalRecords(payments.length);
        
        // Estimate file size based on selected columns only
        const avgBytesPerRecord = displayColumns.length * 35;
        const estimatedBytes = payments.length * avgBytesPerRecord;
        
        // PDF files are typically larger
        const multiplier = config.format === 'pdf' ? 3 : 1;
        setEstimatedSize(formatFileSize(estimatedBytes * multiplier));
      } else {
        setPreviewData([]);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error('❌ Error fetching preview data:', error);
      setPreviewData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getColumnLabel = (column) => {
    const labels = {
      transactionId: 'Transaction ID',
      payId: 'Payment ID',
      amount: 'Amount (USD)',
      amountCrypto: 'Crypto Amount',
      cryptocurrency: 'Cryptocurrency',
      cryptoSymbol: 'Symbol',
      network: 'Network',
      status: 'Status',
      date: 'Date',
      customer: 'Customer',
      customerEmail: 'Email',
      walletAddress: 'Wallet Address',
      hash: 'TX Hash',
      fees: 'Fees',
      exchangeRate: 'Exchange Rate',
      productId: 'Product ID',
      completedAt: 'Completed At',
      failureReason: 'Failure Reason'
    };
    return labels[column] || column;
  };

  const getColumnValue = (payment, column) => {
    switch (column) {
      case 'transactionId':
      case 'payId':
        return payment.payId || payment.id || '-';
      case 'amount':
        return `$${(payment.amountUSD || 0).toFixed(2)}`;
      case 'amountCrypto':
        return `${payment.amountCrypto || 0} ${payment.cryptoSymbol || ''}`;
      case 'cryptocurrency':
        return payment.cryptoType || '-';
      case 'cryptoSymbol':
        return payment.cryptoSymbol || payment.cryptoType || '-';
      case 'network':
        return payment.network || '-';
      case 'status':
        return payment.status || 'pending';
      case 'date':
        return payment.createdAt 
          ? new Date(payment.createdAt).toLocaleString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : '-';
      case 'customer':
        return payment.customerName || 'Unknown';
      case 'customerEmail':
        return payment.customerEmail || '-';
      case 'walletAddress':
        if (!payment.walletAddress) return '-';
        const addr = payment.walletAddress;
        return addr.length > 16 ? `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}` : addr;
      case 'hash':
        if (!payment.hash) return '-';
        const h = payment.hash;
        return h.length > 16 ? `${h.substring(0, 8)}...${h.substring(h.length - 4)}` : h;
      case 'fees':
        return payment.fees ? `$${payment.fees.toFixed(2)}` : '$0.00';
      case 'exchangeRate':
        return payment.exchangeRate ? `$${payment.exchangeRate.toLocaleString()}` : '-';
      case 'productId':
        return payment.productId || '-';
      case 'completedAt':
        return payment.completedAt 
          ? new Date(payment.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '-';
      case 'failureReason':
        return payment.failureReason || '-';
      default:
        return '-';
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { bg: 'bg-success-100 dark:bg-green-900/30', text: 'text-success-700 dark:text-green-400', icon: 'CheckCircle' },
      pending: { bg: 'bg-warning-100 dark:bg-yellow-900/30', text: 'text-warning-700 dark:text-yellow-400', icon: 'Clock' },
      failed: { bg: 'bg-error-100 dark:bg-red-900/30', text: 'text-error-700 dark:text-red-400', icon: 'XCircle' }
    };
    const cfg = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        <Icon name={cfg.icon} size={10} color="currentColor" className="mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getDateRangeLabel = () => {
    const ranges = {
      today: 'Today', yesterday: 'Yesterday', last7days: 'Last 7 Days',
      last30days: 'Last 30 Days', last90days: 'Last 90 Days',
      thisMonth: 'This Month', lastMonth: 'Last Month', custom: 'Custom Range'
    };
    return ranges[config.dateRange] || config.dateRange;
  };

  const getFormatIcon = () => {
    switch (config.format) {
      case 'pdf': return 'FileText';
      case 'json': return 'FileJson';
      case 'excel': return 'FileSpreadsheet';
      default: return 'FileText';
    }
  };

  if (loading) {
    return (
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
            <p className="text-text-secondary dark:text-gray-400">Loading preview data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no columns selected
  if (displayColumns.length === 0) {
    return (
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="text-center py-12">
          <Icon name="Columns" size={48} color="var(--color-text-secondary)" className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-2">No Columns Selected</h3>
          <p className="text-text-secondary dark:text-gray-400">
            Please select at least one column in the Configure Export tab to see a preview.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Icon name="Eye" size={20} className="text-primary dark:text-teal-400" />
            <h3 className="text-lg font-medium text-text-primary dark:text-white">Data Preview</h3>
          </div>
          <div className="flex items-center space-x-4 text-sm text-text-secondary dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Icon name={getFormatIcon()} size={14} color="currentColor" />
              <span className="font-medium text-text-primary dark:text-white">{config.format.toUpperCase()}</span>
            </div>
            <span>•</span>
            <span>Records: <span className="font-medium text-text-primary dark:text-white">{totalRecords.toLocaleString()}</span></span>
            <span>•</span>
            <span>Est. size: <span className="font-medium text-text-primary dark:text-white">{estimatedSize}</span></span>
          </div>
        </div>
        
        <div className="flex items-center flex-wrap gap-2 text-sm text-text-secondary dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Icon name="Calendar" size={14} color="currentColor" />
            <span>Range: <span className="font-medium text-text-primary dark:text-white">{getDateRangeLabel()}</span></span>
          </div>
          {config.status !== 'all' && (
            <>
              <span>•</span>
              <span>Status: <span className="font-medium text-text-primary dark:text-white capitalize">{config.status}</span></span>
            </>
          )}
          {config.cryptocurrencies && !config.cryptocurrencies.includes('all') && (
            <>
              <span>•</span>
              <span>Crypto: <span className="font-medium text-text-primary dark:text-white">{config.cryptocurrencies.join(', ')}</span></span>
            </>
          )}
          <span>•</span>
          <span>Columns: <span className="font-medium text-text-primary dark:text-white">{displayColumns.length}</span></span>
        </div>
      </div>

      {/* Preview Table - ONLY SELECTED COLUMNS */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border dark:divide-gray-700">
            <thead className="bg-secondary-50 dark:bg-gray-900">
              <tr>
                {displayColumns.map((column) => (
                  <th key={column} className="px-3 py-3 text-left text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {getColumnLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-surface dark:bg-gray-800 divide-y divide-border dark:divide-gray-700">
              {previewData.length > 0 ? (
                previewData.map((payment, index) => (
                  <tr key={payment.payId || payment.id || index} className="hover:bg-secondary-50 dark:hover:bg-gray-700/50 transition-smooth">
                    {displayColumns.map((column) => (
                      <td key={column} className="px-3 py-3 text-sm text-text-primary dark:text-gray-300 whitespace-nowrap">
                        {column === 'status' ? (
                          getStatusBadge(getColumnValue(payment, column))
                        ) : column === 'transactionId' || column === 'payId' ? (
                          <code className="font-mono text-xs bg-secondary-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-text-primary dark:text-gray-300">
                            {getColumnValue(payment, column)}
                          </code>
                        ) : column === 'walletAddress' || column === 'hash' ? (
                          <code className="font-mono text-xs text-text-secondary dark:text-gray-400">
                            {getColumnValue(payment, column)}
                          </code>
                        ) : column === 'amount' ? (
                          <span className="font-medium text-success dark:text-green-400">
                            {getColumnValue(payment, column)}
                          </span>
                        ) : (
                          getColumnValue(payment, column)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={displayColumns.length} className="px-4 py-12 text-center text-text-secondary dark:text-gray-400">
                    <Icon name="FileText" size={32} color="currentColor" className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-text-primary dark:text-white mb-1">No data found</p>
                    <p className="text-sm">Try adjusting your filters to see more results</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-3 bg-secondary-50 dark:bg-gray-900 border-t border-border dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Showing {previewData.length} of {totalRecords.toLocaleString()} records
          </p>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            {displayColumns.length} column{displayColumns.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      </div>

      {/* Selected Columns Summary */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <h4 className="text-sm font-medium text-text-primary dark:text-white mb-3">
          Columns in Export ({displayColumns.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {displayColumns.map((column) => (
            <span key={column} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-teal-900/30 text-primary dark:text-teal-400 border border-primary-200 dark:border-teal-800/50">
              {getColumnLabel(column)}
            </span>
          ))}
        </div>
      </div>

      {/* Warning if no data */}
      {previewData.length === 0 && (
        <div className="bg-warning-50 dark:bg-yellow-900/20 border border-warning-200 dark:border-yellow-800/50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Icon name="AlertTriangle" size={20} className="text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-warning-800 dark:text-yellow-300">No matching data</h4>
              <p className="text-sm text-warning-700 dark:text-yellow-400 mt-1">
                No transactions match your current filter criteria. Try expanding your date range or adjusting other filters.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPreview;
