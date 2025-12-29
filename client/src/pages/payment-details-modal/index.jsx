import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "components/AppIcon";
import { paymentsAPI } from "utils/api";
import { useToast } from "contexts/ToastContext";

const server = import.meta.env.VITE_SERVER_URL || "";

// Helper: Get blockchain explorer URL based on network and hash
const getExplorerUrl = (network, hash) => {
  if (!hash || hash === 'N/A') return null;
  
  const explorers = {
    'Bitcoin': `https://blockstream.info/tx/${hash}`,
    'BTC': `https://blockstream.info/tx/${hash}`,
    'Ethereum': `https://etherscan.io/tx/${hash}`,
    'ETH': `https://etherscan.io/tx/${hash}`,
    'Polygon': `https://polygonscan.com/tx/${hash}`,
    'POLYGON': `https://polygonscan.com/tx/${hash}`,
    'BSC': `https://bscscan.com/tx/${hash}`,
    'Tron': `https://tronscan.org/#/transaction/${hash}`,
    'TRON': `https://tronscan.org/#/transaction/${hash}`,
    'Solana': `https://solscan.io/tx/${hash}`,
    'SOLANA': `https://solscan.io/tx/${hash}`,
    'SOL': `https://solscan.io/tx/${hash}`
  };
  
  return explorers[network] || `https://blockchair.com/search?q=${hash}`;
};

// Platform fee calculation (static 1% for now)
const calculatePlatformFee = (amountUSD) => {
  return (amountUSD * 0.01).toFixed(2);
};

const PaymentDetailsModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState("details");
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const id = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    const fetchPayment = async () => {
      if (!id) {
        setError('No payment ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 Fetching payment details for ID:', id);
        
        // Try to fetch from payments API
        const response = await paymentsAPI.getById(id);
        
        if (response.success && response.payment) {
          console.log('✅ Payment data loaded:', response.payment);
          setPaymentData(response.payment);
        } else {
          setError(response.message || 'Payment not found');
        }
      } catch (err) {
        console.error('❌ Error fetching payment:', err);
        setError('Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayment();
  }, [id]);

  const handleClose = () => {
    navigate(-1);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Payment Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Unable to load payment details'}</p>
          <button onClick={handleClose} className="px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Extract payment details
  const {
    payId,
    status,
    amountUSD,
    amountCrypto,
    cryptoType,
    cryptoSymbol,
    network,
    walletAddress,
    customerName,
    customerEmail,
    productName,
    productId,
    hash,
    exchangeRate,
    createdAt,
    completedAt,
    failureReason
  } = paymentData;

  const platformFee = calculatePlatformFee(amountUSD || 0);
  const explorerUrl = getExplorerUrl(network, hash);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[110vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{payId}</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Icon name="X" size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status & Amount Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                  <Icon name={status === 'completed' ? 'CheckCircle' : status === 'pending' ? 'Clock' : 'XCircle'} size={16} className="mr-1.5" />
                  {status?.charAt(0).toUpperCase() + status?.slice(1)}
                </span>
                {failureReason && (
                  <p className="text-sm text-red-500 mt-2">Reason: {failureReason}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${(amountUSD || 0).toFixed(2)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {amountCrypto || 0} {cryptoSymbol || cryptoType}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            {['details', 'blockchain'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-primary dark:border-teal-500 text-primary dark:text-teal-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'details' ? 'Transaction Details' : 'Blockchain Info'}
              </button>
            ))}
          </div>

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Customer Information</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Customer Name</label>
                      <p className="text-gray-900 dark:text-white font-medium">{customerName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
                      <p className="text-gray-900 dark:text-white">{customerEmail || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Product Information</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Product Name</label>
                      <p className="text-gray-900 dark:text-white font-medium">{productName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Product ID</label>
                      <p className="text-gray-900 dark:text-white font-mono text-sm">{productId || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Details</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Cryptocurrency</label>
                      <p className="text-gray-900 dark:text-white">{cryptoType} ({network})</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Exchange Rate</label>
                      <p className="text-gray-900 dark:text-white">${(exchangeRate || 0).toLocaleString()} per {cryptoSymbol || cryptoType}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Wallet Address</label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white break-all">
                        {walletAddress || 'N/A'}
                      </code>
                      {walletAddress && (
                        <button onClick={() => copyToClipboard(walletAddress)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                          <Icon name="Copy" size={16} className="text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Fee Breakdown</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">${(amountUSD || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Platform Fee (1%)</span>
                    <span className="text-gray-900 dark:text-white">${platformFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Network Fee</span>
                    <span className="text-gray-900 dark:text-white">Included</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-900 dark:text-white">Total</span>
                      <span className="text-gray-900 dark:text-white">${(amountUSD || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Timeline</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Created</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(createdAt)}</p>
                    </div>
                  </div>
                  {status === 'completed' && completedAt && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Completed</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(completedAt)}</p>
                      </div>
                    </div>
                  )}
                  {status === 'failed' && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Failed</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{failureReason || 'Unknown reason'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'blockchain' && (
            <div className="space-y-6">
              {/* Transaction Hash */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Transaction Hash</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  {hash ? (
                    <>
                      <div className="flex items-center space-x-2 mb-3">
                        <code className="flex-1 text-sm bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white break-all">
                          {hash}
                        </code>
                        <button onClick={() => copyToClipboard(hash)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                          <Icon name="Copy" size={16} className="text-gray-500" />
                        </button>
                      </div>
                      {explorerUrl && (
                        <a 
                          href={explorerUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-primary dark:text-teal-400 hover:underline"
                        >
                          <Icon name="ExternalLink" size={16} />
                          <span>View on Blockchain Explorer</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      {status === 'pending' ? 'Transaction hash will be available after confirmation' : 'No transaction hash available'}
                    </p>
                  )}
                </div>
              </div>

              {/* Network Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Network Information</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Network</label>
                      <p className="text-gray-900 dark:text-white">{network || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Cryptocurrency</label>
                      <p className="text-gray-900 dark:text-white">{cryptoType} ({cryptoSymbol})</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Confirmations</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900 dark:text-white">{status === 'completed' ? '6/6' : '0/6'}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: status === 'completed' ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blockchain Explorers */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Blockchain Explorers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/*
                    Uncomment and modify the explorers list based on actual requirements
                    {{
                      name: 'Blockstream', url: `https://blockstream.info/tx/${hash}`, networks: ['Bitcoin', 'BTC'] },
                      { name: 'Etherscan', url: `https://etherscan.io/tx/${hash}`, networks: ['Ethereum', 'ETH'] },
                      { name: 'Polygonscan', url: `https://polygonscan.com/tx/${hash}`, networks: ['Polygon', 'POLYGON'] },
                      { name: 'BscScan', url: `https://bscscan.com/tx/${hash}`, networks: ['BSC'] },
                      { name: 'Solscan', url: `https://solscan.io/tx/${hash}`, networks: ['Solana', 'SOL', 'SOLANA'] },
                      { name: 'Tronscan', url: `https://tronscan.org/#/transaction/${hash}`, networks: ['Tron', 'TRON'] }
                    }.filter(exp => exp.networks.includes(network) || exp.networks.includes(cryptoType)).map((explorer) => (
                  */}
                  {/*
                    <a
                      key={explorer.name}
                      href={hash ? explorer.url : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${!hash ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={(e) => !hash && e.preventDefault()}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon name="ExternalLink" size={16} className="text-primary dark:text-teal-400" />
                        <span className="text-gray-900 dark:text-white">{explorer.name}</span>
                      </div>
                      <Icon name="ChevronRight" size={16} className="text-gray-400" />
                    </a>
                  */}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button 
            onClick={handleClose} 
            className="w-full sm:w-auto order-2 sm:order-1 px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
          <button 
            onClick={() => window.print()}
            className="w-full sm:w-auto order-1 sm:order-2 px-6 py-2.5 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 transition-colors flex items-center justify-center space-x-2 font-medium shadow-sm"
          >
            <Icon name="Download" size={16} />
            <span>Export Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsModal;
