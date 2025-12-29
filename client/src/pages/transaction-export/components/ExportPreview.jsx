import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { paymentsAPI } from 'utils/api';

const ExportPreview = ({ config }) => {
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState('0 KB');
  const [estimatedRecords, setEstimatedRecords] = useState(0);

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
        setEstimatedRecords(params.limit);
        
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

  const formatDateRange = (range) => {
    // Format the date range for display
    switch (range) {
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'last7days':
        return 'Last 7 Days';
      case 'last30days':
        return 'Last 30 Days';
      case 'last90days':
        return 'Last 90 Days';
      case 'thisMonth':
        return 'This Month';
      case 'lastMonth':
        return 'Last Month';
      case 'custom':
        return 'Custom Range';
      default:
        return range;
    }
  };

  const formatColumnName = (column) => {
    // Format column names for display
    const columnNames = {
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
    return columnNames[column] || column;
  };

  const formatCellValue = (value, column) => {
    // Format cell values based on column type
    switch (column) {
      case 'amount':
        return `$${(value || 0).toFixed(2)}`;
      case 'amountCrypto':
        return `${value || 0} ${config.cryptocurrencies[0] || ''}`;
      case 'date':
        return value 
          ? new Date(value).toLocaleString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : '-';
      case 'status':
        return getStatusBadge(value);
      case 'transactionId':
      case 'payId':
        return (
          <code className="font-mono text-xs bg-secondary-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-text-primary dark:text-gray-300">
            {value}
          </code>
        );
      case 'walletAddress':
      case 'hash':
        return (
          <code className="font-mono text-xs text-text-secondary dark:text-gray-400">
            {value}
          </code>
        );
      default:
        return value;
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
    <div className="space-y-4 sm:space-y-6">
      {/* Preview Header */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-base sm:text-lg font-medium text-text-primary dark:text-white flex items-center space-x-2">
            <Icon name="Eye" size={18} className="sm:w-5 sm:h-5" color="currentColor" />
            <span>Data Preview</span>
          </h3>
        </div>

        {/* Summary Stats - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-background dark:bg-gray-900 rounded-lg p-3 sm:p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="FileText" size={14} className="sm:w-4 sm:h-4" color="var(--color-primary)" />
              <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">Format</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-text-primary dark:text-white uppercase">
              {config.format || 'CSV'}
            </p>
          </div>

          <div className="bg-background dark:bg-gray-900 rounded-lg p-3 sm:p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="Calendar" size={14} className="sm:w-4 sm:h-4" color="var(--color-primary)" />
              <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">Range</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-text-primary dark:text-white truncate">
              {formatDateRange(config.dateRange)}
            </p>
          </div>

          <div className="bg-background dark:bg-gray-900 rounded-lg p-3 sm:p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="Columns" size={14} className="sm:w-4 sm:h-4" color="var(--color-primary)" />
              <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">Columns</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-text-primary dark:text-white">
              {config.columns?.length || 0}
            </p>
          </div>

          <div className="bg-background dark:bg-gray-900 rounded-lg p-3 sm:p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="Database" size={14} className="sm:w-4 sm:h-4" color="var(--color-primary)" />
              <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400 truncate">Est. Records</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-text-primary dark:text-white">
              {estimatedRecords.toLocaleString()}
            </p>
          </div>

          <div className="col-span-2 bg-background dark:bg-gray-900 rounded-lg p-3 sm:p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Icon name="HardDrive" size={14} className="sm:w-4 sm:h-4" color="var(--color-primary)" />
              <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">Est. Size</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-text-primary dark:text-white">
              {estimatedSize}
            </p>
          </div>
        </div>
      </div>

      {/* Data Table - Scrollable on mobile */}
      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
        </div>
      ) : (
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-border dark:border-gray-700">
            <h4 className="text-sm sm:text-base font-medium text-text-primary dark:text-white flex items-center space-x-2">
              <Icon name="Table" size={16} className="sm:w-5 sm:h-5" color="currentColor" />
              <span>Sample Data</span>
              <span className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">
                (First {previewData.length} records)
              </span>
            </h4>
          </div>

          {/* Horizontal scroll wrapper for mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-secondary-100 dark:bg-gray-700">
                <tr>
                  {config.columns.map((column) => (
                    <th 
                      key={column}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-text-primary dark:text-white whitespace-nowrap"
                    >
                      {formatColumnName(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-gray-700">
                {previewData.map((row, index) => (
                  <tr 
                    key={index}
                    className="hover:bg-secondary-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {config.columns.map((column) => (
                      <td 
                        key={column}
                        className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-text-secondary dark:text-gray-400 whitespace-nowrap"
                      >
                        {formatCellValue(row[column], column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile scroll hint */}
          <div className="sm:hidden p-3 bg-secondary-50 dark:bg-gray-700/30 border-t border-border dark:border-gray-700">
            <p className="text-xs text-text-secondary dark:text-gray-400 text-center flex items-center justify-center space-x-1">
              <Icon name="ArrowLeftRight" size={12} color="currentColor" />
              <span>Scroll horizontally to view all columns</span>
            </p>
          </div>
        </div>
      )}

      {/* Info Message */}
      <div className="bg-primary-50 dark:bg-teal-900/20 border border-primary-200 dark:border-teal-800 rounded-lg p-3 sm:p-4">
        <div className="flex items-start space-x-2 sm:space-x-3">
          <Icon name="Info" size={16} className="sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" color="var(--color-primary)" />
          <div>
            <p className="text-xs sm:text-sm text-text-primary dark:text-white font-medium mb-1">
              Preview Information
            </p>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-400">
              This is a sample preview. The actual export will contain all matching records based on your selected filters. 
              Estimated {estimatedRecords.toLocaleString()} records will be included in the final export.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPreview;
