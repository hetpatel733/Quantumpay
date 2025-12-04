import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { notificationSettingsAPI } from 'utils/api';

const NotificationSettings = () => {
  const [emailNotifications, setEmailNotifications] = useState({
    paymentReceived: false,
    paymentFailed: false,
    dailySummary: false,
    weeklySummary: false,
    securityAlerts: false,
    systemUpdates: false,
    marketingEmails: false
  });

  const [pushNotifications, setPushNotifications] = useState({
    enabled: false,
    paymentAlerts: false,
    securityAlerts: false,
    systemAlerts: false
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await notificationSettingsAPI.getSettings();
      
      if (response.success) {
        setEmailNotifications(response.settings.emailNotifications);
        setPushNotifications(response.settings.pushNotifications);
        setHasUnsavedChanges(false);
      } else {
        setError(response.message || 'Failed to load notification settings');
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailToggle = (setting) => {
    setEmailNotifications(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    setHasUnsavedChanges(true);
  };

  const handlePushToggle = (setting) => {
    setPushNotifications(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    setHasUnsavedChanges(true);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await notificationSettingsAPI.updateSettings({
        emailNotifications,
        pushNotifications
      });

      if (response.success) {
        setSuccessMessage('Notification settings saved successfully');
        setHasUnsavedChanges(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.message || 'Failed to save notification settings');
      }
    } catch (err) {
      console.error('Error saving notification settings:', err);
      setError('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await notificationSettingsAPI.resetSettings();

      if (response.success) {
        setEmailNotifications(response.settings.emailNotifications);
        setPushNotifications(response.settings.pushNotifications);
        setSuccessMessage('Settings reset to defaults');
        setHasUnsavedChanges(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.message || 'Failed to reset settings');
      }
    } catch (err) {
      console.error('Error resetting settings:', err);
      setError('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary dark:text-white">Notification Settings</h2>
        <p className="text-text-secondary dark:text-gray-400 mt-1">
          Configure your email and push notification preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="CheckCircle" size={16} color="#10b981" />
            <p className="text-sm text-success-700">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} color="#ef4444" />
            <p className="text-sm text-error-700">{error}</p>
          </div>
        </div>
      )}

      {/* Email Notifications */}
      <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Email Notifications</h3>
        <p className="text-text-secondary dark:text-gray-400 text-sm mb-4">
          Choose which email notifications you'd like to receive
        </p>
        
        <div className="space-y-4">
          {/* Payment Notifications */}
          <div>
            <h4 className="font-medium text-text-primary dark:text-white mb-3">Payment Events</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-white">
                    Payment Received
                  </label>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Get notified when a payment is successfully received
                  </p>
                </div>
                <button
                  onClick={() => handleEmailToggle('paymentReceived')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                    ${emailNotifications.paymentReceived ? 'bg-success' : 'bg-secondary-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                      ${emailNotifications.paymentReceived ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-white">
                    Payment Failed
                  </label>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Get notified when a payment fails or is rejected
                  </p>
                </div>
                <button
                  onClick={() => handleEmailToggle('paymentFailed')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                    ${emailNotifications.paymentFailed ? 'bg-success' : 'bg-secondary-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                      ${emailNotifications.paymentFailed ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Summary Reports */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-text-primary dark:text-white mb-3">Summary Reports</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-white">
                    Daily Summary
                  </label>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Daily report of all payment activities
                  </p>
                </div>
                <button
                  onClick={() => handleEmailToggle('dailySummary')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                    ${emailNotifications.dailySummary ? 'bg-success' : 'bg-secondary-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                      ${emailNotifications.dailySummary ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-white">
                    Weekly Summary
                  </label>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Weekly report with analytics and insights
                  </p>
                </div>
                <button
                  onClick={() => handleEmailToggle('weeklySummary')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                    ${emailNotifications.weeklySummary ? 'bg-success' : 'bg-secondary-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                      ${emailNotifications.weeklySummary ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* System Notifications */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-text-primary dark:text-white mb-3">System & Security</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-white">
                    Security Alerts
                  </label>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Important security notifications and login alerts
                  </p>
                </div>
                <button
                  onClick={() => handleEmailToggle('securityAlerts')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                    ${emailNotifications.securityAlerts ? 'bg-success' : 'bg-secondary-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                      ${emailNotifications.securityAlerts ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-white">
                    System Updates
                  </label>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Platform updates and maintenance notifications
                  </p>
                </div>
                <button
                  onClick={() => handleEmailToggle('systemUpdates')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                    ${emailNotifications.systemUpdates ? 'bg-success' : 'bg-secondary-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                      ${emailNotifications.systemUpdates ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-text-primary dark:text-white">
                    Marketing Emails
                  </label>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Product updates, tips, and promotional content
                  </p>
                </div>
                <button
                  onClick={() => handleEmailToggle('marketingEmails')}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                    ${emailNotifications.marketingEmails ? 'bg-success' : 'bg-secondary-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                      ${emailNotifications.marketingEmails ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">Push Notifications</h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm mt-1">
              Configure mobile and browser push notifications
            </p>
          </div>
          <button
            onClick={() => handlePushToggle('enabled')}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
              ${pushNotifications.enabled ? 'bg-success' : 'bg-secondary-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                ${pushNotifications.enabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {pushNotifications.enabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-white">
                  Payment Alerts
                </label>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  Instant notifications for payment events
                </p>
              </div>
              <button
                onClick={() => handlePushToggle('paymentAlerts')}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                  ${pushNotifications.paymentAlerts ? 'bg-success' : 'bg-secondary-300'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                    ${pushNotifications.paymentAlerts ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-white">
                  Security Alerts
                </label>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  Critical security notifications
                </p>
              </div>
              <button
                onClick={() => handlePushToggle('securityAlerts')}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                  ${pushNotifications.securityAlerts ? 'bg-success' : 'bg-secondary-300'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                    ${pushNotifications.securityAlerts ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-white">
                  System Alerts
                </label>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  System maintenance and updates
                </p>
              </div>
              <button
                onClick={() => handlePushToggle('systemAlerts')}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                  ${pushNotifications.systemAlerts ? 'bg-success' : 'bg-secondary-300'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                    ${pushNotifications.systemAlerts ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Changes */}
      <div className="flex justify-end space-x-3">
        <button 
          onClick={resetToDefaults}
          disabled={saving}
          className="
            px-4 py-2 border border-border dark:border-gray-700 rounded-lg
            text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white
            hover:bg-secondary-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-smooth
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Reset to Defaults
        </button>
        <button 
          onClick={saveSettings}
          disabled={saving}
          className={`
            px-6 py-2 rounded-lg transition-smooth
            flex items-center space-x-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasUnsavedChanges 
              ? 'bg-warning text-white hover:bg-warning-700' 
              : 'bg-primary dark:bg-teal-500 text-white hover:bg-primary-700 dark:hover:bg-teal-600'
            }
          `}
        >
          {saving && <Icon name="Loader2" size={16} color="currentColor" className="animate-spin" />}
          <Icon name="Save" size={16} color="currentColor" />
          <span>
            {saving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes*' : 'Save Settings'}
          </span>
        </button>
      </div>

      {hasUnsavedChanges && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
          <p className="text-sm text-warning-700">
            * You have unsaved changes. Click "Save Changes" to apply them.
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
