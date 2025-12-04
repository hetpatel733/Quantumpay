import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { paymentsAPI } from 'utils/api';
import "../../styles/payment/coinselect.css";

const CoinSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    type: '' // This will now store the unique crypto ID (coinType_network)
  });
  const [orderData, setOrderData] = useState(null);
  const [enabledCryptos, setEnabledCryptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  const params = new URLSearchParams(location.search);
  const api = params.get('api');
  const order_id = params.get('order_id');

  // Initialize dark mode on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Crypto display data for images only - updated structure (remove MATIC and SOL)
  const cryptoDisplayData = {
    'BTC': { 
      image: '/images/Coins/BTC.webp', 
      network: 'Bitcoin',
      name: 'Bitcoin'
    },
    'ETH': { 
      image: '/images/Coins/ETH.webp', 
      network: 'Ethereum',
      name: 'Ethereum'
    },
    'USDT': { 
      image: '/images/Coins/USDT.webp', 
      network: 'Various',
      name: 'Tether'
    },
    'USDC': { 
      image: '/images/Coins/USDC.png', 
      network: 'Various',
      name: 'USD Coin'
    }
  };

  const getNetworkDisplayName = (network) => {
    const networkNames = {
      'Bitcoin': 'Bitcoin Network',
      'Ethereum': 'Ethereum Network', 
      'Polygon': 'Polygon Network',
      'BSC': 'Binance Smart Chain',
      'Solana': 'Solana Network'
    };
    return networkNames[network] || network;
  };

  // Group enabled cryptos by network - only use data from backend
  const getNetworkGroups = () => {
    const groups = {};
    
    // Only process cryptocurrencies that came from the backend
    enabledCryptos.forEach(crypto => {
      const network = crypto.network || 'Other';
      if (!groups[network]) {
        groups[network] = [];
      }
      
      // Merge backend data with display data
      const displayData = cryptoDisplayData[crypto.coinType] || {};
      
      groups[network].push({
        ...crypto,
        image: displayData.image || '/images/Coins/default.webp',
        displayName: crypto.name || displayData.name || crypto.coinType,
        displayNetwork: getNetworkDisplayName(network)
      });
    });
    
    return groups;
  };

  useEffect(() => {
    if (!api || !order_id) {
      setError('Missing API key or Order ID');
      setLoading(false);
      return;
    }

    validatePaymentRequest();
  }, [api, order_id]);

  const validatePaymentRequest = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Validating payment request...');
      
      const data = await paymentsAPI.validatePayment(api, order_id);
      console.log('📦 Validation response:', data);

      if (data.success) {
        // Check order status
        if (!data.order.isActive) {
          setError('This product/service has been deactivated and is no longer available for purchase.');
          return;
        }

        // Check API status
        if (data.apiStatus && !data.apiStatus.isActive) {
          setError('Payment processing is currently paused by the merchant. Please contact support.');
          return;
        }

        setOrderData(data.order);
        
        // Only set enabled cryptos from backend response
        const backendCryptos = data.enabledCryptos || [];
        setEnabledCryptos(backendCryptos);
        
        console.log(`✅ Found ${backendCryptos.length} enabled cryptocurrencies`);
        
        if (backendCryptos.length === 0) {
          setError('No payment methods are currently enabled by the merchant. Please contact support.');
        }
      } else {
        // Handle specific error codes
        if (data.errorCode === 'ORDER_DEACTIVATED') {
          setError('This product/service has been deactivated and is no longer available for purchase.');
        } else if (data.errorCode === 'API_PAUSED') {
          setError('Payment processing is currently paused by the merchant. Please contact support.');
        } else if (data.errorCode === 'ORDER_CANCELLED') {
          setError('This order has been cancelled and cannot be paid.');
        } else {
          setError(data.message || 'Invalid payment request');
        }
      }
    } catch (err) {
      console.error('❌ Validation error:', err);
      
      // Handle specific error types from API
      if (err.message.includes('PAYMENT_PAUSED')) {
        setError('Payment processing is currently paused by the merchant. Please contact support.');
      } else if (err.message.includes('ORDER_DEACTIVATED')) {
        setError('This product/service has been deactivated and is no longer available for purchase.');
      } else if (err.message.includes('ORDER_CANCELLED')) {
        setError('This order has been cancelled and cannot be paid.');
      } else {
        setError('Failed to validate payment request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCryptoSelect = (cryptoId) => {
    console.log('💰 Crypto selected:', cryptoId);
    setFormData(prev => ({
      ...prev,
      type: cryptoId // Store the full unique ID instead of just coinType
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.fname.trim() || !formData.lname.trim() || !formData.email.trim() || !formData.type) {
      setError('Please fill in all fields and select a cryptocurrency');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Find the selected crypto using the unique ID
    const selectedCrypto = enabledCryptos.find(crypto => 
      `${crypto.coinType}_${crypto.network}` === formData.type
    );
    
    if (!selectedCrypto) {
      setError('Selected cryptocurrency is not available. Please choose from the enabled options.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('🚀 Submitting payment with data:', {
        ...formData,
        api,
        order_id,
        selectedCrypto: selectedCrypto.coinType,
        selectedNetwork: selectedCrypto.network
      });

      // Send both coinType and network to the backend
      const data = await paymentsAPI.processCoinSelection({
        fname: formData.fname.trim(),
        lname: formData.lname.trim(),
        email: formData.email.trim(),
        type: selectedCrypto.coinType, // Send the coinType
        network: selectedCrypto.network, // Send the network separately
        api,
        order_id
      });

      console.log('📤 Payment creation response:', data);
      
      if (data.success && data.payid) {
        console.log('✅ Payment created successfully, redirecting to:', data.payid);
        navigate(`/payment/final-payment?payid=${data.payid}`);
      } else {
        setError(data.message || 'Payment processing failed. Please try again.');
      }

    } catch (err) {
      console.error('❌ Payment submission error:', err);
      
      if (err.message.includes('404')) {
        setError('Payment service not available. Please contact support.');
      } else if (err.message.includes('non-JSON')) {
        setError('Server error occurred. Please try again later.');
      } else {
        setError('Network error occurred. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-teal-500"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading payment options...</p>
        </div>
      </div>
    );
  }

  // Error state with no order data
  if (error && !orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="AlertCircle" size={32} color="#ef4444" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Payment Error</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 dark:bg-teal-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const networkGroups = getNetworkGroups();

  return (
    <div className="payment-container">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="theme-toggle-btn"
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <Icon name="Sun" size={20} />
        ) : (
          <Icon name="Moon" size={20} />
        )}
      </button>

      {/* Header */}
      <div className="payment-header">
        <div className="max-w-4xl mx-auto flex items-center">
          <img src="/images/Logo.webp" alt="QuantumPay" className="h-10" />
        </div>
      </div>

      {/* Amount Display */}
      <div className="amount-display">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-600 dark:bg-teal-600 text-white px-6 py-3 rounded-lg">
            <span className="text-lg">Amount:</span>
            <span className="text-2xl font-bold">${orderData?.amount}</span>
          </div>
          {orderData?.productName && (
            <div className="mt-2 text-gray-600 dark:text-gray-300">
              {orderData.productName}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Buyer Information */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Buyer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                name="fname"
                placeholder="First Name"
                value={formData.fname}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:opacity-50"
              />
              <input
                type="text"
                name="lname"
                placeholder="Last Name"
                value={formData.lname}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:opacity-50"
              />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Cryptocurrency Selection */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Select Cryptocurrency</h2>
            
            {enabledCryptos.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="AlertCircle" size={32} className="text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Payment Methods Available</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  The merchant hasn't enabled any cryptocurrency payment methods yet.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please contact the merchant or try again later.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(networkGroups).map(([networkName, cryptos]) => (
                  <div key={networkName}>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-4">
                      {getNetworkDisplayName(networkName)}
                    </h3>
                    <div className="crypto-grid">
                      {cryptos.map(crypto => (
                        <div
                          key={crypto.id}
                          className={`crypto-card ${formData.type === crypto.id ? 'selected' : ''}`}
                          onClick={() => !isSubmitting && handleCryptoSelect(crypto.id)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={formData.type === crypto.id}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (!isSubmitting) handleCryptoSelect(crypto.id);
                            }
                          }}
                        >
                          <img src={crypto.image} alt={crypto.displayName} className="crypto-image" />
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{crypto.displayName}</p>
                          <p className="text-xs text-gray-400">{crypto.displayNetwork}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && !isSubmitting && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting || !formData.type}
              className="w-full md:w-auto px-12 py-3 bg-blue-600 dark:bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 dark:hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="ml-3">Processing...</span>
                </div>
              ) : 'Proceed to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoinSelect;