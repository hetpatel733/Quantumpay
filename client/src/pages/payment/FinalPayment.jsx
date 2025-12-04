import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { paymentsAPI } from 'utils/api';
import "../../styles/payment/finalpayment.css";

const FinalPayment = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const payid = params.get('payid');

  const [paymentData, setPaymentData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  // Add refs to track intervals and prevent memory leaks
  const statusIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);

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

  // Enhanced helper function to get network name with proper mapping
  const getNetworkName = (cryptoType, network) => {
    if (network) {
      const networkNames = {
        'Bitcoin': 'Bitcoin Network',
        'Ethereum': 'Ethereum Network',
        'Polygon': 'Polygon Network',
        'BSC': 'Binance Smart Chain',
        'Tron': 'Tron Network'
      };
      return networkNames[network] || `${network} Network`;
    }

    // Fallback based on crypto type
    const defaultNetworks = {
      'BTC': 'Bitcoin Network',
      'ETH': 'Ethereum Network',
      'USDT': 'Multiple Networks Available',
      'USDC': 'Multiple Networks Available',
      'MATIC': 'Polygon Network'
    };
    return defaultNetworks[cryptoType] || 'Blockchain Network';
  };

  useEffect(() => {
    if (!payid) {
      setError('Payment ID is required');
      setLoading(false);
      return;
    }

    fetchPaymentDetails();
    
    // Only start polling if payment is pending and page is visible
    if (document.visibilityState === 'visible') {
      startStatusPolling();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (paymentStatus === 'pending') {
          startStatusPolling();
        }
      } else {
        stopStatusPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopStatusPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [payid]);

  // Stop polling when payment is completed or failed
  useEffect(() => {
    if (paymentStatus === 'completed' || paymentStatus === 'failed') {
      stopStatusPolling();
    }
  }, [paymentStatus]);

  const startStatusPolling = () => {
    if (statusIntervalRef.current) return; // Already polling
    
    console.log('🔄 Starting status polling for payment:', payid);
    setIsPolling(true);
    
    // Check immediately
    checkPaymentStatus();
    
    // Then check every 30 seconds (reduced from 10 seconds)
    statusIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkPaymentStatus();
      }
    }, 30000);
  };

  const stopStatusPolling = () => {
    if (statusIntervalRef.current) {
      console.log('⏹️ Stopping status polling for payment:', payid);
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
      setIsPolling(false);
    }
  };

  const fetchPaymentDetails = async () => {
    try {
      console.log('🔄 Fetching payment details for:', payid);
      
      const data = await paymentsAPI.getDetails(payid);
      console.log('📦 Payment details response:', data);

      if (data.success && data.payment) {
        setPaymentData(data.payment);
        setPaymentStatus(data.payment.status || 'pending');
        
        // Check if associated order is deactivated
        if (data.payment.orderIsActive === false) {
          setError('This product/service has been deactivated by the merchant and is no longer available for payment.');
          return;
        }

        // Check if payment processing is paused
        if (data.payment.apiStatus && !data.payment.apiStatus.isActive) {
          setError('Payment processing is currently paused by the merchant. Please contact support.');
          return;
        }
        
        // Generate QR code only if we have a valid wallet address
        const walletAddress = data.payment.walletAddress || data.payment.address;
        const isValidAddress = walletAddress && 
                              walletAddress !== data.payment.businessEmail && 
                              walletAddress.trim() !== '';
                              
        if (isValidAddress) {
          console.log('🔗 Valid wallet address found, generating QR code for:', walletAddress.substring(0, 10) + '...');
          await generateQRCode(walletAddress, data.payment);
        } else {
          console.warn('⚠️ No valid wallet address found for QR code generation');
          setError('Merchant has not configured a wallet address for this cryptocurrency. Please contact the merchant.');
        }
      } else {
        // Handle specific error codes
        if (data.errorCode === 'ORDER_DEACTIVATED') {
          setError('This product/service has been deactivated and is no longer available for payment.');
        } else if (data.errorCode === 'API_PAUSED') {
          setError('Payment processing is currently paused by the merchant. Please contact support.');
        } else if (data.errorCode === 'ORDER_CANCELLED') {
          setError('This order has been cancelled and cannot be paid.');
        } else {
          setError(data.message || 'Payment not found');
        }
      }
    } catch (err) {
      console.error('❌ Failed to fetch payment details:', err);
      
      if (err.message.includes('PAYMENT_PAUSED')) {
        setError('Payment processing is currently paused by the merchant. Please contact support.');
      } else if (err.message.includes('ORDER_DEACTIVATED')) {
        setError('This product/service has been deactivated and is no longer available for payment.');
      } else if (err.message.includes('ORDER_CANCELLED')) {
        setError('This order has been cancelled and cannot be paid.');
      } else if (err.message.includes('404')) {
        setError('Payment not found. Please check your payment ID.');
      } else {
        setError('Failed to fetch payment details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (address, payment) => {
    try {
      // Create a proper QR code URL for cryptocurrency payments
      const amount = payment?.amountCrypto || payment?.amount;
      const cryptoType = payment?.cryptoType || payment?.type;
      const network = payment?.network;
      
      let qrData = address;
      
      // Format QR data based on cryptocurrency type and network
      if (cryptoType === 'BTC' && amount) {
        qrData = `bitcoin:${address}?amount=${amount}`;
      } else if (cryptoType === 'ETH' && amount) {
        qrData = `ethereum:${address}?value=${amount}`;
      } else if ((cryptoType === 'USDT' || cryptoType === 'USDC') && network === 'Ethereum' && amount) {
        qrData = `ethereum:${address}?value=${amount}`;
      } else if ((cryptoType === 'USDT' || cryptoType === 'USDC') && network === 'Polygon' && amount) {
        qrData = `ethereum:${address}?value=${amount}`;
      }
      
      // Use QR server API to generate QR code
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrData)}&size=256x256&margin=10`;
      setQrCodeUrl(qrUrl);
      
      console.log('✅ QR code generated for:', cryptoType, 'on', network || 'default network');
    } catch (err) {
      console.error('❌ Failed to generate QR code:', err);
    }
  };

  const checkPaymentStatus = async () => {
    // Don't check if payment is already completed or failed
    if (paymentStatus === 'completed' || paymentStatus === 'failed') {
      stopStatusPolling();
      return;
    }

    try {
      console.log('🔍 Checking payment status for:', payid);
      const data = await paymentsAPI.checkStatus(payid);
      
      if (data.success && data.status !== paymentStatus) {
        console.log('📊 Payment status changed:', paymentStatus, '->', data.status);
        setPaymentStatus(data.status);
        
        // Stop polling if payment is completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          stopStatusPolling();
        }
      }
    } catch (err) {
      console.warn('⚠️ Status check failed (will retry):', err.message);
      // Don't show error for status checks, just log it
    }
  };

  const copyAddress = () => {
    const address = paymentData?.walletAddress || paymentData?.address;
    if (address && address !== paymentData?.businessEmail) {
      navigator.clipboard.writeText(address);
      alert('Wallet address copied to clipboard!');
    } else {
      alert('No valid wallet address to copy');
    }
  };

  const refreshPage = () => {
    // Instead of full page reload, just refresh the payment data
    setLoading(true);
    fetchPaymentDetails();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-teal-500"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
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

  return (
    <div className="payment-final">
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center">
          <img src="/images/Logo.webp" alt="QuantumPay" className="h-10" />
        </div>
      </div>

      {/* Amount Display with Network Info */}
      <div className="bg-blue-50 dark:bg-gray-800 py-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-600 dark:bg-teal-600 text-white px-6 py-3 rounded-lg">
            <span className="text-lg">Amount:</span>
            <span className="text-2xl font-bold">
              {paymentData.amountCrypto || paymentData.amount}
            </span>
            <span className="text-lg">
              {paymentData.cryptoType || paymentData.type}
            </span>
          </div>
          {paymentData.amountUSD && (
            <div className="mt-2 text-gray-600 dark:text-gray-300">
              ≈ ${paymentData.amountUSD} USD
            </div>
          )}
          {(paymentData.network) && (
            <div className="mt-1 text-blue-700 dark:text-teal-400 text-sm">
              Network: {getNetworkName(paymentData.cryptoType || paymentData.type, paymentData.network)}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          {/* Payment ID */}
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-2">Payment ID:</p>
            <p className="font-mono text-lg font-medium text-gray-900 dark:text-gray-100">{payid}</p>
          </div>

          {/* Order ID (if available) */}
          {(paymentData.order_id || paymentData.orderId) && (
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-2">Order ID:</p>
              <p className="font-mono text-md text-gray-900 dark:text-gray-100">
                {paymentData.order_id || paymentData.orderId}
              </p>
            </div>
          )}

          {/* Enhanced Customer Info with Network */}
          {(paymentData.customerName || paymentData.customerEmail) && (
            <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-gray-600 dark:text-gray-400 mb-2">Payment Details:</p>
              {paymentData.customerName && (
                <p className="text-gray-900 dark:text-gray-100">
                  <strong>Customer:</strong> {paymentData.customerName}
                </p>
              )}
              {paymentData.customerEmail && (
                <p className="text-gray-900 dark:text-gray-100">
                  <strong>Email:</strong> {paymentData.customerEmail}
                </p>
              )}
              {paymentData.network && (
                <p className="text-gray-900 dark:text-gray-100">
                  <strong>Network:</strong> {getNetworkName(paymentData.cryptoType || paymentData.type, paymentData.network)}
                </p>
              )}
            </div>
          )}

          {/* Payment Status */}
          <div className="mb-6">
            {paymentStatus === 'completed' ? (
              <div className="status-completed p-4 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <Icon name="CheckCircle" size={24} />
                  <span className="text-lg font-medium">Payment Successful!</span>
                </div>
              </div>
            ) : (
              <div className="status-pending p-4 rounded-lg">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Icon name="Clock" size={20} />
                  <span className="font-medium">Waiting for Payment</span>
                  {isPolling && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></div>
                  )}
                </div>
                <p className="text-sm">
                  Payment status is being monitored automatically.
                </p>
                <button
                  onClick={refreshPage}
                  disabled={loading}
                  className="mt-2 text-blue-600 dark:text-teal-400 hover:underline disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh Now'}
                </button>
              </div>
            )}
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-3">Scan to Pay:</p>
              <div className="qr-code mx-auto">
                <img
                  src={qrCodeUrl}
                  alt="Payment QR Code"
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Enhanced Address Section with Network Info */}
          {(paymentData.walletAddress || paymentData.address) && 
           paymentData.walletAddress !== paymentData.businessEmail && (
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-2">Send Payment To:</p>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <input
                  type="text"
                  value={paymentData.walletAddress || paymentData.address}
                  readOnly
                  className="address-input"
                />
                <button
                  onClick={copyAddress}
                  className="copy-button"
                  title="Copy address"
                >
                  <Icon name="Copy" size={16} className="text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Network: {getNetworkName(paymentData.cryptoType || paymentData.type, paymentData.network)}</p>
                {paymentData.network && paymentData.network !== 'Bitcoin' && (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    ⚠️ Make sure to send on the correct network to avoid loss of funds
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Show warning if no valid wallet address */}
          {(!paymentData.walletAddress || paymentData.walletAddress === paymentData.businessEmail) && (
            <div className="mb-6">
              <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                  <Icon name="AlertCircle" size={20} />
                  <div>
                    <p className="font-medium">Payment Cannot Be Processed</p>
                    <p className="text-sm">
                      The merchant hasn't configured a valid wallet address for {paymentData.cryptoType || paymentData.type}. 
                      Please contact the merchant to complete the payment setup.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Payment Instructions with Network Warnings */}
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
            {(paymentData.walletAddress && paymentData.walletAddress !== paymentData.businessEmail) ? (
              <>
                <p className="font-medium text-gray-800 dark:text-gray-200">Payment Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Send exactly <strong>{paymentData.amountCrypto || paymentData.amount} {paymentData.cryptoType || paymentData.type}</strong> to the address above</li>
                  <li><strong>Important:</strong> Send on the <strong>{paymentData.network || 'correct'}</strong> network only</li>
                  <li>Wait for network confirmation (this may take a few minutes)</li>
                  <li>This page will automatically update when payment is confirmed</li>
                  <li><strong>Do not</strong> send from an exchange - use a personal wallet</li>
                </ul>
                
                {/* Network-specific warnings */}
                {paymentData.network === 'Bitcoin' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded p-3 mt-3">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      <strong>Bitcoin Network:</strong> Transactions may take 10-60 minutes to confirm depending on network congestion
                    </p>
                  </div>
                )}
                
                {(paymentData.network === 'Ethereum') && (
                  <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded p-3 mt-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Ethereum Network:</strong> Ensure you have enough ETH for gas fees.
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalPayment;