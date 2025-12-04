import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "components/AppIcon";
import Image from "components/AppImage";
const server = import.meta.env.VITE_SERVER_URL || "";

const PaymentDetailsModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState("details");
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);

  const id = new URLSearchParams(location.search).get("id");

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        console.log('🔄 Fetching payment details for ID:', id);
        
        if (!id) {
          console.error('❌ No payment ID provided');
          setPaymentData(null);
          setLoading(false);
          return;
        }

        // Try different API endpoints to fetch payment data
        let response;
        let data;

        // First try the paymentinfo endpoint (for backward compatibility)
        try {
          response = await fetch(`${server}/api/paymentinfo?id=${id}`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem('authToken')}`
            },
          });
          
          if (response.ok) {
            data = await response.json();
            console.log('📦 PaymentInfo response:', data);
            
            if (data.success && data.payment) {
              setPaymentData(data.payment);
              setLoading(false);
              return;
            }
          }
        } catch (paymentInfoError) {
          console.warn('⚠️ PaymentInfo endpoint failed, trying payments endpoint');
        }

        // If paymentinfo fails, try the payments endpoint
        try {
          response = await fetch(`${server}/api/payments/${id}`, {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem('authToken')}`
            },
          });
          
          if (response.ok) {
            data = await response.json();
            console.log('📦 Payments API response:', data);
            
            if (data.success && data.payment) {
              // Transform the data to match expected format with network support
              const transformedPayment = {
                id: data.payment.payId,
                payId: data.payment.payId,
                amount: data.payment.amountUSD,
                cryptoAmount: data.payment.amountCrypto,
                currency: 'USD',
                cryptoCurrency: data.payment.cryptoType,
                network: data.payment.network || 'Unknown',
                status: data.payment.status,
                timestamp: data.payment.createdAt,
                completedAt: data.payment.completedAt,
                blockchainHash: data.payment.hash || '0000000000xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                confirmations: data.payment.status === 'completed' ? 6 : 0,
                networkFee: 0.0001,
                platformFee: data.payment.amountUSD * 0.01,
                // Add order and API status information
                orderStatus: data.payment.orderStatus,
                orderIsActive: data.payment.orderIsActive,
                apiIsActive: data.payment.apiIsActive,
                customer: {
                  name: data.payment.customerName,
                  email: data.payment.customerEmail,
                  company: 'Customer',
                  id: data.payment.payId,
                  avatar: '/images/default-avatar.png'
                },
                recipient: {
                  walletAddress: data.payment.walletAddress || data.payment.businessEmail,
                  walletType: `${data.payment.cryptoType} Wallet (${data.payment.network || 'Unknown'})`,
                  network: data.payment.network || 'Unknown',
                  exchangeRate: data.payment.exchangeRate || 40000.00
                },
                // Enhanced timeline with network info
                timeline: [
                  {
                    status: 'initiated',
                    timestamp: data.payment.createdAt,
                    description: `Payment request created for ${data.payment.cryptoType} on ${data.payment.network || 'Unknown'} network`
                  },
                  ...(data.payment.status === 'completed' ? [
                    {
                      status: 'completed',
                      timestamp: data.payment.completedAt || data.payment.updatedAt,
                      description: `Payment completed on ${data.payment.network || 'Unknown'} network`
                    }
                  ] : []),
                  // Add status entries for deactivated orders or paused APIs
                  ...(data.payment.orderIsActive === false ? [
                    {
                      status: 'warning',
                      timestamp: data.payment.updatedAt || data.payment.createdAt,
                      description: 'Associated order has been deactivated'
                    }
                  ] : []),
                  ...(data.payment.apiIsActive === false ? [
                    {
                      status: 'warning',
                      timestamp: data.payment.updatedAt || data.payment.createdAt,
                      description: 'API access has been paused'
                    }
                  ] : [])
                ],
                communications: [
                  {
                    id: 1,
                    type: 'email',
                    direction: 'outbound',
                    subject: `Payment Confirmation - ${data.payment.payId} (${data.payment.network})`,
                    timestamp: data.payment.createdAt,
                    status: 'delivered'
                  }
                ],
                notes: [
                  {
                    id: 1,
                    author: 'System',
                    content: data.payment.status === 'completed' 
                      ? `Payment processed successfully on ${data.payment.network || 'Unknown'} network` 
                      : `Payment is being processed on ${data.payment.network || 'Unknown'} network`,
                    timestamp: data.payment.updatedAt || data.payment.createdAt
                  },
                  // Add network-specific notes
                  ...(data.payment.network ? [
                    {
                      id: 2,
                      author: 'System',
                      content: `Network: ${data.payment.network} | Crypto: ${data.payment.cryptoType}`,
                      timestamp: data.payment.createdAt
                    }
                  ] : []),
                  // Add warning notes for deactivated/paused states
                  ...(data.payment.orderIsActive === false ? [
                    {
                      id: 3,
                      author: 'System',
                      content: 'Warning: Associated order has been deactivated',
                      timestamp: data.payment.updatedAt || data.payment.createdAt
                    }
                  ] : []),
                  ...(data.payment.apiIsActive === false ? [
                    {
                      id: 4,
                      author: 'System',
                      content: 'Warning: API access has been paused',
                      timestamp: data.payment.updatedAt || data.payment.createdAt
                    }
                  ] : [])
                ]
              };
              
              setPaymentData(transformedPayment);
              setLoading(false);
              return;
            }
          }
        } catch (paymentsError) {
          console.error('❌ Payments endpoint also failed:', paymentsError);
        }

        // If both fail, show error
        console.error('❌ Failed to fetch payment data from both endpoints');
        setPaymentData(null);
        
      } catch (err) {
        console.error("❌ Error fetching payment:", err);
        setPaymentData(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchPayment();
    } else {
      setLoading(false);
    }
  }, [id]); // Only refetch when ID changes, not continuously

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-success bg-success-100";
      case "processing":
      case "pending":
        return "text-warning bg-warning-100 pulse-pending";
      case "failed":
        return "text-error bg-error-100";
      default:
        return "text-text-secondary bg-secondary-100";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleRefund = () => {
    setIsRefundModalOpen(false);
    setRefundAmount("");
    setRefundReason("");
    // Handle refund logic here
  };

  const handleSendMessage = () => {
    if (customerMessage.trim()) {
      // Handle message sending logic here
      setCustomerMessage("");
    }
  };

  const handleClose = () => {
    navigate("/dashboard/payments-management");
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, []);

  const tabs = [
    { id: "details", label: "Transaction Details", icon: "FileText" },
    { id: "blockchain", label: "Blockchain Info", icon: "Link" },
    {
      id: "communication",
      label: "Customer Communication",
      icon: "MessageSquare",
    },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-300 bg-background dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Icon name="Loader" size={24} className="animate-spin text-primary dark:text-teal-400" />
          <p className="text-text-secondary dark:text-gray-400">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="fixed inset-0 z-300 bg-background dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="AlertCircle" size={32} color="#ef4444" />
          </div>
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Payment Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The requested payment could not be found or you don't have permission to view it.</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-blue-600 dark:bg-teal-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-teal-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-300 bg-background dark:bg-gray-900">
      {/* Mobile/Tablet Full Screen Layout */}
      <div className="h-full flex flex-col lg:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-700 bg-surface dark:bg-gray-800">
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth"
          >
            <Icon name="ArrowLeft" size={20} color="currentColor" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary dark:text-white">
            Transaction Details
          </h1>
          <div className="w-10"></div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Status and Amount */}
            <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-border dark:border-gray-700">
              <div className="text-center mb-4">
                <div
                  className={`
                  inline-flex items-center px-4 py-2 rounded-full text-lg font-medium mb-3
                  ${getStatusColor(paymentData.status)}
                `}
                >
                  <Icon
                    name={
                      paymentData.status === "completed"
                        ? "CheckCircle"
                        : paymentData.status === "processing"
                        ? "Clock"
                        : "XCircle"
                    }
                    size={20}
                    color="currentColor"
                    className="mr-2"
                  />
                  {paymentData.status.charAt(0).toUpperCase() +
                    paymentData.status.slice(1)}
                </div>
                <h2 className="text-3xl font-bold text-text-primary dark:text-white mb-1">
                  $
                  {paymentData.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </h2>
                <p className="text-text-secondary dark:text-gray-400">
                  {paymentData.cryptoAmount} {paymentData.cryptoCurrency}
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700">
              <div className="flex border-b border-border dark:border-gray-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center space-x-2 px-4 py-3
                      text-sm font-medium transition-smooth
                      ${
                        activeTab === tab.id
                          ? "text-primary dark:text-teal-400 border-b-2 border-primary dark:border-teal-400 bg-primary-50 dark:bg-teal-900/20"
                          : "text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200"
                      }
                    `}
                  >
                    <Icon name={tab.icon} size={16} color="currentColor" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-4">
                {activeTab === "details" && (
                  <TransactionDetailsTab
                    paymentData={paymentData}
                    copyToClipboard={copyToClipboard}
                    formatDate={formatDate}
                  />
                )}
                {activeTab === "blockchain" && (
                  <BlockchainInfoTab
                    paymentData={paymentData}
                    copyToClipboard={copyToClipboard}
                  />
                )}
                {activeTab === "communication" && (
                  <CommunicationTab
                    paymentData={paymentData}
                    customerMessage={customerMessage}
                    setCustomerMessage={setCustomerMessage}
                    handleSendMessage={handleSendMessage}
                    formatDate={formatDate}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="p-4 border-t border-border dark:border-gray-700 bg-surface dark:bg-gray-800">
          <div className="flex space-x-3">
            <button
              onClick={() => setIsRefundModalOpen(true)}
              className="
                flex-1 flex items-center justify-center space-x-2 px-4 py-3
                border border-error dark:border-red-500 text-error dark:text-red-400 rounded-lg
                hover:bg-error-50 dark:hover:bg-red-900/20 transition-smooth
              "
            >
              <Icon name="RotateCcw" size={16} color="currentColor" />
              <span>Refund</span>
            </button>
            <button
              className="
              flex-1 flex items-center justify-center space-x-2 px-4 py-3
              bg-primary dark:bg-teal-500 text-white rounded-lg
              hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
            "
            >
              <Icon name="Download" size={16} color="currentColor" />
              <span>Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Modal Layout */}
      <div className="hidden lg:flex items-center justify-center p-8 h-full">
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={handleClose}
        />

        <div
          ref={modalRef}
          className="
            relative bg-surface dark:bg-gray-800 rounded-lg shadow-dropdown
            w-full max-w-6xl max-h-[90vh] overflow-hidden
            transition-layout flex flex-col
          "
        >
          {/* Desktop Header */}
          <div className="flex items-center justify-between p-6 border-b border-border dark:border-gray-700 flex-shrink-0">
            <div>
              <div className="flex items-center space-x-3 mt-2">
                <Icon
                  name="FileText"
                  size={24}
                  color="currentColor"
                  className="text-primary dark:text-teal-400"
                />
                <div>
                  <h2 className="text-xl font-semibold text-text-primary dark:text-white">
                    Payment Details
                  </h2>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    Transaction ID: {paymentData.id}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="
                p-2 rounded-lg
                hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth
                text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white
              "
            >
              <Icon name="X" size={20} color="currentColor" />
            </button>
          </div>

          {/* Desktop Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Section - Transaction Summary */}
            <div className="w-1/3 border-r border-border dark:border-gray-700 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Status and Amount */}
                <div className="text-center">
                  <div
                    className={`
                    inline-flex items-center px-4 py-2 rounded-full text-lg font-medium mb-4
                    ${getStatusColor(paymentData.status)}
                  `}
                  >
                    <Icon
                      name={
                        paymentData.status === "completed"
                          ? "CheckCircle"
                          : paymentData.status === "processing"
                          ? "Clock"
                          : "XCircle"
                      }
                      size={20}
                      color="currentColor"
                      className="mr-2"
                    />
                    {paymentData.status.charAt(0).toUpperCase() +
                      paymentData.status.slice(1)}
                  </div>
                  <h3 className="text-4xl font-bold text-text-primary dark:text-white mb-2">
                    $
                    {paymentData.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </h3>
                  <p className="text-text-secondary dark:text-gray-400 text-lg">
                    {paymentData.cryptoAmount} {paymentData.cryptoCurrency}
                  </p>
                  <p className="text-sm text-text-secondary dark:text-gray-500 mt-1">
                    Rate: ${paymentData.recipient.exchangeRate.toLocaleString()}{" "}
                    per BTC
                  </p>
                </div>

                {/* Transaction Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                      Transaction ID
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="font-mono text-sm text-text-primary dark:text-gray-200 bg-background dark:bg-gray-900 px-2 py-1 rounded border dark:border-gray-700 flex-1">
                        {paymentData.id}
                      </code>
                      <button
                        onClick={() => copyToClipboard(paymentData.id)}
                        className="p-1 hover:bg-secondary-100 dark:hover:bg-gray-700 rounded transition-smooth"
                      >
                        <Icon
                          name="Copy"
                          size={16}
                          color="currentColor"
                          className="text-text-secondary dark:text-gray-400"
                        />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                      Blockchain Hash
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="font-mono text-xs text-text-primary dark:text-gray-200 bg-background dark:bg-gray-900 px-2 py-1 rounded border dark:border-gray-700 flex-1 break-all">
                        {paymentData.blockchainHash}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(paymentData.blockchainHash)
                        }
                        className="p-1 hover:bg-secondary-100 dark:hover:bg-gray-700 rounded transition-smooth flex-shrink-0"
                      >
                        <Icon
                          name="Copy"
                          size={16}
                          color="currentColor"
                          className="text-text-secondary dark:text-gray-400"
                        />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                      Timestamp
                    </label>
                    <p className="text-text-primary dark:text-gray-200">
                      {formatDate(paymentData.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-background dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="font-medium text-text-primary dark:text-white mb-3">
                    Customer Information
                  </h4>
                  <div className="flex items-center space-x-3 mb-3">
                    <Image
                      src={paymentData.customer.avatar}
                      alt={paymentData.customer.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-text-primary dark:text-white">
                        {paymentData.customer.name}
                      </p>
                      <p className="text-sm text-text-secondary dark:text-gray-400">
                        {paymentData.customer.company}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary dark:text-gray-400">Email:</span>
                      <span className="text-text-primary dark:text-gray-200">
                        {paymentData.customer.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary dark:text-gray-400">Customer ID:</span>
                      <span className="font-mono text-text-primary dark:text-gray-200">
                        {paymentData.customer.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Detailed Information */}
            <div className="flex-1 flex flex-col">
              {/* Tab Navigation */}
              <div className="flex border-b border-border dark:border-gray-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 px-6 py-4
                      text-sm font-medium transition-smooth
                      ${
                        activeTab === tab.id
                          ? "text-primary dark:text-teal-400 border-b-2 border-primary dark:border-teal-400 bg-primary-50 dark:bg-teal-900/20"
                          : "text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200"
                      }
                    `}
                  >
                    <Icon name={tab.icon} size={16} color="currentColor" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === "details" && (
                  <TransactionDetailsTab
                    paymentData={paymentData}
                    copyToClipboard={copyToClipboard}
                    formatDate={formatDate}
                  />
                )}
                {activeTab === "blockchain" && (
                  <BlockchainInfoTab
                    paymentData={paymentData}
                    copyToClipboard={copyToClipboard}
                  />
                )}
                {activeTab === "communication" && (
                  <CommunicationTab
                    paymentData={paymentData}
                    customerMessage={customerMessage}
                    setCustomerMessage={setCustomerMessage}
                    handleSendMessage={handleSendMessage}
                    formatDate={formatDate}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Desktop Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t border-border dark:border-gray-700 flex-shrink-0 bg-surface dark:bg-gray-800">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsRefundModalOpen(true)}
                className="
                  flex items-center space-x-2 px-4 py-2
                  border border-error dark:border-red-500 text-error dark:text-red-400 rounded-lg
                  hover:bg-error-50 dark:hover:bg-red-900/20 transition-smooth
                "
              >
                <Icon name="RotateCcw" size={16} color="currentColor" />
                <span>Process Refund</span>
              </button>
              <button
                className="
                flex items-center space-x-2 px-4 py-2
                border border-border dark:border-gray-600 text-text-secondary dark:text-gray-400 rounded-lg
                hover:bg-secondary-100 dark:hover:bg-gray-700 hover:text-text-primary dark:hover:text-gray-200 transition-smooth
              "
              >
                <Icon name="MessageSquare" size={16} color="currentColor" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleClose}
                className="
                  px-4 py-2 border border-border dark:border-gray-600 rounded-lg
                  text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200
                  hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth
                "
              >
                Close
              </button>
              <button
                className="
                flex items-center space-x-2 px-4 py-2
                bg-primary dark:bg-teal-500 text-white rounded-lg
                hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
              "
              >
                <Icon name="Download" size={16} color="currentColor" />
                <span>Export Receipt</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {isRefundModalOpen && (
        <RefundModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          onConfirm={handleRefund}
          paymentData={paymentData}
          refundAmount={refundAmount}
          setRefundAmount={setRefundAmount}
          refundReason={refundReason}
          setRefundReason={setRefundReason}
        />
      )}
    </div>
  );
};

// Enhanced Transaction Details Tab with Network Information
const TransactionDetailsTab = ({
  paymentData,
  copyToClipboard,
  formatDate,
}) => {
  return (
    <div className="space-y-6">
      {/* Enhanced Payment Method Details with Network */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Payment Method Details
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                Cryptocurrency
              </label>
              <p className="text-text-primary dark:text-gray-200">
                {paymentData.cryptoCurrency} ({paymentData.network})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                Network
              </label>
              <p className="text-text-primary dark:text-gray-200">
                {paymentData.network || 'Unknown'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                Wallet Type
              </label>
              <p className="text-text-primary dark:text-gray-200">
                {paymentData.recipient.walletType}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
              Recipient Wallet Address
            </label>
            <div className="flex items-center space-x-2">
              <code className="font-mono text-sm text-text-primary dark:text-gray-200 bg-surface dark:bg-gray-800 px-2 py-1 rounded border dark:border-gray-700 flex-1 break-all">
                {paymentData.recipient.walletAddress}
              </code>
              <button
                onClick={() =>
                  copyToClipboard(paymentData.recipient.walletAddress)
                }
                className="p-1 hover:bg-secondary-100 dark:hover:bg-gray-700 rounded transition-smooth flex-shrink-0"
              >
                <Icon
                  name="Copy"
                  size={16}
                  color="currentColor"
                  className="text-text-secondary dark:text-gray-400"
                />
              </button>
            </div>
            {paymentData.network && (
              <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">
                Ensure you send on the {paymentData.network} network to avoid loss of funds
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Timeline */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Transaction Timeline
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4">
          <div className="space-y-4">
            {paymentData.timeline.map((event, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div
                  className={`
                  w-3 h-3 rounded-full mt-1.5 flex-shrink-0
                  ${
                    event.status === "completed"
                      ? "bg-success dark:bg-green-500"
                      : event.status === "confirmed"
                      ? "bg-primary dark:bg-teal-500"
                      : event.status === "processing"
                      ? "bg-warning dark:bg-yellow-500"
                      : "bg-secondary-300 dark:bg-gray-600"
                  }
                `}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary dark:text-gray-200">
                    {event.description}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {formatDate(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Fee Breakdown
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400">Network Fee</span>
            <span className="font-mono text-text-primary dark:text-gray-200">
              {paymentData.networkFee} BTC
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400">Platform Fee</span>
            <span className="font-mono text-text-primary dark:text-gray-200">
              ${paymentData.platformFee}
            </span>
          </div>
          <div className="border-t border-border dark:border-gray-700 pt-2">
            <div className="flex justify-between items-center font-medium">
              <span className="text-text-primary dark:text-white">Total Amount</span>
              <span className="text-text-primary dark:text-white">
                $
                {paymentData.amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Transaction Notes
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4">
          {paymentData.notes.length > 0 ? (
            <div className="space-y-3">
              {paymentData.notes.map((note) => (
                <div key={note.id} className="border-l-4 border-primary dark:border-teal-500 pl-4">
                  <p className="text-text-primary dark:text-gray-200 text-sm">{note.content}</p>
                  <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
                    {note.author} • {formatDate(note.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary dark:text-gray-400 text-sm">
              No notes available for this transaction.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Blockchain Info Tab Component
const BlockchainInfoTab = ({ paymentData, copyToClipboard }) => {
  return (
    <div className="space-y-6">
      {/* Confirmation Status */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Confirmation Status
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-secondary dark:text-gray-400">Confirmations</span>
            <span className="text-text-primary dark:text-gray-200 font-medium">
              {paymentData.confirmations}/6
            </span>
          </div>
          <div className="w-full bg-secondary-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-success dark:bg-green-500 h-3 rounded-full transition-layout"
              style={{
                width: `${Math.min(
                  (paymentData.confirmations / 6) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-2">
            {paymentData.confirmations >= 6
              ? "Fully confirmed"
              : `${6 - paymentData.confirmations} more confirmations needed`}
          </p>
        </div>
      </div>

      {/* Blockchain Details */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Blockchain Details
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
              Transaction Hash
            </label>
            <div className="flex items-center space-x-2">
              <code className="font-mono text-sm text-text-primary dark:text-gray-200 bg-surface dark:bg-gray-800 px-2 py-1 rounded border dark:border-gray-700 flex-1 break-all">
                {paymentData.blockchainHash}
              </code>
              <button
                onClick={() => copyToClipboard(paymentData.blockchainHash)}
                className="p-1 hover:bg-secondary-100 dark:hover:bg-gray-700 rounded transition-smooth flex-shrink-0"
              >
                <Icon
                  name="Copy"
                  size={16}
                  color="currentColor"
                  className="text-text-secondary dark:text-gray-400"
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                Network
              </label>
              <p className="text-text-primary dark:text-gray-200">Bitcoin Mainnet</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                Block Height
              </label>
              <p className="text-text-primary dark:text-gray-200">825,432</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                Gas Price
              </label>
              <p className="text-text-primary dark:text-gray-200">15 sat/vB</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">
                Transaction Size
              </label>
              <p className="text-text-primary dark:text-gray-200">225 bytes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Explorer Links */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Blockchain Explorers
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href={`https://blockstream.info/tx/${paymentData.blockchainHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center justify-between p-3 border border-border dark:border-gray-700 rounded-lg
                hover:bg-surface dark:hover:bg-gray-800 hover:border-primary dark:hover:border-teal-500 transition-smooth
              "
            >
              <div className="flex items-center space-x-3">
                <Icon
                  name="ExternalLink"
                  size={16}
                  color="currentColor"
                  className="text-primary dark:text-teal-400"
                />
                <span className="text-text-primary dark:text-gray-200">Blockstream</span>
              </div>
              <Icon
                name="ChevronRight"
                size={16}
                color="currentColor"
                className="text-text-secondary dark:text-gray-400"
              />
            </a>

            <a
              href={`https://blockchain.info/tx/${paymentData.blockchainHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center justify-between p-3 border border-border dark:border-gray-700 rounded-lg
                hover:bg-surface dark:hover:bg-gray-800 hover:border-primary dark:hover:border-teal-500 transition-smooth
              "
            >
              <div className="flex items-center space-x-3">
                <Icon
                  name="ExternalLink"
                  size={16}
                  color="currentColor"
                  className="text-primary dark:text-teal-400"
                />
                <span className="text-text-primary dark:text-gray-200">Blockchain.info</span>
              </div>
              <Icon
                name="ChevronRight"
                size={16}
                color="currentColor"
                className="text-text-secondary dark:text-gray-400"
              />
            </a>
          </div>
        </div>
      </div>

      {/* Network Information */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Network Information
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400">Current Block Height</span>
            <span className="text-text-primary dark:text-gray-200">825,445</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400">Network Difficulty</span>
            <span className="text-text-primary dark:text-gray-200">73.2T</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400">Average Block Time</span>
            <span className="text-text-primary dark:text-gray-200">10 minutes</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400">Mempool Size</span>
            <span className="text-text-primary dark:text-gray-200">2.4 MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Communication Tab Component
const CommunicationTab = ({
  paymentData,
  customerMessage,
  setCustomerMessage,
  handleSendMessage,
  formatDate,
}) => {
  return (
    <div className="space-y-6">
      {/* Send Message */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Send Message to Customer
        </h4>
        <div className="bg-background dark:bg-gray-900 rounded-lg p-4">
          <div className="space-y-3">
            <textarea
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              placeholder="Type your message to the customer..."
              className="
                w-full h-24 px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                text-text-primary dark:text-white placeholder-text-secondary dark:placeholder-gray-500 bg-background dark:bg-gray-800
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                resize-none
              "
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Message will be sent to {paymentData.customer.email}
              </p>
              <button
                onClick={handleSendMessage}
                disabled={!customerMessage.trim()}
                className="
                  flex items-center space-x-2 px-4 py-2
                  bg-primary dark:bg-teal-500 text-white rounded-lg
                  hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <Icon name="Send" size={16} color="currentColor" />
                <span>Send Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Communication History */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Communication History
        </h4>
        <div className="space-y-3">
          {paymentData.communications.map((comm) => (
            <div key={comm.id} className="bg-background dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${
                      comm.type === "email" ? "bg-primary-100 dark:bg-teal-900/30" : "bg-accent-100 dark:bg-purple-900/30"
                    }
                  `}
                  >
                    <Icon
                      name={comm.type === "email" ? "Mail" : "Bell"}
                      size={16}
                      color={
                        comm.type === "email"
                          ? "var(--color-primary)"
                          : "var(--color-accent)"
                      }
                    />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary dark:text-white">
                      {comm.subject}
                    </p>
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                      {comm.direction === "outbound"
                        ? "Sent to customer"
                        : "Received from customer"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    {formatDate(comm.timestamp)}
                  </p>
                  <div
                    className={`
                    inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1
                    ${
                      comm.status === "delivered"
                        ? "text-success dark:text-green-400 bg-success-100 dark:bg-green-900/30"
                        : comm.status === "read"
                        ? "text-primary dark:text-teal-400 bg-primary-100 dark:bg-teal-900/30"
                        : "text-text-secondary dark:text-gray-400 bg-secondary-100 dark:bg-gray-700"
                    }
                  `}
                  >
                    <Icon
                      name={
                        comm.status === "delivered"
                          ? "Check"
                          : comm.status === "read"
                          ? "CheckCheck"
                          : "Clock"
                      }
                      size={12}
                      color="currentColor"
                      className="mr-1"
                    />
                    {comm.status.charAt(0).toUpperCase() + comm.status.slice(1)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h4 className="text-lg font-medium text-text-primary dark:text-white mb-4">
          Quick Actions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            className="
            flex items-center space-x-3 p-4 border border-border dark:border-gray-700 rounded-lg
            hover:bg-surface dark:hover:bg-gray-800 hover:border-primary dark:hover:border-teal-500 transition-smooth
            text-left
          "
          >
            <Icon
              name="Mail"
              size={20}
              color="currentColor"
              className="text-primary dark:text-teal-400"
            />
            <div>
              <p className="font-medium text-text-primary dark:text-white">Send Receipt</p>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Email transaction receipt
              </p>
            </div>
          </button>

          <button
            className="
            flex items-center space-x-3 p-4 border border-border dark:border-gray-700 rounded-lg
            hover:bg-surface dark:hover:bg-gray-800 hover:border-primary dark:hover:border-teal-500 transition-smooth
            text-left
          "
          >
            <Icon
              name="Phone"
              size={20}
              color="currentColor"
              className="text-primary dark:text-teal-400"
            />
            <div>
              <p className="font-medium text-text-primary dark:text-white">Schedule Call</p>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Set up customer call
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Refund Modal Component
const RefundModal = ({
  isOpen,
  onClose,
  onConfirm,
  paymentData,
  refundAmount,
  setRefundAmount,
  refundReason,
  setRefundReason,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-400 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="relative bg-surface dark:bg-gray-800 rounded-lg shadow-dropdown w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-gray-700">
          <h3 className="text-lg font-semibold text-text-primary dark:text-white">
            Process Refund
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary-100 dark:hover:bg-gray-700 rounded transition-smooth"
          >
            <Icon name="X" size={20} color="currentColor" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
              Refund Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                max={paymentData.amount}
                className="
                  w-full pl-8 pr-4 py-2 border border-border dark:border-gray-700 rounded-lg
                  text-text-primary dark:text-white placeholder-text-secondary dark:placeholder-gray-500 bg-background dark:bg-gray-900
                  focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 focus:border-transparent
                "
              />
            </div>
            <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
              Maximum refundable: $
              {paymentData.amount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
              Refund Reason
            </label>
            <select
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="
                w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                text-text-primary dark:text-white bg-background dark:bg-gray-900
                focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500 focus:border-transparent
              "
            >
              <option value="">Select a reason</option>
              <option value="customer_request">Customer Request</option>
              <option value="duplicate_payment">Duplicate Payment</option>
              <option value="fraudulent_transaction">
                Fraudulent Transaction
              </option>
              <option value="technical_error">Technical Error</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border dark:border-gray-700">
          <button
            onClick={onClose}
            className="
              px-4 py-2 border border-border dark:border-gray-600 rounded-lg
              text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-gray-200
              hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth
            "
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!refundAmount || !refundReason}
            className="
              px-4 py-2 bg-error dark:bg-red-600 text-white rounded-lg
              hover:bg-error-700 dark:hover:bg-red-700 transition-smooth
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Process Refund
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsModal;
