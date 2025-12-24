import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { paymentConfigAPI } from 'utils/api';
import { useAuth } from 'contexts/AuthContext';
import './PaymentConfiguration.css';

const PaymentConfiguration = ({ userData }) => {
  const { userData: authData } = useAuth();
  const [config, setConfig] = useState({ wallets: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [walletAddresses, setWalletAddresses] = useState({});
  const [enabledCryptos, setEnabledCryptos] = useState({});

  // Supported cryptocurrencies with multiple blockchain networks
  const supportedCryptos = [
    // Native Coins
    { id: 'BTC', name: 'Bitcoin', symbol: 'BTC', network: 'Bitcoin', image: '/images/Coins/BTC.webp' },
    { id: 'ETH', name: 'Ethereum', symbol: 'ETH', network: 'Ethereum', image: '/images/Coins/ETH.webp' },
    { id: 'BNB', name: 'Binance Coin', symbol: 'BNB', network: 'BSC', image: '/images/Coins/bnb.webp' },
    { id: 'SOL', name: 'Solana', symbol: 'SOL', network: 'Solana', image: '/images/Coins/SOL.webp' },
    { id: 'POL', name: 'Polygon Token', symbol: 'POL', network: 'Polygon', image: '/images/Coins/MATIC.webp' },
    
    // USDT across multiple chains
    { id: 'USDT_ETHEREUM', name: 'Tether', symbol: 'USDT', network: 'Ethereum', image: '/images/Coins/USDT.webp' },
    { id: 'USDT_SOLANA', name: 'Tether', symbol: 'USDT', network: 'Solana', image: '/images/Coins/USDT.webp' },
    { id: 'USDT_TRON', name: 'Tether', symbol: 'USDT', network: 'TRON', image: '/images/Coins/USDT.webp' },
    { id: 'USDT_BSC', name: 'Tether', symbol: 'USDT', network: 'BSC', image: '/images/Coins/USDT.webp' },
    { id: 'USDT_POLYGON', name: 'Tether', symbol: 'USDT', network: 'Polygon', image: '/images/Coins/USDT.webp' },
    
    // USDC across multiple chains
    { id: 'USDC_ETHEREUM', name: 'USD Coin', symbol: 'USDC', network: 'Ethereum', image: '/images/Coins/USDC.png' },
    { id: 'USDC_SOLANA', name: 'USD Coin', symbol: 'USDC', network: 'Solana', image: '/images/Coins/USDC.png' },
    { id: 'USDC_TRON', name: 'USD Coin', symbol: 'USDC', network: 'TRON', image: '/images/Coins/USDC.png' },
    { id: 'USDC_BSC', name: 'USD Coin', symbol: 'USDC', network: 'BSC', image: '/images/Coins/USDC.png' },
    { id: 'USDC_POLYGON', name: 'USD Coin', symbol: 'USDC', network: 'Polygon', image: '/images/Coins/USDC.png' }
  ];

  useEffect(() => {
    if (authData?.id || userData?.id) {
      fetchConfiguration();
    }
  }, [authData?.id, userData?.id]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      setError('');

      const userId = authData?.id || userData?.id;
      if (!userId) {
        setError('User ID not found');
        return;
      }

      const response = await paymentConfigAPI.getConfig(userId);

      if (response.success) {
        setConfig(response.config || { wallets: {} });
        const wallets = response.config?.wallets || {};
        setWalletAddresses(wallets);
        
        // Set enabled state based on whether wallet has an address
        const enabled = {};
        Object.keys(wallets).forEach(currency => {
          if (wallets[currency] && wallets[currency].trim()) {
            enabled[currency] = true;
          }
        });
        setEnabledCryptos(enabled);
        
        //console.log('✅ Payment configuration loaded');
      } else {
        setError(response.message || 'Failed to load configuration');
      }
    } catch (err) {
      console.error('❌ Error loading configuration:', err);
      setError('Failed to load payment configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCrypto = (currency) => {
    setEnabledCryptos(prev => ({
      ...prev,
      [currency]: !prev[currency]
    }));
    // Keep wallet address in database for future showcase
  };

  const handleWalletChange = (currency, value) => {
    setWalletAddresses(prev => ({
      ...prev,
      [currency]: value
    }));
  };

  const getEnabledCount = () => {
    return Object.values(enabledCryptos).filter(Boolean).length;
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate that all enabled currencies have addresses
      for (const [currency, isEnabled] of Object.entries(enabledCryptos)) {
        if (isEnabled) {
          const address = walletAddresses[currency]?.trim();
          if (!address) {
            const cryptoName = supportedCryptos.find(c => c.id === currency)?.symbol || currency;
            setError(`Please provide a wallet address for ${cryptoName} before saving`);
            setSaving(false);
            return;
          }
        }
      }

      const userId = authData?.id || userData?.id;
      if (!userId) {
        setError('User ID not found');
        return;
      }

      // Only save wallet addresses for enabled currencies
      const walletsToSave = {};
      Object.entries(walletAddresses).forEach(([currency, address]) => {
        if (enabledCryptos[currency] && address && address.trim()) {
          walletsToSave[currency] = address.trim();
        }
      });

      const response = await paymentConfigAPI.updateConfig(userId, {
        wallets: walletsToSave
      });

      if (response.success) {
        setConfig(response.config);
        // Update local state to match saved data (remove disabled currencies)
        setWalletAddresses(walletsToSave);
        setSuccess('✅ Configuration saved successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('❌ Error saving configuration:', err);
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    const originalWallets = config.wallets || {};

    // Check wallet address differences
    const walletKeys = new Set([...Object.keys(walletAddresses), ...Object.keys(originalWallets)]);
    for (const key of walletKeys) {
      const currentVal = (walletAddresses[key] || '').trim();
      const originalVal = (originalWallets[key] || '').trim();
      if (currentVal !== originalVal) return true;
    }

    // Check enabled toggles vs initial state (initial = wallet existed)
    const toggleKeys = new Set([...Object.keys(enabledCryptos), ...Object.keys(originalWallets)]);
    for (const key of toggleKeys) {
      const initialEnabled = Boolean((originalWallets[key] || '').toString().trim());
      const currentEnabled = Boolean(enabledCryptos[key]);
      if (initialEnabled !== currentEnabled) return true;
    }

    return false;
  };

  if (loading) {
    return (
      <div className="payment-config-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading payment configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-config-container">
      {/* Header */}
      <div className="config-header">
        <div className="header-content">
          <h1 className="config-title">Payment Configurations</h1>
          <p className="config-subtitle">Manage wallet addresses for cryptocurrency payments</p>
        </div>
        <div className="header-stats">
          <div className="stat-box">
            <div className="stat-value">{getEnabledCount()}</div>
            <div className="stat-label">Enabled</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{supportedCryptos.length}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          <Icon name="AlertCircle" size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="alert alert-success">
          <Icon name="CheckCircle" size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Unsaved Changes Warning */}
      {hasChanges() && (
        <div className="alert alert-warning">
          <Icon name="AlertTriangle" size={20} />
          <span>You have unsaved changes. Click "Save Changes" to apply them.</span>
        </div>
      )}

      {/* Save Button at Top - Only show when there are changes */}
      {hasChanges() && (
        <div className="actions-footer" style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? (
              <>
                <div className="btn-spinner"></div>
                Saving...
              </>
            ) : (
              <>
                <Icon name="Save" size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {/* Wallet Addresses */}
      <div className="cryptos-section">
        {supportedCryptos.map(crypto => {
          const isEnabled = enabledCryptos[crypto.id] || false;
          
          return (
            <div key={crypto.id} className="crypto-card">
              <div className="crypto-header" onClick={() => isEnabled && handleToggleCrypto(crypto.id)} style={{ cursor: isEnabled ? 'pointer' : 'default' }}>
                <div className="crypto-info">
                  <img src={crypto.image} alt={crypto.symbol} className="crypto-icon" />
                  <div className="crypto-details">
                    <h2 className="crypto-name">{crypto.name}</h2>
                    <p className="crypto-networks">{crypto.network} Network</p>
                  </div>
                </div>
                <div className="header-actions">
                  <span className="crypto-symbol" style={{ marginRight: '1rem' }}>{crypto.symbol}</span>
                  <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggleCrypto(crypto.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {isEnabled && (
                <div className="crypto-networks-section">
                  <div className="network-item">
                    <div className="address-input-group">
                      <label className="label">
                        Wallet Address
                        <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={`Enter your ${crypto.symbol} wallet address`}
                        value={walletAddresses[crypto.id] || ''}
                        onChange={(e) => handleWalletChange(crypto.id, e.target.value)}
                        className="address-input"
                      />
                      {walletAddresses[crypto.id] && walletAddresses[crypto.id].length >= 20 && (
                        <div className="address-preview">
                          <Icon name="CheckCircle" size={16} className="check-icon" />
                          <span>{walletAddresses[crypto.id].substring(0, 10)}...{walletAddresses[crypto.id].substring(walletAddresses[crypto.id].length - 8)}</span>
                        </div>
                      )}
                      {walletAddresses[crypto.id] && walletAddresses[crypto.id].length > 0 && walletAddresses[crypto.id].length < 20 && (
                        <div className="address-error">
                          <Icon name="AlertCircle" size={16} className="error-icon" />
                          <span>Address appears to be invalid</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="info-box">
        <Icon name="Info" size={20} />
        <div className="info-content">
          <h4>How it works</h4>
          <p>
            Configure your cryptocurrency wallet addresses to receive payments. 
            Customers will be able to send payments to these addresses when they select the corresponding cryptocurrency.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfiguration;
