import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { ordersAPI, apiKeysAPI } from 'utils/api';

const PaymentLinkModal = ({ isOpen, onClose, onSuccess }) => {
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const baseUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Fetching portfolio items and API keys...');
      
      // Fetch portfolio items and API keys
      const [ordersResponse, apiKeysResponse] = await Promise.all([
        ordersAPI.getAll({ limit: 100 }),
        apiKeysAPI.getAll()
      ]);

      console.log('📦 Orders response:', ordersResponse);
      console.log('📦 API Keys response:', apiKeysResponse);

      if (ordersResponse.success) {
        const orders = ordersResponse.orders || [];
        setPortfolioItems(orders);
        console.log(`✅ Loaded ${orders.length} portfolio items`);
      } else {
        console.warn('⚠️ Failed to fetch orders:', ordersResponse.message);
        setPortfolioItems([]);
      }

      if (apiKeysResponse.success) {
        const allKeys = apiKeysResponse.apiKeys || [];
        const activeKeys = allKeys.filter(key => key.isActive);
        setApiKeys(activeKeys);
        
        console.log(`✅ Found ${activeKeys.length} active API keys out of ${allKeys.length} total`);
        
        // Auto-select first active API key if available
        if (activeKeys.length > 0) {
          setSelectedApiKey(activeKeys[0]._id);
          console.log('🔑 Auto-selected API key:', activeKeys[0].key.substring(0, 10) + '...');
        } else {
          console.warn('⚠️ No active API keys found');
        }
      } else {
        console.warn('⚠️ Failed to fetch API keys:', apiKeysResponse.message);
        setApiKeys([]);
      }
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatePaymentLink = () => {
    if (!selectedItem || !selectedApiKey) {
      setError('Please select both a product and an API key');
      return;
    }

    const selectedOrder = portfolioItems.find(item => item._id === selectedItem);
    const selectedApi = apiKeys.find(key => key._id === selectedApiKey);

    if (!selectedOrder || !selectedApi) {
      setError('Invalid selection. Please try again.');
      return;
    }

    // Check if order is active
    if (!selectedOrder.isActive) {
      setError('Selected product/order is deactivated and cannot be used for payments. Please select an active product.');
      return;
    }

    // Check if API key is active
    if (!selectedApi.isActive) {
      setError('Selected API key is currently paused. Please select an active API key or reactivate the paused one.');
      return;
    }

    // Always use baseUrl from env for payment link
    const paymentLink = `${baseUrl}/payment/${selectedApi.key}/${selectedOrder.orderId}`;
    setGeneratedLink(paymentLink);
    setError('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    // You could add a toast notification here
    alert('Payment link copied to clipboard!');
  };

  const handleClose = () => {
    setSelectedItem('');
    setSelectedApiKey('');
    setGeneratedLink('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-primary">Create Payment Link</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-smooth"
          >
            <Icon name="X" size={20} color="currentColor" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-text-secondary">Loading...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select Product/Service
                </label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Choose a product...</option>
                  {portfolioItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.productName} - ${item.amountUSD}
                    </option>
                  ))}
                </select>
                {portfolioItems.length === 0 && (
                  <p className="text-sm text-text-secondary mt-1">
                    No products found. Create a product in Portfolio Management first.
                  </p>
                )}
              </div>

              {/* API Key Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select API Key
                </label>
                <select
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Choose an API key...</option>
                  {apiKeys.map((key) => (
                    <option key={key._id} value={key._id}>
                      {key.label} ({key.key.substring(0, 10)}...)
                    </option>
                  ))}
                </select>
                {apiKeys.length === 0 && (
                  <p className="text-sm text-text-secondary mt-1">
                    No active API keys found. Create an API key first.
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={generatePaymentLink}
                disabled={!selectedItem || !selectedApiKey}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                <Icon name="Link" size={16} color="currentColor" />
                <span>Generate Payment Link</span>
              </button>

              {/* Error Display */}
              {error && (
                <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="AlertCircle" size={16} color="var(--color-error)" />
                    <p className="text-error text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Generated Link */}
              {generatedLink && (
                <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-success-700 dark:text-success-300 mb-2">Payment Link Generated</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm font-mono bg-white dark:bg-gray-900 border border-success-300 dark:border-success-700 rounded-lg text-text-primary dark:text-white"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-2 bg-success dark:bg-success-600 text-white rounded-lg hover:bg-success-700 dark:hover:bg-success-700 transition-smooth"
                    >
                      <Icon name="Copy" size={16} color="currentColor" />
                    </button>
                  </div>
                  <p className="text-xs text-success-600 dark:text-success-300 mt-2">
                    Share this link with your customers to receive payments
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-secondary-100 transition-smooth"
          >
            Close
          </button>
          {generatedLink && onSuccess && (
            <button
              onClick={() => {
                onSuccess(generatedLink);
                handleClose();
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-smooth"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentLinkModal;
