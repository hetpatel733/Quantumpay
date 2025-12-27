import React, { useState, useEffect } from 'react';
import { useToast } from 'contexts/ToastContext';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

const AdminPanel = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [cronLoading, setCronLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/payments`);
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payId) => {
    try {
      const hash = prompt('Enter transaction hash (optional):');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/payments/${payId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: hash || '' })
      });

      const data = await response.json();
      if (data.success) {
        showToast('Payment approved successfully!', 'success');
        fetchPayments();
      }
    } catch (err) {
      showToast('Failed to approve payment', 'error');
    }
  };

  const handleReject = async (payId) => {
    if (!confirm('Are you sure you want to reject this payment?')) return;

    try {
      const reason = prompt('Enter rejection reason (optional):');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/payments/${payId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Rejected by admin' })
      });

      const data = await response.json();
      if (data.success) {
        showToast('Payment rejected successfully!', 'success');
        fetchPayments();
      }
    } catch (err) {
      showToast('Failed to reject payment', 'error');
    }
  };

  const handleManualCronJob = async () => {
    setCronLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/trigger-cron-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        showToast('Payment verification job executed successfully!', 'success');
        // Refresh payments to see any updates
        setTimeout(() => fetchPayments(), 1000);
      } else {
        showToast(data.message || 'Failed to execute verification job', 'error');
      }
    } catch (err) {
      showToast('Failed to trigger verification job', 'error');
      console.error('Cron job trigger error:', err);
    } finally {
      setCronLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                🔧 Admin Panel - Payment Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Development Mode: Approve or reject payments manually
              </p>
            </div>
            <button
              onClick={handleManualCronJob}
              disabled={cronLoading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              title="Manually trigger payment verification/expiration job"
            >
              {cronLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Run Cron Job</span>
                </>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All ({payments.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'pending' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Pending ({payments.filter(p => p.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'completed' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Completed ({payments.filter(p => p.status === 'completed').length})
            </button>
            <button
              onClick={fetchPayments}
              className="ml-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Payment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Business Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPayments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900 dark:text-white">
                          {payment.payId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {payment.businessEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {payment.customer || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.amount} {payment.currencyId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {payment.status === 'pending' ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleApprove(payment.payId)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleReject(payment.payId)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            {payment.status === 'completed' ? '✓ Approved' : '✗ Rejected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Payments</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{payments.length}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg shadow p-6">
            <div className="text-sm text-yellow-600 dark:text-yellow-300">Pending</div>
            <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
              {payments.filter(p => p.status === 'pending').length}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-lg shadow p-6">
            <div className="text-sm text-green-600 dark:text-green-300">Completed</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {payments.filter(p => p.status === 'completed').length}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900 rounded-lg shadow p-6">
            <div className="text-sm text-red-600 dark:text-red-300">Failed</div>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">
              {payments.filter(p => p.status === 'failed').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
