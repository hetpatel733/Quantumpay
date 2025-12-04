import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { apiRequest } from 'utils/api';
import './PaymentConfiguration.css';

const PaymentConfiguration = () => {
  const [config, setConfig] = useState(null);
  const [supportedCryptos, setSupportedCryptos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedCrypto, setExpandedCrypto] = useState(null);
  const [changes, setChanges] = useState({});

  useEffect(() => {
    fetchConfiguration();
    fetchSupportedCryptos();
  }, []);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiRequest('/api/payment-config', {
        method: 'GET'
      });

      if (response.success) {
        setConfig(response.config);
        console.log('✅ Payment configuration loaded');
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

  const fetchSupportedCryptos = async () => {
    try {
      const response = await apiRequest('/api/payment-config/supported', {
        method: 'GET'
      });

      if (response.success) {
        setSupportedCryptos(response);
        console.log('✅ Supported cryptos loaded');
      }
    } catch (err) {
      console.error('❌ Error loading supported cryptos:', err);
    }
  };

  const handleCryptoToggle = (cryptoType, network, currentState) => {
    const key = `${cryptoType}_${network}`;
    const currentConfig = getCryptoConfig(cryptoType, network);
    
    setChanges(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !currentState,
        address: prev[key]?.address !== undefined ? prev[key].address : currentConfig.address
      }
    }));
  };

  const handleAddressChange = (cryptoType, network, value) => {
    const key = `${cryptoType}_${network}`;
    const currentConfig = getCryptoConfig(cryptoType, network);
    
    setChanges(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        address: value,
        enabled: prev[key]?.enabled !== undefined ? prev[key].enabled : currentConfig.enabled
      }
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Convert changes object to array format
      const updates = Object.entries(changes).map(([key, value]) => {
        const [cryptoType, network] = key.split('_');
        
        // Get current config to preserve existing values
        const currentConfig = config?.cryptoConfigurations.find(
          c => c.coinType === cryptoType && c.network === network
        ) || {};
        
        return {
          cryptoType,
          network,
          enabled: value.enabled !== undefined ? value.enabled : currentConfig.enabled,
          address: value.address !== undefined ? value.address : currentConfig.address
        };
      });

      const response = await apiRequest('/api/payment-config/bulk-update', {
        method: 'POST',
        body: { updates }
      });

      if (response.success) {
        // Update local config state immediately with the saved changes
        setConfig(prevConfig => {
          const updatedConfig = { ...prevConfig };
          
          // Apply all changes to the configuration
          updates.forEach(update => {
            const index = updatedConfig.cryptoConfigurations.findIndex(
              c => c.coinType === update.cryptoType && c.network === update.network
            );
            
            if (index !== -1) {
              updatedConfig.cryptoConfigurations[index] = {
                ...updatedConfig.cryptoConfigurations[index],
                enabled: update.enabled,
                address: update.address || ''
              };
            }
          });
          
          return updatedConfig;
        });

        setSuccess('✅ Configuration saved successfully!');
        setChanges({}); // Clear all pending changes

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

  const getCryptoConfig = (cryptoType, network) => {
    const key = `${cryptoType}_${network}`;
    
    // Get the base config from server
    const baseConfig = config?.cryptoConfigurations.find(
      c => c.coinType === cryptoType && c.network === network
    ) || { enabled: false, address: '' };
    
    // If there are pending changes, merge them
    if (changes[key]) {
      return {
        ...baseConfig,
        enabled: changes[key].enabled !== undefined ? changes[key].enabled : baseConfig.enabled,
        address: changes[key].address !== undefined ? changes[key].address : baseConfig.address
      };
    }
    
    return baseConfig;
  };

  const getEnabledCount = () => {
    if (!config?.cryptoConfigurations) return 0;
    
    let count = 0;
    config.cryptoConfigurations.forEach(crypto => {
      const key = `${crypto.coinType}_${crypto.network}`;
      
      // Check if there's a pending change for this crypto
      if (changes[key] && changes[key].enabled !== undefined) {
        if (changes[key].enabled) count++;
      } else if (crypto.enabled) {
        count++;
      }
    });
    
    return count;
  };

  const groupByCrypto = () => {
    const grouped = {};
    config?.cryptoConfigurations.forEach(crypto => {
      if (!grouped[crypto.coinType]) {
        grouped[crypto.coinType] = [];
      }
      grouped[crypto.coinType].push(crypto);
    });
    return grouped;
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

  const grouped = groupByCrypto();
  const enabledCount = getEnabledCount();

  return (
    <div className="payment-config-container">
      {/* Header */}
      <div className="config-header">
        <div className="header-content">
          <h1 className="config-title">Payment Configurations</h1>
          <p className="config-subtitle">Manage which cryptocurrencies and networks your business accepts</p>
        </div>
        <div className="header-stats">
          <div className="stat-box">
            <div className="stat-value">{enabledCount}</div>
            <div className="stat-label">Enabled</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{config?.cryptoConfigurations.length || 0}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          <Icon name="AlertCircle" size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="close-btn">
            <Icon name="X" size={16} />
          </button>
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
      {Object.keys(changes).length > 0 && (
        <div className="alert alert-warning">
          <Icon name="AlertTriangle" size={20} />
          <span>You have {Object.keys(changes).length} unsaved change{Object.keys(changes).length !== 1 ? 's' : ''}. Click "Save Changes" to apply them.</span>
        </div>
      )}

      {/* Crypto Configurations */}
      <div className="cryptos-section">
        {Object.entries(grouped).map(([cryptoType, cryptos]) => {
          const cryptoInfo = supportedCryptos?.cryptos[cryptoType];
          const isExpanded = expandedCrypto === cryptoType;

          return (
            <div key={cryptoType} className="crypto-card">
              {/* Crypto Header */}
              <div
                className="crypto-header"
                onClick={() => setExpandedCrypto(isExpanded ? null : cryptoType)}
              >
                <div className="crypto-info">
                  {cryptoInfo?.logo && (
                    <img src={cryptoInfo.logo} alt={cryptoType} className="crypto-icon" />
                  )}
                  <div className="crypto-details">
                    <h2 className="crypto-name">{cryptoInfo?.name || cryptoType}</h2>
                    <p className="crypto-networks">
                      {cryptos.length} network{cryptos.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="header-actions">
                  <div className="enabled-badge">
                    {cryptos.filter(c => {
                      const key = `${c.coinType}_${c.network}`;
                      return changes[key]?.enabled !== undefined
                        ? changes[key].enabled
                        : c.enabled;
                    }).length}/{cryptos.length}
                  </div>
                  <Icon
                    name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                    size={20}
                    className="expand-icon"
                  />
                </div>
              </div>

              {/* Crypto Networks (Expanded) */}
              {isExpanded && (
                <div className="crypto-networks-section">
                  {cryptos.map(crypto => {
                    const key = `${crypto.coinType}_${crypto.network}`;
                    const currentConfig = getCryptoConfig(crypto.coinType, crypto.network);
                    const isEnabled = changes[key]?.enabled !== undefined
                      ? changes[key].enabled
                      : crypto.enabled;
                    const address = changes[key]?.address !== undefined
                      ? changes[key].address
                      : crypto.address;
                    const hasChanges = changes[key] !== undefined;

                    const networkInfo = supportedCryptos?.networks[crypto.network];

                    return (
                      <div key={key} className={`network-item ${hasChanges ? 'has-changes' : ''}`}>
                        <div className="network-header">
                          <div className="network-info">
                            <h3 className="network-name">
                              {crypto.network}
                              {hasChanges && (
                                <span className="unsaved-indicator">●</span>
                              )}
                            </h3>
                            {networkInfo?.chainId && (
                              <span className="chain-id">Chain ID: {networkInfo.chainId}</span>
                            )}
                          </div>

                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() =>
                                handleCryptoToggle(
                                  crypto.coinType,
                                  crypto.network,
                                  isEnabled
                                )
                              }
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>

                        {/* Address Input */}
                        {isEnabled && (
                          <div className="address-input-group">
                            <label className="label">
                              Wallet Address
                              <span className="required">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder={`Enter your ${crypto.coinType} wallet address on ${crypto.network}`}
                              value={address}
                              onChange={(e) =>
                                handleAddressChange(
                                  crypto.coinType,
                                  crypto.network,
                                  e.target.value
                                )
                              }
                              className="address-input"
                            />
                            {address && address.length >= 20 && (
                              <div className="address-preview">
                                <Icon name="CheckCircle" size={16} className="check-icon" />
                                <span>{address.substring(0, 10)}...{address.substring(address.length - 8)}</span>
                              </div>
                            )}
                            {address && address.length < 20 && (
                              <div className="address-error">
                                <Icon name="AlertCircle" size={16} className="error-icon" />
                                <span>Address appears to be invalid</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Network Details */}
                        {isEnabled && (
                          <div className="network-details">
                            {networkInfo?.explorerUrl && (
                              <div className="detail-item">
                                <span className="detail-label">Block Explorer:</span>
                                <a href={networkInfo.explorerUrl} target="_blank" rel="noopener noreferrer" className="detail-value">
                                  {networkInfo.explorerUrl}
                                  <Icon name="ExternalLink" size={14} />
                                </a>
                              </div>
                            )}
                            {networkInfo?.contractAddresses?.[crypto.coinType] && (
                              <div className="detail-item">
                                <span className="detail-label">Contract Address:</span>
                                <code className="contract-address">
                                  {networkInfo.contractAddresses[crypto.coinType]}
                                </code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="actions-footer">
        <button
          onClick={() => {
            setChanges({});
            fetchConfiguration();
          }}
          className="btn btn-secondary"
          disabled={Object.keys(changes).length === 0 || saving}
        >
          <Icon name="X" size={18} />
          Cancel
        </button>
        <button
          onClick={handleSaveChanges}
          className="btn btn-primary"
          disabled={Object.keys(changes).length === 0 || saving}
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

      {/* Info Box */}
      <div className="info-box">
        <Icon name="Info" size={20} />
        <div className="info-content">
          <h4>How it works</h4>
          <p>
            Enable the cryptocurrencies and networks you want to accept. Provide your wallet address for each enabled currency.
            Customers can then select from your enabled payment methods during checkout.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfiguration;
