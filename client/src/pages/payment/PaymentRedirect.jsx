import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';

const PaymentRedirect = () => {
  const { api, order_id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Validate that we have the required parameters
    if (!api || !order_id) {
      console.error('❌ Missing API key or Order ID in payment URL');
      navigate('/404');
      return;
    }

    console.log('🔄 Redirecting payment request:', { api, order_id });
    
    // Redirect to coin selection with proper query parameters
    navigate(`/payment/coinselect?api=${api}&order_id=${order_id}`, { replace: true });
  }, [api, order_id, navigate]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Processing payment request...</p>
        <p className="text-sm text-gray-500">Redirecting to payment options</p>
      </div>
    </div>
  );
};

export default PaymentRedirect;
