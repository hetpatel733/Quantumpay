import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { exportAPI } from 'utils/api';
import { useToast } from 'contexts/ToastContext';

const ExportHistory = ({ refreshTrigger = 0 }) => {
  const { showToast } = useToast();
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch exports on mount and when refreshTrigger changes
  useEffect(() => {
    fetchExports();
  }, [refreshTrigger]);

  // Poll for processing exports
  useEffect(() => {
    const hasProcessing = exports.some(exp => exp.status === 'processing' || exp.status === 'pending');
    
    if (hasProcessing) {
      const pollInterval = setInterval(() => {
        fetchExports();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [exports]);

  const fetchExports = async () => {
    try {
      const response = await exportAPI.getAll({ limit: 50 });
      
      if (response.success) {
        setExports(response.exports || []);
      } else {
        console.error('Failed to fetch exports:', response.message);
      }
    } catch (error) {
      console.error('Error fetching exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success-100 dark:bg-green-900/30';
      case 'processing':
      case 'pending':
        return 'text-warning bg-warning-100 dark:bg-yellow-900/30 animate-pulse';
      case 'failed':
        return 'text-error bg-error-100 dark:bg-red-900/30';
      case 'expired':
        return 'text-text-secondary bg-secondary-100 dark:bg-gray-700';
      default:
        return 'text-text-secondary bg-secondary-100 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'CheckCircle';
      case 'processing':
      case 'pending':
        return 'Clock';
      case 'failed':
        return 'XCircle';
      case 'expired':
        return 'AlertTriangle';
      default:
        return 'HelpCircle';
    }
  };

  const getFormatIcon = (format) => {
    switch (format?.toLowerCase()) {
      case 'csv':
        return 'FileText';
      case 'excel':
        return 'FileSpreadsheet';
      case 'pdf':
        return 'FileText';
      case 'json':
        return 'FileJson';
      default:
        return 'File';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const minutesUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60));
    return minutesUntilExpiry <= 15 && minutesUntilExpiry > 0;
  };

  const getTimeUntilExpiry = (expiresAt) => {
    if (!expiresAt) return '';
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const minutesUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60));
    
    if (minutesUntilExpiry <= 0) return 'Expired';
    if (minutesUntilExpiry < 60) return `${minutesUntilExpiry}m left`;
    return `${Math.floor(minutesUntilExpiry / 60)}h ${minutesUntilExpiry % 60}m left`;
  };

  const handleDownload = (exportItem) => {
    if (exportItem.status === 'completed' && exportItem.downloadUrl) {
      window.open(exportItem.downloadUrl, '_blank');
      showToast('Download started!', 'success');
    }
  };

  const handleRetry = async (exportItem) => {
    try {
      const response = await exportAPI.retry(exportItem.id);
      
      if (response.success) {
        showToast('Export retry started!', 'success');
        fetchExports();
      } else {
        showToast('Failed to retry export: ' + response.message, 'error');
      }
    } catch (error) {
      console.error('Retry error:', error);
      showToast('Failed to retry export', 'error');
    }
  };

  const handleDelete = async (exportId) => {
    if (!window.confirm('Are you sure you want to delete this export?')) return;

    try {
      const response = await exportAPI.delete(exportId);
      
      if (response.success) {
        setExports(prev => prev.filter(exp => exp.id !== exportId));
        showToast('Export deleted successfully', 'success');
      } else {
        showToast('Failed to delete export: ' + response.message, 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete export', 'error');
    }
  };

  // Sort exports
  const sortedExports = [...exports].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }
    if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortBy === 'status') {
      return sortOrder === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary dark:text-white flex items-center space-x-2">
            <Icon name="Clock" size={20} color="currentColor" />
            <span>Export History</span>
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchExports}
              className="p-2 hover:bg-secondary-100 dark:hover:bg-gray-700 rounded-lg transition-smooth text-text-secondary dark:text-gray-400"
              title="Refresh"
            >
              <Icon name="RefreshCcw" size={16} color="currentColor" />
            </button>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="
                px-3 py-2 border border-border dark:border-gray-700 rounded-lg text-sm
                bg-background dark:bg-gray-900 text-text-primary dark:text-white
                focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 focus:border-transparent
                transition-smooth
              "
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="status-asc">Status</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-text-secondary dark:text-gray-400">
          <p>Export files are available for download for 1 hour after generation. Download your files before they expire.</p>
        </div>
      </div>

      {/* Export List */}
      {sortedExports.length > 0 ? (
        <div className="space-y-4">
          {sortedExports.map((exportItem) => (
            <div
              key={exportItem.id}
              className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6 hover:shadow-card dark:hover:shadow-teal-500/5 transition-smooth"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Format Icon */}
                  <div className="w-10 h-10 bg-secondary-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon 
                      name={getFormatIcon(exportItem.format)} 
                      size={20} 
                      color="var(--color-text-secondary)" 
                    />
                  </div>

                  {/* Export Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                      <h4 className="text-md font-medium text-text-primary dark:text-white truncate">
                        {exportItem.name}
                      </h4>
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${getStatusColor(exportItem.status)}
                      `}>
                        <Icon 
                          name={getStatusIcon(exportItem.status)} 
                          size={12} 
                          color="currentColor"
                          className="mr-1"
                        />
                        {exportItem.status.charAt(0).toUpperCase() + exportItem.status.slice(1)}
                      </span>
                      {exportItem.status === 'completed' && isExpiringSoon(exportItem.expiresAt) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 dark:bg-yellow-900/30 text-warning dark:text-yellow-400">
                          <Icon name="AlertTriangle" size={12} color="currentColor" className="mr-1" />
                          {getTimeUntilExpiry(exportItem.expiresAt)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-text-secondary dark:text-gray-400">
                      <div>
                        <span className="font-medium">Format:</span> {exportItem.format}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(exportItem.createdAt)}
                      </div>
                      {exportItem.recordCount > 0 && (
                        <div>
                          <span className="font-medium">Records:</span> {exportItem.recordCount.toLocaleString()}
                        </div>
                      )}
                      {exportItem.fileSize && (
                        <div>
                          <span className="font-medium">Size:</span> {exportItem.fileSize}
                        </div>
                      )}
                    </div>

                    {exportItem.completedAt && (
                      <div className="mt-2 text-sm text-text-secondary dark:text-gray-400">
                        <span className="font-medium">Completed:</span> {formatDate(exportItem.completedAt)}
                        {exportItem.expiresAt && exportItem.status === 'completed' && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="font-medium">Expires:</span> {formatDate(exportItem.expiresAt)}
                          </>
                        )}
                      </div>
                    )}

                    {exportItem.errorMessage && (
                      <div className="mt-2 text-sm text-error dark:text-red-400">
                        <span className="font-medium">Error:</span> {exportItem.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  {exportItem.status === 'completed' && exportItem.downloadUrl && (
                    <button
                      onClick={() => handleDownload(exportItem)}
                      className="
                        flex items-center space-x-2 px-3 py-2
                        bg-primary dark:bg-teal-500 text-white rounded-lg text-sm
                        hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
                      "
                    >
                      <Icon name="Download" size={16} color="currentColor" />
                      <span>Download</span>
                    </button>
                  )}

                  {exportItem.status === 'failed' && (
                    <button
                      onClick={() => handleRetry(exportItem)}
                      className="
                        flex items-center space-x-2 px-3 py-2
                        bg-warning text-white rounded-lg text-sm
                        hover:bg-warning-700 transition-smooth
                      "
                    >
                      <Icon name="RotateCcw" size={16} color="currentColor" />
                      <span>Retry</span>
                    </button>
                  )}

                  {(exportItem.status === 'processing' || exportItem.status === 'pending') && (
                    <span className="text-sm text-text-secondary dark:text-gray-400 flex items-center space-x-2">
                      <Icon name="Loader2" size={16} color="currentColor" className="animate-spin" />
                      <span>Processing...</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(exportItem.id)}
                    className="
                      p-2 rounded-lg text-text-secondary dark:text-gray-400
                      hover:bg-error-100 dark:hover:bg-red-900/30 hover:text-error dark:hover:text-red-400 transition-smooth
                    "
                    title="Delete export"
                  >
                    <Icon name="Trash2" size={16} color="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-secondary-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="FileText" size={32} color="var(--color-text-secondary)" />
          </div>
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-2">No Export History</h3>
          <p className="text-text-secondary dark:text-gray-400 mb-6">
            You haven't created any exports yet. Configure your export settings and generate your first report.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExportHistory;
