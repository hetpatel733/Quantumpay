import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import { useToast } from 'contexts/ToastContext';
import { exportAPI } from 'utils/api';

import ExportConfiguration from './components/ExportConfiguration';
import ExportPreview from './components/ExportPreview';
import ExportHistory from './components/ExportHistory';

const TransactionExport = () => {
  const { showToast } = useToast();
  const [exportConfig, setExportConfig] = useState({
    dateRange: 'last30days',
    customStartDate: '',
    customEndDate: '',
    status: 'all',
    cryptocurrencies: ['all'],
    amountRange: { min: '', max: '' },
    format: 'csv',
    // Default columns - reasonable starting set
    columns: [
      'transactionId',
      'date',
      'amount',
      'cryptocurrency',
      'status',
      'customer'
    ],
    includeHeaders: true,
    emailDelivery: false,
    emailAddress: ''
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('configure');
  const [refreshHistory, setRefreshHistory] = useState(0); // Trigger history refresh

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // Simulate initial progress
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      // Generate export name
      const exportName = `Transaction Report - ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}`;

      // Prepare export config for API
      const apiConfig = {
        name: exportName,
        format: exportConfig.format,
        filters: {
          dateRange: exportConfig.dateRange,
          customStartDate: exportConfig.customStartDate || undefined,
          customEndDate: exportConfig.customEndDate || undefined,
          status: exportConfig.status,
          cryptocurrencies: exportConfig.cryptocurrencies,
          amountMin: exportConfig.amountRange.min ? parseFloat(exportConfig.amountRange.min) : undefined,
          amountMax: exportConfig.amountRange.max ? parseFloat(exportConfig.amountRange.max) : undefined
        },
        columns: exportConfig.columns,
        includeHeaders: exportConfig.includeHeaders,
        emailDelivery: exportConfig.emailDelivery,
        emailAddress: exportConfig.emailDelivery ? exportConfig.emailAddress : undefined
      };

      //console.log('📤 Creating export with config:', apiConfig);

      const response = await exportAPI.create(apiConfig);

      clearInterval(progressInterval);

      if (response.success) {
        setExportProgress(100);
        showToast('Export job created! Processing in background...', 'success');
        
        // Switch to history tab to show the new export
        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
          setActiveTab('history');
          setRefreshHistory(prev => prev + 1); // Trigger history refresh
        }, 1000);
      } else {
        throw new Error(response.message || 'Failed to create export');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('❌ Export error:', error);
      showToast('Failed to create export: ' + error.message, 'error');
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const tabs = [
    { id: 'configure', label: 'Configure Export', icon: 'Settings' },
    { id: 'preview', label: 'Preview Data', icon: 'Eye' },
    { id: 'history', label: 'Export History', icon: 'Clock' }
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 overflow-x-hidden max-w-full">
      <div className="px-6 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center">
                <Icon name="Download" size={24} color="var(--color-primary)" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-text-primary dark:text-white">Transaction Export</h1>
                <p className="text-text-secondary dark:text-gray-400">Generate comprehensive payment reports for analysis</p>
              </div>
            </div>
            
            {activeTab === 'configure' && (
              <button
                onClick={handleExport}
                disabled={isExporting || exportConfig.columns.length === 0}
                className="
                  flex items-center space-x-2 px-6 py-3
                  bg-primary dark:bg-teal-500 text-white rounded-lg
                  hover:bg-primary-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-smooth font-medium
                "
              >
                {isExporting ? (
                  <>
                    <Icon name="Loader2" size={20} color="currentColor" className="animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Icon name="Download" size={20} color="currentColor" />
                    <span>Generate Export</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="mb-6 bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary dark:text-white">Generating Export</span>
              <span className="text-sm text-text-secondary dark:text-gray-400">{Math.round(exportProgress)}%</span>
            </div>
            <div className="w-full bg-secondary-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary dark:bg-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-2">
              {exportProgress < 90 
                ? 'Preparing your export...' 
                : 'Uploading file...'}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-border dark:border-gray-700">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-smooth
                    ${activeTab === tab.id
                      ? 'border-primary dark:border-teal-500 text-primary dark:text-teal-400' 
                      : 'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:border-secondary-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <Icon name={tab.icon} size={16} color="currentColor" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'configure' && (
            <ExportConfiguration 
              config={exportConfig}
              onConfigChange={setExportConfig}
            />
          )}
          
          {activeTab === 'preview' && (
            <ExportPreview config={exportConfig} />
          )}
          
          {activeTab === 'history' && (
            <ExportHistory refreshTrigger={refreshHistory} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionExport;