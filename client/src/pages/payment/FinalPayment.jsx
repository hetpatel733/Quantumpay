import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { paymentsAPI } from 'utils/api';
import { useToast } from 'contexts/ToastContext';
import "../../styles/payment/finalpayment.css";

const FinalPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const payid = params.get('payid');

  const [paymentData, setPaymentData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [isPolling, setIsPolling] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  const { showToast } = useToast();

  // Add refs to track intervals and prevent memory leaks
  const statusIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

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

  // Calculate time remaining based on payment creation time
  const calculateTimeRemaining = (createdAt) => {
    if (!createdAt) return null;
    
    const createdTime = new Date(createdAt).getTime();
    const currentTime = Date.now();
    const expiryTime = createdTime + (10 * 60 * 1000); // 10 minutes in milliseconds
    const remaining = expiryTime - currentTime;
    
    if (remaining <= 0) {
      setIsExpired(true);
      return 0;
    }
    
    return remaining;
  };

  // Format time remaining as MM:SS
  const formatTimeRemaining = (ms) => {
    if (ms === null || ms <= 0) return '00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Start countdown timer
  const startCountdownTimer = () => {
    if (timerIntervalRef.current) return;
    
    timerIntervalRef.current = setInterval(() => {
      if (paymentData?.createdAt) {
        const remaining = calculateTimeRemaining(paymentData.createdAt);
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          stopCountdownTimer();
        }
      }
    }, 1000);
  };

  // Stop countdown timer
  const stopCountdownTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // ...existing code...

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
          startCountdownTimer();
        }
      } else {
        stopStatusPolling();
        stopCountdownTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopStatusPolling();
      stopCountdownTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [payid]);

  // Stop polling when payment is completed or failed
  useEffect(() => {
    if (paymentStatus === 'completed' || paymentStatus === 'failed') {
      stopStatusPolling();
      stopCountdownTimer();
    }
  }, [paymentStatus]);

  // Start timer when payment data is loaded
  useEffect(() => {
    if (paymentData?.createdAt && paymentStatus === 'pending') {
      const remaining = calculateTimeRemaining(paymentData.createdAt);
      setTimeRemaining(remaining);
      startCountdownTimer();
    }
    
    return () => stopCountdownTimer();
  }, [paymentData, paymentStatus]);

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
        
        // Calculate initial time remaining
        if (data.payment.createdAt && data.payment.status === 'pending') {
          const remaining = calculateTimeRemaining(data.payment.createdAt);
          setTimeRemaining(remaining);
        }
        
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
        
        // If terminal status, refresh full payment details so failureReason is available
        if (data.status === 'completed' || data.status === 'failed') {
          try {
            await fetchPaymentDetails(); // refresh paymentData (includes failureReason)
          } catch (e) {
            console.warn('⚠️ Failed to refresh payment details after status change', e);
          }
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
      showToast('Wallet address copied to clipboard!', 'success');
    } else {
      showToast('No valid wallet address to copy', 'error');
    }
  };

  const handleRetryPayment = async () => {
    if (!paymentData) return;
    
    try {
      setIsRetrying(true);
      console.log('🔄 Retrying payment for:', paymentData.payId);
      
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/payment/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oldPayId: paymentData.payId,
          customerName: paymentData.customerName,
          customerEmail: paymentData.customerEmail,
          cryptoType: paymentData.cryptoType,
          network: paymentData.network,
          productId: paymentData.productId
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.newPayId) {
        console.log('✅ New payment created:', data.newPayId);
        navigate(`/payment/final-payment?payid=${data.newPayId}`, { replace: true });
        window.location.reload();
      } else {
        showToast(data.message || 'Failed to retry payment', 'error');
      }
    } catch (err) {
      console.error('❌ Retry payment error:', err);
      showToast('Failed to retry payment. Please try again.', 'error');
    } finally {
      setIsRetrying(false);
    }
  };

  const getTimerColor = () => {
    if (timeRemaining === null) return 'text-gray-500';
    const minutes = Math.floor(timeRemaining / 60000);
    if (minutes <= 2) return 'text-red-500 dark:text-red-400';
    if (minutes <= 5) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-green-500 dark:text-green-400';
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

  if (error) {
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

  // --- FIX: Guard for undefined/null payment ---
  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 p-6">
        <div className="bg-surface dark:bg-gray-800 rounded-lg p-6 text-center">
          <Icon name="AlertCircle" size={36} />
          <p className="mt-4 text-error">Payment details not found.</p>
          <div className="mt-4">
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-primary text-white rounded-lg">Go Home</button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = paymentStatus === 'completed';
  const isFailed = paymentStatus === 'failed';

  return (
    <div className="final-payment-page min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors duration-300">
      <div className="max-w-3xl mx-auto bg-surface dark:bg-gray-800 rounded-lg shadow-md p-6 border border-border dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <img src="/images/Logo.webp" alt="QuantumPay" className="h-10" />
            <h1 className="text-xl font-semibold text-text-primary dark:text-white">Payment</h1>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isCompleted 
                ? 'bg-success-100 dark:bg-green-900/30 text-success dark:text-green-400' 
                : isFailed
                ? 'bg-error-100 dark:bg-red-900/30 text-error dark:text-red-400'
                : 'bg-warning-100 dark:bg-yellow-900/30 text-warning dark:text-yellow-400'
            }`}>
              {isCompleted ? 'Completed' : isFailed ? 'Failed' : (paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1))}
            </span>
          </div>
        </div>

        {/* Failed Payment UI */}
        {isFailed ? (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-error-100 dark:bg-red-900/30 rounded-full mb-4">
                <Icon name="XCircle" size={32} className="text-error dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-2">Payment Failed</h2>
              <p className="text-text-secondary dark:text-gray-400">
                {paymentData.failureReason || 'The payment could not be processed.'}
              </p>
            </div>

            <div className="bg-background dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-4">Payment Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Amount</span>
                  <span className="font-semibold text-text-primary dark:text-white">
                    ${(paymentData.amountUSD || paymentData.amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Cryptocurrency</span>
                  <span className="font-mono text-text-primary dark:text-white">
                    {(paymentData.amountCrypto || 0)} {paymentData.cryptoSymbol || paymentData.cryptoType}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Network</span>
                  <span className="text-text-primary dark:text-white">{paymentData.network}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Payment ID</span>
                  <span className="font-mono text-xs text-text-secondary dark:text-gray-400">{paymentData.payId}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRetryPayment}
                disabled={isRetrying}
                className="px-6 py-3 bg-primary dark:bg-teal-500 text-white rounded-lg font-medium hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <Icon name="RefreshCw" size={18} />
                    <span>Retry Payment</span>
                  </>
                )}
              </button>
              <a 
                href="/contact" 
                className="px-6 py-3 border border-border dark:border-gray-600 text-text-primary dark:text-white rounded-lg font-medium hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth text-center flex items-center justify-center space-x-2"
              >
                <Icon name="MessageCircle" size={18} />
                <span>Contact Support</span>
              </a>
            </div>

            <div className="text-center text-xs text-text-secondary dark:text-gray-500 mt-6">
              <Icon name="Info" size={14} className="inline mr-1" />
              Need help? Our support team is available 24/7
            </div>
          </div>
        ) : isCompleted ? (
          // --- Completed: show product/order summary & support ---
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-success-100 dark:bg-green-900/30 rounded-full mb-4">
                <Icon name="CheckCircle" size={32} className="text-success dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-2">Payment Confirmed!</h2>
              <p className="text-text-secondary dark:text-gray-400">Thank you — your payment has been processed successfully.</p>
            </div>

            <div className="bg-background dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-4">Product Details</h3>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="font-semibold text-lg text-text-primary dark:text-white mb-1">
                    {paymentData.productName || paymentData.product?.productName}
                  </div>
                  <div className="text-sm text-text-secondary dark:text-gray-400">
                    {paymentData.product?.description || ''}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border dark:border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Amount Paid (USD)</span>
                  <span className="font-semibold text-text-primary dark:text-white">
                    ${(paymentData.amountUSD || paymentData.amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Crypto Amount</span>
                  <span className="font-mono text-text-primary dark:text-white">
                    {(paymentData.amountCrypto || 0)} {paymentData.cryptoSymbol || paymentData.cryptoType}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Network</span>
                  <span className="text-text-primary dark:text-white">{paymentData.network}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary dark:text-gray-400">Payment ID</span>
                  <span className="font-mono text-xs text-text-secondary dark:text-gray-400">{paymentData.payId}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="/contact" 
                className="px-6 py-3 bg-primary dark:bg-teal-500 text-white rounded-lg font-medium hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth text-center flex items-center justify-center space-x-2"
              >
                <Icon name="MessageCircle" size={18} />
                <span>Contact Support</span>
              </a>
              <button 
                onClick={() => window.print()} 
                className="px-6 py-3 border border-border dark:border-gray-600 text-text-primary dark:text-white rounded-lg font-medium hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth flex items-center justify-center space-x-2"
              >
                <Icon name="Printer" size={18} />
                <span>Print Receipt</span>
              </button>
            </div>

            <div className="text-center text-xs text-text-secondary dark:text-gray-500 mt-6">
              <Icon name="Info" size={14} className="inline mr-1" />
              Keep this receipt for your records
            </div>
          </div>
        ) : (
          // --- Pending: show QR and address + details ---
          <div className="space-y-6">
            {/* Timer Alert */}
            {!isExpired && timeRemaining !== null && (
              <div className={`
                flex items-center justify-center space-x-3 p-4 rounded-lg border-2
                ${timeRemaining <= 120000 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800' 
                  : timeRemaining <= 300000
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800'
                }
              `}>
                <Icon 
                  name="Clock" 
                  size={24} 
                  className={getTimerColor()}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Time remaining to complete payment
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Payment will expire after 10 minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold font-mono ${getTimerColor()}`}>
                    {formatTimeRemaining(timeRemaining)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">minutes</p>
                </div>
              </div>
            )}

            {/* Expired Warning */}
            {isExpired && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <Icon name="AlertTriangle" size={24} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">Payment Time Expired</h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                      This payment request has expired. Please create a new payment or contact support if you've already sent the payment.
                    </p>
                    <button
                      onClick={handleRetryPayment}
                      disabled={isRetrying}
                      className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-600 transition-smooth flex items-center space-x-2 disabled:opacity-50"
                    >
                      {isRetrying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating New Payment...</span>
                        </>
                      ) : (
                        <>
                          <Icon name="RefreshCw" size={16} />
                          <span>Create New Payment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-2">Complete Your Payment</h2>
              <p className="text-text-secondary dark:text-gray-400">Send the exact amount to the address below</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center bg-background dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg p-6">
                <div className="bg-white p-4 rounded-lg mb-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paymentData.walletAddress || paymentData.address || '')}&size=200x200`}
                    alt="QR code"
                    className="w-48 h-48"
                  />
                </div>
                <div className="text-sm text-text-secondary dark:text-gray-400">Scan to pay with your wallet</div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <div className="bg-background dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-border dark:border-gray-700">
                    <span className="text-sm text-text-secondary dark:text-gray-400">Amount (USD)</span>
                    <span className="text-xl font-bold text-text-primary dark:text-white">
                      ${(paymentData.amountUSD || paymentData.amount || 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-border dark:border-gray-700">
                    <span className="text-sm text-text-secondary dark:text-gray-400">Send Exactly</span>
                    <span className="font-mono font-semibold text-primary dark:text-teal-400">
                      {(paymentData.amountCrypto || 0)} {paymentData.cryptoSymbol || paymentData.cryptoType}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-sm text-text-secondary dark:text-gray-400 mb-1">Network</div>
                    <div className="font-medium text-text-primary dark:text-white">{paymentData.network}</div>
                  </div>

                  <div>
                    <div className="text-sm text-text-secondary dark:text-gray-400 mb-2">Wallet Address</div>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-xs font-mono bg-secondary-50 dark:bg-gray-800 border border-border dark:border-gray-600 rounded px-3 py-2 text-text-primary dark:text-white break-all">
                        {paymentData.walletAddress || paymentData.address}
                      </code>
                      <button 
                        onClick={() => copy(paymentData.walletAddress || paymentData.address)} 
                        className="p-2 bg-primary dark:bg-teal-500 text-white rounded hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth flex-shrink-0"
                        title="Copy address"
                      >
                        <Icon name="Copy" size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-warning-50 dark:bg-yellow-900/20 border border-warning-200 dark:border-yellow-800/50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Icon name="AlertTriangle" size={16} className="text-warning dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-warning-700 dark:text-yellow-300">
                      <p className="font-medium mb-1">Important:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Send only {paymentData.cryptoSymbol || paymentData.cryptoType} on {paymentData.network} network</li>
                        <li>Send the exact amount shown above</li>
                        <li>Payment will be confirmed by the merchant</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-text-secondary dark:text-gray-500">
                  <span className="font-medium">Reference ID:</span> <span className="font-mono">{paymentData.payId}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t border-border dark:border-gray-700">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary dark:bg-teal-500 text-white rounded-lg font-medium hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth flex items-center justify-center space-x-2"
              >
                <Icon name="CheckCircle" size={18} />
                <span>I Have Sent Payment</span>
              </button>
              <a 
                href="/contact" 
                className="px-6 py-3 border border-border dark:border-gray-600 text-text-primary dark:text-white rounded-lg font-medium hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth text-center flex items-center justify-center space-x-2"
              >
                <Icon name="HelpCircle" size={18} />
                <span>Need Help?</span>
              </a>
            </div>

            <div className="text-center text-xs text-text-secondary dark:text-gray-500 bg-background dark:bg-gray-900 border border-border dark:border-gray-700 rounded-lg p-3">
              <Icon name="Clock" size={14} className="inline mr-1" />
              This page will automatically update once your payment is confirmed
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalPayment;