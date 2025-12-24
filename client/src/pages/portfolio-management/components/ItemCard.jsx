// src/pages/portfolio-management/components/ItemCard.jsx
import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { apiKeysAPI } from 'utils/api';
import { useToast } from 'contexts/ToastContext';

const ItemCard = ({ item, onEdit, onDelete, onToggleStatus, userData }) => {
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [loadingApiKey, setLoadingApiKey] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const { showToast } = useToast();
  
  const baseUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;

  // Fetch the user's first active API key to generate default payment link
  useEffect(() => {
    const fetchDefaultApiKey = async () => {
      try {
        setLoadingApiKey(true);
        
        const userId = userData?.id;
        if (!userId) {
          console.warn('⚠️ No user ID available');
          setApiKey(null);
          setLoadingApiKey(false);
          return;
        }
        
        const response = await apiKeysAPI.getAll(userId);
        
        if (response.success && response.apiKeys && response.apiKeys.length > 0) {
          const activeKey = response.apiKeys.find(key => key.isActive);
          if (activeKey) {
            setApiKey(activeKey.key);
          } else {
            setApiKey(null);
          }
        } else {
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
  }, [userData?.id]);
  
  // Generate payment link with actual API key using frontend URL
  const paymentLink = item.productId && apiKey ? 
    `${baseUrl}/payment/${apiKey}/${item.productId}` : 
    null;

  const copyPaymentLink = (e) => {
    e?.stopPropagation();
    
    if (!item.status || item.status === 'inactive') {
      showToast('This product is deactivated. Please activate it before generating payment links.', 'warning');
      return;
    }
    
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
      showToast('Payment link copied to clipboard!', 'success');
    } else if (!apiKey) {
      showToast('No active API key found. Please create an API key in Account Settings.', 'error');
    } else {
      showToast('Payment link not available.', 'error');
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

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete && typeof onDelete === 'function') {
      onDelete();
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit && typeof onEdit === 'function') {
      onEdit();
    }
  };

  const handleToggleClick = (e) => {
    e.stopPropagation();
    if (onToggleStatus && typeof onToggleStatus === 'function') {
      onToggleStatus();
    }
  };

  // Truncate payment link for display
  const truncatedLink = paymentLink 
    ? paymentLink.length > 40 
      ? paymentLink.substring(0, 40) + '...' 
      : paymentLink
    : null;

  return (
    <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 overflow-hidden hover:shadow-lg transition-smooth">
      {/* Image */}
      <div className="relative h-48 bg-secondary-100 dark:bg-gray-700 overflow-hidden">
        <Image 
          src={item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=350&fit=crop'} 
          alt={item.name} 
          className="w-full h-full object-cover"
        />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${item.status === 'active' 
              ? 'bg-success text-white' 
              : 'bg-gray-500 text-white'
            }
          `}>
            {item.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Actions Menu */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-smooth"
          >
            <Icon name="MoreVertical" size={16} color="currentColor" className="text-text-primary dark:text-white" />
          </button>

          {showActions && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(false);
                }}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-surface dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                <button
                  onClick={handleEditClick}
                  className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth text-left"
                >
                  <Icon name="Edit" size={16} color="currentColor" className="text-text-primary dark:text-white" />
                  <span className="text-text-primary dark:text-white">Edit</span>
                </button>
                
                <button
                  onClick={handleToggleClick}
                  className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth text-left"
                >
                  <Icon name={item.status === 'active' ? 'EyeOff' : 'Eye'} size={16} color="currentColor" className="text-text-primary dark:text-white" />
                  <span className="text-text-primary dark:text-white">
                    {item.status === 'active' ? 'Deactivate' : 'Activate'}
                  </span>
                </button>
                
                <button
                  onClick={handleDeleteClick}
                  className="w-full flex items-center space-x-2 px-4 py-3 hover:bg-error-50 dark:hover:bg-red-900/20 transition-smooth text-left border-t border-border dark:border-gray-700"
                >
                  <Icon name="Trash2" size={16} color="currentColor" className="text-error dark:text-red-400" />
                  <span className="text-error dark:text-red-400">Delete</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2 truncate">
          {item.name}
        </h3>
        
        <p className="text-text-secondary dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {item.description || 'No description provided'}
        </p>

        {/* Price and Stats */}
        <div className="flex items-center justify-between pb-4 border-b border-border dark:border-gray-700">
          <div>
            <p className="text-xs text-text-secondary dark:text-gray-400">Price</p>
            <p className="text-lg font-bold text-primary dark:text-teal-400">
              ${item.price?.toFixed(2) || '0.00'}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-text-secondary dark:text-gray-400">Sales</p>
            <p className="text-lg font-bold text-text-primary dark:text-white">
              {item.salesCount || 0}
            </p>
          </div>
        </div>

        {/* Payment Link Section - Always Visible */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary dark:text-gray-400 flex items-center space-x-1">
              <Icon name="Link" size={12} color="currentColor" />
              <span>Payment Link</span>
            </span>
            {item.status === 'inactive' && (
              <span className="text-xs text-warning dark:text-yellow-400">Inactive</span>
            )}
          </div>
          
          {loadingApiKey ? (
            <div className="flex items-center space-x-2 text-xs text-text-secondary dark:text-gray-400">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-text-secondary"></div>
              <span>Loading...</span>
            </div>
          ) : paymentLink ? (
            <div className="flex items-center space-x-2">
              <div className="flex-1 min-w-0">
                <code className="block text-xs font-mono bg-secondary-50 dark:bg-gray-900 text-text-secondary dark:text-gray-400 px-2 py-1.5 rounded border border-border dark:border-gray-700 truncate">
                  {truncatedLink}
                </code>
              </div>
              <button
                onClick={copyPaymentLink}
                disabled={item.status === 'inactive'}
                className={`
                  flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth
                  ${item.status === 'inactive'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : isLinkCopied
                    ? 'bg-success text-white'
                    : 'bg-primary dark:bg-teal-500 text-white hover:bg-primary-700 dark:hover:bg-teal-600'
                  }
                `}
              >
                <Icon name={isLinkCopied ? "Check" : "Copy"} size={12} color="currentColor" />
                <span>{isLinkCopied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          ) : (
            <div className="bg-warning-50 dark:bg-yellow-900/20 border border-warning-200 dark:border-yellow-800/50 rounded-lg p-2">
              <p className="text-xs text-warning-700 dark:text-yellow-300 flex items-center space-x-1">
                <Icon name="AlertTriangle" size={12} color="currentColor" />
                <span>No active API key. Create one in Settings.</span>
              </p>
            </div>
          )}
        </div>

        {/* Total Revenue (Optional) */}
        {item.totalVolume > 0 && (
          <div className="mt-3 pt-3 border-t border-border dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary dark:text-gray-400">Total Revenue</span>
              <span className="text-sm font-semibold text-success dark:text-green-400">
                ${item.totalVolume?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemCard;