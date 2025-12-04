import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { paymentsAPI } from 'utils/api';
import PaymentLinkModal from './components/PaymentLinkModal';

// A mock modal component for demonstration purposes
const MockModal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-surface dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md relative border border-border dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">{title}</h2>
            <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-gray-700">
                <Icon name="X" size={20} />
            </button>
            {children}
        </div>
    </div>
);


const PaymentsManagement = () => {
    const navigate = useNavigate();
    // --- STATE MANAGEMENT ---
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, failed: 0 });

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isPaymentLinkModalOpen, setIsPaymentLinkModalOpen] = useState(false);

    // Table Interaction State
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        cryptocurrency: 'all',
        network: 'all'
    });

    // --- DATA FETCHING ---
    useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 Fetching payments with params:', {
          page: currentPage,
          limit: itemsPerPage,
          status: filters.status !== 'all' ? filters.status : undefined,
          search: filters.search || undefined,
          cryptoType: filters.cryptocurrency !== 'all' ? filters.cryptocurrency : undefined,
          network: filters.network !== 'all' ? filters.network : undefined,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction
        });

        // Build clean API parameters
        const apiParams = {
          skip: (currentPage - 1) * itemsPerPage,
          limit: itemsPerPage,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction
        };

        // Only add filters if they're not 'all' and not empty
        if (filters.status && filters.status !== 'all') {
          apiParams.status = filters.status;
        }

        if (filters.search && filters.search.trim() !== '') {
          apiParams.search = filters.search.trim();
        }

        if (filters.cryptocurrency && filters.cryptocurrency !== 'all') {
          apiParams.cryptoType = filters.cryptocurrency;
        }

        if (filters.network && filters.network !== 'all') {
          apiParams.network = filters.network;
        }

        console.log('📤 API params being sent:', apiParams);

        // Use the payments API
        const response = await paymentsAPI.getAll(apiParams);

        console.log('📦 Payments API response:', response);

        if (response.success) {
          const paymentsData = response.payments || [];
          
          // Transform payment data to ensure consistent format with network support
          const transformedPayments = paymentsData.map(payment => ({
            ...payment,
            payId: payment.payId || payment.id,
            customerName: payment.customerName || 'Unknown Customer',
            customerEmail: payment.customerEmail || 'No email',
            amountUSD: payment.amountUSD || payment.amount || 0,
            amountCrypto: payment.amountCrypto || 0,
            cryptoType: payment.cryptoType || payment.cryptoCurrency || 'Unknown',
            cryptoSymbol: payment.cryptoSymbol || payment.cryptoType || payment.cryptoCurrency || 'Unknown',
            network: payment.network || 'Unknown',
            status: payment.status || 'pending',
            createdAt: payment.createdAt || payment.timestamp || new Date().toISOString()
          }));
          
          setPayments(transformedPayments);
          
          // Calculate stats from real data
          setStats({
            total: transformedPayments.length,
            completed: transformedPayments.filter(p => p.status === 'completed').length,
            pending: transformedPayments.filter(p => p.status === 'pending').length,
            failed: transformedPayments.filter(p => p.status === 'failed').length,
          });
          
          console.log('✅ Payments loaded successfully:', transformedPayments.length);
          
        } else if (response.isEmpty || response.isNewUser) {
          // Handle new user with no payments
          console.log('👤 New user with no payments');
          setPayments([]);
          setStats({ total: 0, completed: 0, pending: 0, failed: 0 });
        } else {
          console.error('❌ API returned error:', response.message);
          setError(response.message || 'Failed to fetch payments');
        }

      } catch (err) {
        console.error("❌ Error fetching payments:", err);
        
        // Check if it's a network error or authentication error
        if (err.message.includes('403') || err.message.includes('401')) {
          setError('Authentication required. Please log in again.');
        } else if (err.message.includes('API_PAUSED')) {
          setError('Payment processing is currently paused. Please contact support to reactivate your account.');
        } else if (err.message.includes('404')) {
          // For new users, show empty state instead of error
          console.log('👤 No payments found (new user)');
          setPayments([]);
          setStats({ total: 0, completed: 0, pending: 0, failed: 0 });
        } else {
          setError('Failed to load payments. Please try refreshing the page.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [currentPage, itemsPerPage, filters, sortConfig]);

    // --- CLIENT-SIDE COMPUTATIONS (Filtering, Sorting, Pagination) ---
    const filteredAndSortedPayments = useMemo(() => {
        let filtered = [...payments];

        // Apply filters
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(p =>
                p.payId.toLowerCase().includes(searchTerm) ||
                p.customerName.toLowerCase().includes(searchTerm) ||
                p.customerEmail.toLowerCase().includes(searchTerm)
            );
        }
        if (filters.status !== 'all') {
            filtered = filtered.filter(p => p.status === filters.status);
        }
        if (filters.cryptocurrency !== 'all') {
            filtered = filtered.filter(p => p.cryptoType === filters.cryptocurrency);
        }
        if (filters.network !== 'all') {
            filtered = filtered.filter(p => p.network === filters.network);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [payments, filters, sortConfig]);

    const totalPages = Math.ceil(filteredAndSortedPayments.length / itemsPerPage);
    const paginatedPayments = filteredAndSortedPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // --- EVENT HANDLERS ---
    const handleSort = (key) => {
        const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig({ key, direction });
    };

    const handleSelectPayment = (payId) => {
        setSelectedPayments(prev =>
            prev.includes(payId) ? prev.filter(id => id !== payId) : [...prev, payId]
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedPayments(paginatedPayments.map(p => p.payId));
        } else {
            setSelectedPayments([]);
        }
    };
    
    const handleViewDetails = (payment) => {
        console.log('👁️ Opening payment details for:', payment.payId);
        // Use the same URL pattern as Recent Activity
        navigate(`/dashboard/payment-details-modal?id=${payment.payId || payment.id}`);
    };

    const handleCreatePaymentLink = () => setIsPaymentLinkModalOpen(true);
    const handleBulkExport = () => alert(`Exporting ${selectedPayments.length} payments...`);
    
    const handlePaymentLinkSuccess = (link) => {
        console.log('Payment link created:', link);
        // You could show a success notification here
    };

    // --- HELPER FUNCTIONS ---
    const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const getCryptoIcon = (cryptoType) => {
        // Return appropriate icon name based on crypto type
        if (cryptoType === 'Bitcoin') return 'Bitcoin';
        if (cryptoType === 'Ethereum') return 'Activity'; // Placeholder
        return 'CreditCard';
    };
    const getStatusComponent = (status) => {
        const config = {
            completed: { color: 'bg-success-100 text-success-700', icon: 'CheckCircle' },
            pending: { color: 'bg-warning-100 text-warning-700', icon: 'Clock' },
            failed: { color: 'bg-error-100 text-error-700', icon: 'XCircle' },
        }[status] || { color: 'bg-secondary-100 text-secondary-700', icon: 'HelpCircle' };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <Icon name={config.icon} size={12} className="mr-1.5" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // --- RENDER LOGIC ---
    if (loading) return <div className="text-center p-12 dark:bg-gray-900 dark:text-white min-h-screen flex items-center justify-center">Loading payments...</div>;
    if (error) return <div className="text-center p-12 text-error dark:bg-gray-900 min-h-screen flex items-center justify-center">{error}</div>;

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-background dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary dark:text-white">Payments Management</h1>
                        <p className="text-text-secondary dark:text-gray-400 mt-1">Monitor and manage all cryptocurrency transactions.</p>
                    </div>
                    <div className="flex items-center space-x-3 mt-4 md:mt-0">
                         {selectedPayments.length > 0 && (
                             <button onClick={handleBulkExport} className="flex items-center space-x-2 px-4 py-2 bg-secondary-100 dark:bg-gray-700 text-text-primary dark:text-white rounded-lg hover:bg-secondary-200 dark:hover:bg-gray-600">
                                 <Icon name="Download" size={16} />
                                 <span>Export ({selectedPayments.length})</span>
                             </button>
                         )}
                        <button onClick={handleCreatePaymentLink} className="flex items-center space-x-2 px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600">
                            <Icon name="Plus" size={16} />
                            <span>Create Payment Link</span>
                        </button>
                    </div>
                </div>
                 {/* Statistics Cards */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-border dark:border-gray-700"> <p className="text-text-secondary dark:text-gray-400 text-sm">Total Payments</p> <p className="text-2xl font-semibold dark:text-white">{stats.total}</p> </div>
                     <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-border dark:border-gray-700"> <p className="text-text-secondary dark:text-gray-400 text-sm">Completed</p> <p className="text-2xl font-semibold text-success">{stats.completed}</p> </div>
                     <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-border dark:border-gray-700"> <p className="text-text-secondary dark:text-gray-400 text-sm">Pending</p> <p className="text-2xl font-semibold text-warning">{stats.pending}</p> </div>
                     <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-border dark:border-gray-700"> <p className="text-text-secondary dark:text-gray-400 text-sm">Failed</p> <p className="text-2xl font-semibold text-error">{stats.failed}</p> </div>
                 </div>
            </div>

            {/* Filters */}
            <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search by ID, name, or email..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full px-4 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white dark:placeholder-gray-500"
                    />
                    <select value={filters.status} onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))} className="w-full px-4 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white">
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                    <select value={filters.cryptocurrency} onChange={(e) => setFilters(prev => ({...prev, cryptocurrency: e.target.value}))} className="w-full px-4 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white">
                        <option value="all">All Crypto</option>
                        <option value="BTC">Bitcoin</option>
                        <option value="ETH">Ethereum</option>
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="MATIC">MATIC</option>
                        <option value="SOL">Solana</option>
                    </select>
                    <select value={filters.network} onChange={(e) => setFilters(prev => ({...prev, network: e.target.value}))} className="w-full px-4 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white">
                        <option value="all">All Networks</option>
                        <option value="Bitcoin">Bitcoin</option>
                        <option value="Ethereum">Ethereum</option>
                        <option value="Polygon">Polygon</option>
                        <option value="BSC">BSC</option>
                        <option value="Tron">Tron</option>
                        <option value="Solana">Solana</option>
                    </select>
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-gray-700">
                        <thead className="bg-background dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3"><input type="checkbox" onChange={handleSelectAll} checked={selectedPayments.length === paginatedPayments.length && paginatedPayments.length > 0} className="dark:bg-gray-700 dark:border-gray-600" /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('payId')}>Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('amountUSD')}>Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider">Crypto & Network</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface dark:bg-gray-800 divide-y divide-border dark:divide-gray-700">
                            {paginatedPayments.length > 0 ? paginatedPayments.map((payment) => (
                                <tr key={payment.payId || payment.id} className="hover:bg-secondary-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedPayments.includes(payment.payId || payment.id)} 
                                        onChange={() => handleSelectPayment(payment.payId || payment.id)}
                                        className="dark:bg-gray-700 dark:border-gray-600" 
                                      />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm dark:text-gray-300">{payment.payId || payment.id}</td>
                                    <td className="px-6 py-4">
                                      <div>
                                        <div className="font-medium dark:text-white">{payment.customerName}</div>
                                        <div className="text-xs text-text-secondary dark:text-gray-400">{payment.customerEmail}</div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div>
                                        <div className="font-medium dark:text-white">${(payment.amountUSD || 0).toFixed(2)}</div>
                                        <div className="text-xs text-text-secondary dark:text-gray-400">
                                          {payment.amountCrypto || 0} {payment.cryptoSymbol}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div>
                                        <div className="font-medium dark:text-white">{payment.cryptoType}</div>
                                        <div className="text-xs text-text-secondary dark:text-gray-400">{payment.network}</div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">{getStatusComponent(payment.status)}</td>
                                    <td className="px-6 py-4 text-sm text-text-secondary dark:text-gray-400">
                                      {formatDate(payment.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <button 
                                        onClick={() => handleViewDetails(payment)} 
                                        className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-gray-700 text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
                                      >
                                        <Icon name="Eye" size={16} />
                                      </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="8" className="text-center py-12 dark:text-gray-400">No payments match the current filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 flex items-center justify-between border-t border-border dark:border-gray-700">
                        <p className="text-sm text-text-secondary dark:text-gray-400">Page {currentPage} of {totalPages}</p>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg text-sm disabled:opacity-50 dark:text-white dark:hover:bg-gray-700">Previous</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg text-sm disabled:opacity-50 dark:text-white dark:hover:bg-gray-700">Next</button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Modals */}
            {isModalOpen && selectedPayment && (
                <MockModal title="Payment Details" onClose={() => setIsModalOpen(false)}>
                    <pre className="text-xs bg-secondary-100 dark:bg-gray-700 p-4 rounded-lg overflow-auto dark:text-white">
                        {JSON.stringify(selectedPayment, null, 2)}
                    </pre>
                </MockModal>
            )}
            
            <PaymentLinkModal
                isOpen={isPaymentLinkModalOpen}
                onClose={() => setIsPaymentLinkModalOpen(false)}
                onSuccess={handlePaymentLinkSuccess}
            />
        </div>
    );
};

export default PaymentsManagement;