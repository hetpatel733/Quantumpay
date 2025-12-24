import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { paymentsAPI } from 'utils/api';
import '../../styles/payment/coinselect.css';

const CoinSelect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const api = params.get('api');
  const order_id = params.get('order_id');

  const [loading, setLoading] = useState(true);
  const [validationData, setValidationData] = useState(null);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    selectedCrypto: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    validatePayment();
  }, []);

  const validatePayment = async () => {
    try {
      setLoading(true);
      setError('');

      if (!api || !order_id) {
        setError('Missing required payment parameters');
        setLoading(false);
        return;
      }

      console.log('🔍 Validating payment:', { api: api.substring(0, 10) + '...', order_id });

      const response = await paymentsAPI.validatePayment(api, order_id);

      if (response.success) {
        setValidationData(response);
        console.log('✅ Payment validated:', response);
      } else {
        setError(response.message || 'Payment validation failed');
      }
    } catch (err) {
      console.error('❌ Validation error:', err);
      
      if (err.message.includes('PAYMENT_PAUSED')) {
        setError('Payment processing is currently paused. Please contact the merchant.');
      } else if (err.message.includes('ORDER_DEACTIVATED')) {
        setError('This product is no longer available.');
      } else {
        setError('Unable to validate payment. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCryptoSelect = (cryptoId) => {
    setFormData(prev => ({ ...prev, selectedCrypto: cryptoId }));
    if (formErrors.selectedCrypto) {
      setFormErrors(prev => ({ ...prev, selectedCrypto: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.fname.trim()) errors.fname = 'First name is required';
    if (!formData.lname.trim()) errors.lname = 'Last name is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.selectedCrypto) errors.selectedCrypto = 'Please select a payment method';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      const selectedCryptoData = validationData.enabledCryptos.find(
        c => c.id === formData.selectedCrypto
      );

      console.log('💳 Processing payment:', {
        fname: formData.fname,
        lname: formData.lname,
        email: formData.email,
        type: selectedCryptoData.coinType,
        network: selectedCryptoData.network
      });

      const response = await paymentsAPI.processCoinSelection({
        fname: formData.fname,
        lname: formData.lname,
        email: formData.email,
        type: selectedCryptoData.coinType,
        network: selectedCryptoData.network,
        api,
        order_id
      });

      if (response.success && response.payid) {
        console.log('✅ Payment created:', response.payid);
        // Redirect to final payment page
        navigate(`/payment/final-payment?payid=${response.payid}`);
      } else {
        setError(response.message || 'Failed to create payment');
      }
    } catch (err) {
      console.error('❌ Payment creation error:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCryptoLogo = (coinType, network) => {
    // Map for known coins/networks
    const map = {
      BTC: '/images/Coins/BTC.webp',
      ETH: '/images/Coins/ETH.webp',
      USDT: {
        ETHEREUM: '/images/Coins/USDT.webp',
        TRON: '/images/Coins/USDT.webp',
        BSC: '/images/Coins/USDT.webp',
        POLYGON: '/images/Coins/USDT.webp',
        SOLANA: '/images/Coins/USDT.webp',
        default: '/images/Coins/USDT.webp'
      },
      USDC: {
        ETHEREUM: '/images/Coins/USDC.png',
        TRON: '/images/Coins/USDC.png',
        BSC: '/images/Coins/USDC.png',
        POLYGON: '/images/Coins/USDC.png',
        SOLANA: '/images/Coins/USDC.png',
        default: '/images/Coins/USDC.png'
      },
      BNB: '/images/Coins/bnb.webp',
      POL: '/images/Coins/MATIC.webp',
      SOL: '/images/Coins/SOL.webp'
    };
    if (map[coinType]) {
      if (typeof map[coinType] === 'string') return map[coinType];
      return map[coinType][(network || '').toUpperCase()] || map[coinType].default;
    }
    return '/images/Coins/BTC.webp'; // fallback
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
          <p className="text-text-secondary dark:text-gray-300">Loading payment options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
        <div className="bg-surface dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-md text-center border border-border dark:border-gray-700">
          <Icon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-2">Payment Error</h2>
          <p className="text-text-secondary dark:text-gray-400 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={validatePayment}
              className="px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth"
            >
              Try Again
            </button>
            <a 
              href="/contact" 
              className="px-4 py-2 border border-border dark:border-gray-600 rounded-lg text-text-primary dark:text-white hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-surface dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/images/Logo.webp" alt="QuantumPay" className="h-10" />
              <div>
                <h1 className="text-xl font-semibold text-text-primary dark:text-white">Complete Payment</h1>
                <p className="text-sm text-text-secondary dark:text-gray-400">Choose your payment method</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left: Product & Customer Info */}
            <div className="md:col-span-2 space-y-6">
              {/* Product Details */}
              <div className="bg-surface dark:bg-gray-800 rounded-lg shadow-md p-6 border border-border dark:border-gray-700">
                <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Order Details</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-text-primary dark:text-white">{validationData?.order?.productName}</h3>
                      <p className="text-sm text-text-secondary dark:text-gray-400">{validationData?.order?.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary dark:text-teal-400">
                        ${validationData?.order?.amount?.toFixed(2)}
                      </div>
                      <div className="text-xs text-text-secondary dark:text-gray-400">USD</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-surface dark:bg-gray-800 rounded-lg shadow-md p-6 border border-border dark:border-gray-700">
                <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Your Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="fname"
                      value={formData.fname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg bg-background dark:bg-gray-900 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 transition-smooth ${
                        formErrors.fname ? 'border-error' : 'border-border dark:border-gray-600'
                      }`}
                      placeholder="John"
                    />
                    {formErrors.fname && <p className="text-error text-xs mt-1">{formErrors.fname}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lname"
                      value={formData.lname}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg bg-background dark:bg-gray-900 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 transition-smooth ${
                        formErrors.lname ? 'border-error' : 'border-border dark:border-gray-600'
                      }`}
                      placeholder="Doe"
                    />
                    {formErrors.lname && <p className="text-error text-xs mt-1">{formErrors.lname}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg bg-background dark:bg-gray-900 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 transition-smooth ${
                        formErrors.email ? 'border-error' : 'border-border dark:border-gray-600'
                      }`}
                      placeholder="john@example.com"
                    />
                    {formErrors.email && <p className="text-error text-xs mt-1">{formErrors.email}</p>}
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-surface dark:bg-gray-800 rounded-lg shadow-md p-6 border border-border dark:border-gray-700">
                <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Select Payment Method</h2>
                {formErrors.selectedCrypto && (
                  <p className="text-error text-sm mb-3">{formErrors.selectedCrypto}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {validationData?.enabledCryptos?.map((crypto) => (
                    <button
                      key={crypto.id}
                      type="button"
                      onClick={() => handleCryptoSelect(crypto.id)}
                      className={`p-4 border-2 rounded-lg transition-all flex flex-col items-center space-y-2 ${
                        formData.selectedCrypto === crypto.id
                          ? 'border-primary dark:border-teal-500 bg-primary-50 dark:bg-teal-900/20'
                          : 'border-border dark:border-gray-600 hover:border-primary-200 dark:hover:border-teal-700'
                      }`}
                    >
                      {/* --- Show coin logo --- */}
                      <img
                        src={getCryptoLogo(crypto.coinType, crypto.network)}
                        alt={crypto.coinType}
                        className="w-8 h-8 mb-1"
                        style={{ objectFit: 'contain' }}
                      />
                      <div className="text-2xl font-bold text-text-primary dark:text-white">{crypto.coinType}</div>
                      <div className="text-xs text-text-secondary dark:text-gray-400">{crypto.network}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Summary & Submit */}
            <div className="md:col-span-1">
              <div className="bg-surface dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-6 border border-border dark:border-gray-700">
                <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Payment Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary dark:text-gray-400">Subtotal</span>
                    <span className="text-text-primary dark:text-white font-medium">
                      ${validationData?.order?.amount?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary dark:text-gray-400">Processing Fee</span>
                    <span className="text-success font-medium">$0.00</span>
                  </div>
                  <div className="border-t border-border dark:border-gray-600 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-text-primary dark:text-white">Total</span>
                      <span className="text-xl font-bold text-primary dark:text-teal-400">
                        ${validationData?.order?.amount?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-primary dark:bg-teal-500 text-white rounded-lg font-medium hover:bg-primary-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="Lock" size={16} />
                      <span>Continue to Payment</span>
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center text-xs text-text-secondary dark:text-gray-400">
                  <Icon name="Shield" size={14} className="mr-1" />
                  <span>Secure payment powered by QuantumPay</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoinSelect;