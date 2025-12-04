// src/pages/portfolio-management/components/ItemCard.jsx
import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { apiKeysAPI } from 'utils/api';

const ItemCard = ({ item, onEdit, onDelete, onToggleStatus }) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [loadingApiKey, setLoadingApiKey] = useState(true);
  
  const baseUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;

  // Fetch the user's first active API key to generate default payment link
  useEffect(() => {
    const fetchDefaultApiKey = async () => {
      try {
        setLoadingApiKey(true);
        console.log('🔑 Fetching API keys for payment link generation...');
        
        const response = await apiKeysAPI.getAll();
        console.log('📦 API Keys response:', response);
        
        if (response.success && response.apiKeys && response.apiKeys.length > 0) {
          const activeKey = response.apiKeys.find(key => key.isActive);
          if (activeKey) {
            console.log('✅ Found active API key:', activeKey.key.substring(0, 10) + '...');
            setApiKey(activeKey.key);
          } else {
            console.warn('⚠️ No active API keys found');
            setApiKey(null);
          }
        } else {
          console.warn('⚠️ No API keys found in response');
          setApiKey(null);
        }
      } catch (error) {
        console.error('❌ Failed to fetch API keys:', error);
        setApiKey(null);
      } finally {
        setLoadingApiKey(false);
      }
    };

    fetchDefaultApiKey();
  }, []);
  
  // Generate payment link with actual API key using frontend URL
  const paymentLink = item.orderId && apiKey ? 
    `${baseUrl}/payment/${apiKey}/${item.orderId}` : 
    null;

  const copyPaymentLink = () => {
    if (!item.status || item.status === 'inactive') {
      alert('This product is deactivated. Please activate it before generating payment links.');
      return;
    }
    
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
      console.log('📋 Payment link copied:', paymentLink);
    } else {
      alert('Payment link not available. Please ensure you have an active API key.');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCryptoIcon = (type) => {
    switch (type) {
      case 'Bitcoin':
      case 'BTC':
        return 'Bitcoin';
      case 'Ethereum':
      case 'ETH':
        return 'Zap';
      case 'USDT': 
      case 'USDC':
        return 'DollarSign';
      case 'MATIC':
        return 'Triangle';
      case 'SOL':
        return 'Sun';
      default:
        return 'Coins';
    }
  };

  const handleDeleteClick = () => {
    if (isConfirmingDelete) {
      onDelete();
    } else {
      setIsConfirmingDelete(true);
      // Auto reset after 3 seconds
      setTimeout(() => setIsConfirmingDelete(false), 3000);
    }
  };

  return (
    <div className="
      bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg overflow-hidden
      hover:shadow-md transition-smooth flex flex-col
    ">
      {/* Status badge */}
      <div className="absolute top-3 right-3">
        <span className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          ${item.status === 'active' ? 'bg-success-100 dark:bg-green-900/30 text-success' : 'bg-secondary-100 dark:bg-gray-700 text-text-secondary dark:text-gray-400'}
        `}>
          <Icon 
            name={item.status === 'active' ? 'CheckCircle' : 'XCircle'} 
            size={12} 
            color="currentColor"
            className="mr-1"
          />
          {item.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Product Image */}
      <div className="relative w-full h-48 bg-secondary-50 dark:bg-gray-900 overflow-hidden">
        <Image 
          src={item?.image} 
          alt={item?.name} 
          className="w-full h-full object-cover" 
        />
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-1 line-clamp-1">
          {item?.name}
        </h3>
        
        <p className="text-text-secondary dark:text-gray-400 text-sm mb-3 line-clamp-2 flex-1">
          {item?.description}
        </p>
        
        <div className="space-y-2">
          {/* Price */}
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400 text-sm">Price:</span>
            <div className="text-right">
              <span className="font-medium text-text-primary dark:text-white">
                ${item?.price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          {/* Crypto Price */}
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400 text-sm">Crypto:</span>
            <div className="flex items-center space-x-1">
              <Icon 
                name={getCryptoIcon(item?.cryptoPrice?.type)} 
                size={14} 
                color="currentColor" 
                className="text-text-secondary dark:text-gray-400"
              />
              <span className="text-text-primary dark:text-white text-sm font-mono">
                {item?.cryptoPrice?.amount} {item?.cryptoPrice?.symbol}
              </span>
            </div>
          </div>
          
          {/* Sales */}
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400 text-sm">Sales:</span>
            <span className="text-text-primary dark:text-white">
              {item?.salesCount || 0}
            </span>
          </div>
          
          {/* Created Date */}
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-gray-400 text-sm">Added:</span>
            <span className="text-text-secondary dark:text-gray-400 text-sm">
              {formatDate(item?.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Link Section */}
      {item.orderId && (
        <div className="mb-4 p-3 bg-background dark:bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-secondary dark:text-gray-400">Payment Link:</span>
            <button
              onClick={copyPaymentLink}
              disabled={!paymentLink || loadingApiKey || item.status === 'inactive'}
              className={`flex items-center space-x-1 text-xs transition-smooth ${
                paymentLink && !loadingApiKey && item.status === 'active'
                  ? 'text-primary dark:text-teal-400 hover:text-primary-700 dark:hover:text-teal-300' 
                  : 'text-text-secondary dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Icon name={isLinkCopied ? "Check" : "Copy"} size={12} color="currentColor" />
              <span>{isLinkCopied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className="text-xs font-mono text-text-primary dark:text-white bg-surface dark:bg-gray-800 border border-border dark:border-gray-600 rounded px-2 py-1 truncate">
            {loadingApiKey ? 'Loading API key...' : 
             item.status === 'inactive' ? 'Product deactivated - no payment link' :
             paymentLink ? paymentLink : 
             'No API key available'}
          </div>
          {!loadingApiKey && !apiKey && item.status === 'active' && (
            <p className="text-xs text-warning mt-1">
              ⚠️ Create an API key to generate payment links
            </p>
          )}
          {item.status === 'inactive' && (
            <p className="text-xs text-error mt-1">
              ⚠️ Activate this product to enable payment processing
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border dark:border-gray-700 bg-background dark:bg-gray-900">
        <button
          onClick={onToggleStatus}
          className="
            flex items-center space-x-1 px-2 py-1
            text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white
            hover:bg-secondary-100 dark:hover:bg-gray-700 rounded transition-smooth
          "
          title={item.status === 'active' ? 'Deactivate' : 'Activate'}
        >
          <Icon 
            name={item.status === 'active' ? 'EyeOff' : 'Eye'} 
            size={16} 
            color="currentColor" 
          />
          <span className="text-sm">
            {item.status === 'active' ? 'Deactivate' : 'Activate'}
          </span>
        </button>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={onEdit}
            className="
              p-2 hover:bg-secondary-100 dark:hover:bg-gray-700 rounded
              text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-teal-400
              transition-smooth
            "
            title="Edit item"
          >
            <Icon name="Edit" size={16} color="currentColor" />
          </button>
          
          <button
            onClick={handleDeleteClick}
            className={`
              p-2 rounded transition-smooth
              ${isConfirmingDelete 
                ? 'bg-error-100 dark:bg-red-900/30 text-error hover:bg-error-200 dark:hover:bg-red-900/50' :'hover:bg-secondary-100 dark:hover:bg-gray-700 text-text-secondary dark:text-gray-400 hover:text-error'}
            `}
            title={isConfirmingDelete ? 'Confirm delete' : 'Delete item'}
          >
            <Icon name={isConfirmingDelete ? 'AlertTriangle' : 'Trash2'} size={16} color="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;