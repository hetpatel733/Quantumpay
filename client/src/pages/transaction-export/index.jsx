import React, { useState } from 'react';
import Icon from 'components/AppIcon';

import ExportConfiguration from './components/ExportConfiguration';
import ExportPreview from './components/ExportPreview';
import ExportHistory from './components/ExportHistory';

const TransactionExport = () => {
  const [exportConfig, setExportConfig] = useState({
    dateRange: 'last30days',
    customStartDate: '',
    customEndDate: '',
    status: 'all',
    cryptocurrencies: ['all'],
    amountRange: { min: '', max: '' },
    format: 'csv',
    columns: ['transactionId', 'amount', 'cryptocurrency', 'status', 'date'],
    includeHeaders: true,
    emailDelivery: false,
    emailAddress: ''
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('configure');

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // Simulate export progress
    const progressInterval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsExporting(false);
          // Trigger download or show completion message
          alert('Export completed successfully!');
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
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
                disabled={isExporting}
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
                className="bg-primary dark:bg-teal-500 h-2 rounded-full transition-layout"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-2">
              Estimated time remaining: {Math.max(0, Math.round((100 - exportProgress) / 10))} seconds
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
                      ? 'border-primary dark:border-teal-500 text-primary dark:text-teal-400' :'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:border-secondary-300 dark:hover:border-gray-600'
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
            <ExportHistory />
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionExport;