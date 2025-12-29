import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { ordersAPI, apiKeysAPI } from 'utils/api';
import { useToast } from 'contexts/ToastContext';

const PaymentLinkModal = ({ isOpen, onClose, onSuccess, userData }) => {
  const { showToast } = useToast();
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

  // Re-fetch when portfolio changes globally (so new products appear immediately)
  useEffect(() => {
    const onPortfolioUpdated = (e) => {
      console.log('📣 PaymentLinkModal detected portfolio:updated', e?.detail);
      if (isOpen) fetchData();
    };
    window.addEventListener('portfolio:updated', onPortfolioUpdated);
    return () => window.removeEventListener('portfolio:updated', onPortfolioUpdated);
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // --- FIX: Pass userId to both API calls ---
      const userId = userData?.id;
      if (!userId) {
        setError('User ID not found. Please log in again.');
        setPortfolioItems([]);
        setApiKeys([]);
        setLoading(false);
        return;
      }

      console.log('🔄 Fetching portfolio items and API keys for user:', userId);

      // Fetch portfolio items and API keys
      const [ordersResponse, apiKeysResponse] = await Promise.all([
        ordersAPI.getAll({ userId, limit: 100 }),
        apiKeysAPI.getAll(userId)
      ]);

      console.log('📦 Orders response:', ordersResponse);
      console.log('📦 API Keys response:', apiKeysResponse);

      // --- Normalize products ---
      if (ordersResponse.success) {
        const orders = (ordersResponse.orders || []).map((o, idx) => ({
          // ensure stable ids and productId fields
          _id: o._id?.toString() || o.id || `order-${idx}`,
          id: o._id?.toString() || o.id || `order-${idx}`,
          productId: o.productId || o.orderId || o.id || `PRD_FALLBACK_${idx}`,
          productName: o.productName || o.name || `Product ${idx + 1}`,
          amountUSD: o.amountUSD || o.amount || 0,
          isActive: typeof o.isActive === 'boolean' ? o.isActive : true,
          description: o.description || '',
          image: o.image || '',
          // preserve original
          __raw: o
        }));
        setPortfolioItems(orders);
        console.log(`✅ Loaded ${orders.length} portfolio items`);
      } else {
        console.warn('⚠️ Failed to fetch orders:', ordersResponse.message);
        setPortfolioItems([]);
      }

      // --- Normalize API keys ---
      if (apiKeysResponse.success) {
        const allKeys = apiKeysResponse.apiKeys || [];
        const normalized = allKeys.map((k, idx) => ({
          _id: k._id?.toString() || k.id || `apikey-${idx}`,
          key: k.key || k.value || k.apiKey || k._id?.toString() || `key-${idx}`,
          label: k.label || k.name || 'API Key',
          isActive: !!k.isActive,
          __raw: k
        }));

        const activeKeys = normalized.filter(k => k.isActive);
        setApiKeys(normalized);

        console.log(`✅ Found ${activeKeys.length} active API keys out of ${normalized.length} total`);

        // Auto-select first active API key id if available
        if (activeKeys.length > 0) {
          setSelectedApiKey(activeKeys[0]._id);
          console.log('🔑 Auto-selected API key id:', activeKeys[0]._id, 'key:', activeKeys[0].key);
        } else {
          console.warn('⚠️ No active API keys found');
          setSelectedApiKey('');
        }
      } else {
        console.warn('⚠️ Failed to fetch API keys:', apiKeysResponse.message);
        setApiKeys([]);
        setSelectedApiKey('');
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

    // Debugging info
    console.log('🔎 generatePaymentLink inputs:', { selectedItem, selectedApiKey });
    console.log('📦 portfolioItems sample:', portfolioItems && portfolioItems.length ? portfolioItems[0] : 'no-items');
    console.log('🔑 apiKeys sample:', apiKeys && apiKeys.length ? apiKeys[0] : 'no-keys');

    // Try to find the order by several possible id fields
    const selectedOrder = portfolioItems.find(item =>
      item._id === selectedItem ||
      item.id === selectedItem ||
      item.productId === selectedItem ||
      (item._id && item._id.toString && item._id.toString() === selectedItem)
    );

    // Try to find the API key by _id or by key string (robust)
    const selectedApi = apiKeys.find(key =>
      key._id === selectedApiKey ||
      key.key === selectedApiKey ||
      (key._id && key._id.toString && key._id.toString() === selectedApiKey)
    );

    // If either is missing, give a more detailed error for troubleshooting
    if (!selectedOrder || !selectedApi) {
      console.warn('⚠️ Invalid selection details:', {
        selectedOrderFound: !!selectedOrder,
        selectedApiFound: !!selectedApi,
        portfolioItemIds: portfolioItems.map(p => ({ _id: p._id, id: p.id, productId: p.productId })),
        apiKeyIds: apiKeys.map(k => ({ _id: k._id, key: k.key }))
      });

      setError('Invalid selection. Please try again.');
      return;
    }

    // Check if order is active
    if (!selectedOrder.isActive) {
      setError('Selected product is deactivated. Please activate it first.');
      return;
    }

    // Check if API key is active
    if (!selectedApi.isActive) {
      setError('Selected API key is paused. Please activate it first.');
      return;
    }

    // Use productId when available; fallback to _id
    const productIdentifier = selectedOrder.productId || selectedOrder._id;
    const paymentLink = `${baseUrl}/payment/${selectedApi.key}/${productIdentifier}`;
    setGeneratedLink(paymentLink);
    setError('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    showToast('Payment link copied to clipboard!', 'success');
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
      <div className="bg-surface dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden border border-border dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-gray-700">
          <h2 className="text-xl font-semibold text-text-primary dark:text-white">Create Payment Link</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary-100 dark:hover:bg-gray-700 rounded-lg transition-smooth text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
          >
            <Icon name="X" size={20} color="currentColor" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-white dark:bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
              <span className="ml-3 text-text-secondary dark:text-gray-400">Loading...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                  Select Product/Service
                </label>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-background dark:bg-gray-900 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 focus:border-transparent transition-smooth"
                >
                  <option key="placeholder-product" value="" className="dark:bg-gray-900">Choose a product...</option>
                  {portfolioItems.map((item, idx) => (
                    <option key={item._id || `product-${idx}`} value={item._id} className="dark:bg-gray-900">
                      {item.productName} - ${item.amountUSD}
                    </option>
                  ))}
                </select>
                {portfolioItems.length === 0 && (
                  <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                    No products found. Create a product in Portfolio Management first.
                  </p>
                )}
              </div>

              {/* API Key Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                  Select API Key
                </label>
                <select
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-background dark:bg-gray-900 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 focus:border-transparent transition-smooth"
                >
                  <option key="placeholder-apikey" value="" className="dark:bg-gray-900">Choose an API key...</option>
                  {apiKeys.map((keyObj, idx) => (
                    <option key={keyObj._id || `apikey-${idx}`} value={keyObj._id} className="dark:bg-gray-900">
                      {keyObj.label} ({keyObj.key?.substring(0, 10) || keyObj._id.substring(0, 10)}...)
                    </option>
                  ))}
                </select>
                {apiKeys.length === 0 && (
                  <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                    No active API keys found. Create an API key first.
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={generatePaymentLink}
                disabled={!selectedItem || !selectedApiKey}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
              >
                <Icon name="Link" size={16} color="currentColor" />
                <span>Generate Payment Link</span>
              </button>

              {/* Error Display */}
              {error && (
                <div className="bg-error-50 dark:bg-red-900/20 border border-error-200 dark:border-red-500 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name="AlertCircle" size={16} color="var(--color-error)" className="text-error dark:text-red-400" />
                    <p className="text-error dark:text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Generated Link */}
              {generatedLink && (
                <div className="bg-success-50 dark:bg-green-900/20 border border-success-200 dark:border-green-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-success-700 dark:text-green-300 mb-2">Payment Link Generated</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm font-mono bg-white dark:bg-gray-900 border border-success-300 dark:border-green-700 rounded-lg text-text-primary dark:text-white"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-2 bg-success dark:bg-green-600 text-white rounded-lg hover:bg-success-700 dark:hover:bg-green-700 transition-smooth"
                    >
                      <Icon name="Copy" size={16} color="currentColor" />
                    </button>
                  </div>
                  <p className="text-xs text-success-600 dark:text-green-300 mt-2">
                    Share this link with your customers to receive payments
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-border dark:border-gray-600 rounded-lg text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth"
          >
            Close
          </button>
          {generatedLink && onSuccess && (
            <button
              onClick={() => {
                onSuccess(generatedLink);
                handleClose();
              }}
              className="px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth"
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
