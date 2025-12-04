import React, { useState } from 'react';
import Icon from 'components/AppIcon';

const ExportHistory = () => {
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const mockExportHistory = [
    {
      id: 'EXP_2024_001',
      name: 'Monthly Transaction Report - January 2024',
      format: 'CSV',
      status: 'completed',
      createdAt: '2024-01-15T14:30:00Z',
      completedAt: '2024-01-15T14:32:15Z',
      recordCount: 1247,
      fileSize: '2.3 MB',
      downloadUrl: '#',
      expiresAt: '2024-02-15T14:32:15Z'
    },
    {
      id: 'EXP_2024_002',
      name: 'Weekly Bitcoin Transactions',
      format: 'Excel',
      status: 'completed',
      createdAt: '2024-01-14T09:15:00Z',
      completedAt: '2024-01-14T09:17:45Z',
      recordCount: 342,
      fileSize: '1.8 MB',
      downloadUrl: '#',
      expiresAt: '2024-02-14T09:17:45Z'
    },
    {
      id: 'EXP_2024_003',
      name: 'Failed Transactions Analysis',
      format: 'PDF',
      status: 'processing',
      createdAt: '2024-01-15T16:45:00Z',
      completedAt: null,
      recordCount: 89,
      fileSize: null,
      downloadUrl: null,
      expiresAt: null
    },
    {
      id: 'EXP_2024_004',
      name: 'Q4 2023 Complete Report',
      format: 'CSV',
      status: 'expired',
      createdAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:05:30Z',
      recordCount: 5432,
      fileSize: '8.7 MB',
      downloadUrl: null,
      expiresAt: '2024-01-08T10:05:30Z'
    },
    {
      id: 'EXP_2024_005',
      name: 'Customer Payment Summary',
      format: 'Excel',
      status: 'failed',
      createdAt: '2024-01-13T11:20:00Z',
      completedAt: null,
      recordCount: 0,
      fileSize: null,
      downloadUrl: null,
      expiresAt: null
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success-100';
      case 'processing':
        return 'text-warning bg-warning-100 pulse-pending';
      case 'failed':
        return 'text-error bg-error-100';
      case 'expired':
        return 'text-text-secondary bg-secondary-100';
      default:
        return 'text-text-secondary bg-secondary-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'CheckCircle';
      case 'processing':
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
    switch (format.toLowerCase()) {
      case 'csv':
        return 'FileText';
      case 'excel':
        return 'FileSpreadsheet';
      case 'pdf':
        return 'FileText';
      default:
        return 'File';
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

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  };

  const handleDownload = (exportItem) => {
    if (exportItem.status === 'completed' && exportItem.downloadUrl) {
      // In a real app, this would trigger the download
      console.log('Downloading:', exportItem.name);
    }
  };

  const handleRetry = (exportItem) => {
    if (exportItem.status === 'failed') {
      // In a real app, this would retry the export
      console.log('Retrying export:', exportItem.name);
    }
  };

  const handleDelete = (exportId) => {
    // In a real app, this would delete the export
    console.log('Deleting export:', exportId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary flex items-center space-x-2">
            <Icon name="Clock" size={20} color="currentColor" />
            <span>Export History</span>
          </h3>
          <div className="flex items-center space-x-3">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="
                px-3 py-2 border border-border rounded-lg text-sm
                bg-background text-text-primary
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
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
          <p>Export files are automatically deleted after 7 days. Download your files before they expire.</p>
        </div>
      </div>

      {/* Export List */}
      <div className="space-y-4">
        {mockExportHistory.map((exportItem) => (
          <div
            key={exportItem.id}
            className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-6 hover:shadow-card transition-smooth"
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
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-md font-medium text-text-primary truncate">
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
                    {isExpiringSoon(exportItem.expiresAt) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning">
                        <Icon name="AlertTriangle" size={12} color="currentColor" className="mr-1" />
                        Expires Soon
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
                      {exportItem.expiresAt && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium">Expires:</span> {formatDate(exportItem.expiresAt)}
                        </>
                      )}
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

      {/* Empty State */}
      {mockExportHistory.length === 0 && (
        <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-secondary-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="FileText" size={32} color="var(--color-text-secondary)" />
          </div>
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-2">No Export History</h3>
          <p className="text-text-secondary mb-6">
            You haven't created any exports yet. Generate your first report to see it here.
          </p>
          <button className="
            px-6 py-3 bg-primary dark:bg-teal-500 text-white rounded-lg
            hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
            font-medium
          ">
            Create First Export
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportHistory;
