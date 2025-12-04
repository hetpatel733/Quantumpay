import React, { useState } from 'react';
import Icon from 'components/AppIcon';
import { usersAPI } from 'utils/api';
import { useAuth } from 'contexts/AuthContext';

const SecuritySettings = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const { userData: authData } = useAuth();

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    return errors;
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear specific field errors when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Clear success message when user starts typing
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🔄 Password form submission started');
    console.log('📊 Auth data:', authData);
    
    if (!authData?.id) {
      console.error('❌ No user ID found in auth data');
      setPasswordErrors({
        general: 'User session expired. Please log in again.'
      });
      return;
    }

    // Clear previous errors and success messages
    setPasswordErrors({});
    setSuccessMessage('');

    // Validate form
    const errors = {};
    
    if (!passwordForm.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordForm.newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else {
      const passwordValidationErrors = validatePassword(passwordForm.newPassword);
      if (passwordValidationErrors.length > 0) {
        errors.newPassword = passwordValidationErrors[0];
      }
    }
    
    if (!passwordForm.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Check if new password is same as current password
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation errors:', errors);
      setPasswordErrors(errors);
      return;
    }

    setIsChangingPassword(true);

    try {
      console.log('🔄 Starting password change for user:', authData.id);
      
      const response = await usersAPI.changePassword(authData.id, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      console.log('📤 Password change response:', response);

      if (response.success) {
        // Show success message
        setSuccessMessage('Password changed successfully!');
        
        // Clear form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        console.log('✅ Password changed successfully');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        console.error('❌ Password change failed:', response.message);
        setPasswordErrors({
          general: response.message || 'Failed to change password'
        });
      }
    } catch (error) {
      console.error('❌ Error changing password:', error);
      
      // Handle specific error types
      const errorMessage = error.message || 'Unknown error occurred';
      
      if (errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
        setPasswordErrors({
          general: 'You are not authorized to change this password. Please log in again.'
        });
      } else if (errorMessage.includes('400') || errorMessage.includes('incorrect')) {
        setPasswordErrors({
          currentPassword: 'Current password is incorrect'
        });
      } else if (errorMessage.includes('404')) {
        setPasswordErrors({
          general: 'User not found. Please log in again.'
        });
      } else if (errorMessage.includes('weak') || errorMessage.includes('8 characters')) {
        setPasswordErrors({
          newPassword: 'New password does not meet security requirements'
        });
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        setPasswordErrors({
          general: 'Network error. Please check your connection and try again.'
        });
      } else {
        setPasswordErrors({
          general: 'Failed to change password. Please try again later.'
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getPasswordStrength = (password) => {
    const errors = validatePassword(password);
    if (password.length === 0) return { strength: 0, label: '', color: 'bg-gray-200' };
    if (errors.length === 0) return { strength: 100, label: 'Strong', color: 'bg-green-500' };
    if (errors.length <= 2) return { strength: 75, label: 'Good', color: 'bg-yellow-500' };
    if (errors.length <= 3) return { strength: 50, label: 'Fair', color: 'bg-orange-500' };
    return { strength: 25, label: 'Weak', color: 'bg-red-500' };
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary dark:text-white">Security Settings</h2>
        <p className="text-text-secondary dark:text-gray-400 mt-1">
          Manage your password and two-factor authentication
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="CheckCircle" size={16} color="#10b981" />
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        </div>
      )}

      {/* General Error Message */}
      {passwordErrors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} color="#ef4444" />
            <p className="text-sm text-red-700 dark:text-red-300">{passwordErrors.general}</p>
          </div>
        </div>
      )}

      {/* Password Change */}
      <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                className={`
                  w-full px-3 py-2 pr-10 border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                  text-text-primary dark:text-white bg-background dark:bg-gray-900
                  dark:border-gray-700
                  ${passwordErrors.currentPassword ? 'border-red-500 dark:border-red-600' : 'border-border dark:border-gray-700'}
                `}
                placeholder="Enter your current password"
                disabled={isChangingPassword}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary dark:text-white"
                disabled={isChangingPassword}
              >
                <Icon name={showCurrentPassword ? 'EyeOff' : 'Eye'} size={16} color="currentColor" />
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.currentPassword}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                  className={`
                    w-full px-3 py-2 pr-10 border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    text-text-primary dark:text-white bg-background dark:bg-gray-900
                    dark:border-gray-700
                    ${passwordErrors.newPassword ? 'border-red-500 dark:border-red-600' : 'border-border dark:border-gray-700'}
                  `}
                  placeholder="Enter new password"
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary dark:text-white"
                  disabled={isChangingPassword}
                >
                  <Icon name={showNewPassword ? 'EyeOff' : 'Eye'} size={16} color="currentColor" />
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.newPassword}</p>
              )}
              
              {/* Password Strength Indicator */}
              {passwordForm.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-secondary dark:text-gray-400">Password Strength</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength.color === 'bg-green-500' ? 'text-green-600 dark:text-green-400' :
                      passwordStrength.color === 'bg-yellow-500' ? 'text-yellow-600 dark:text-yellow-400' :
                      passwordStrength.color === 'bg-orange-500' ? 'text-orange-600 dark:text-orange-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  className={`
                    w-full px-3 py-2 pr-10 border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    text-text-primary dark:text-white bg-background dark:bg-gray-900
                    dark:border-gray-700
                    ${passwordErrors.confirmPassword ? 'border-red-500 dark:border-red-600' : 'border-border dark:border-gray-700'}
                  `}
                  placeholder="Confirm new password"
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary dark:text-white"
                  disabled={isChangingPassword}
                >
                  <Icon name={showConfirmPassword ? 'EyeOff' : 'Eye'} size={16} color="currentColor" />
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Icon name="AlertTriangle" size={16} color="#f59e0b" className="mt-0.5" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-medium mb-1">Password Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Include at least one number</li>
                  <li>Include at least one special character</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="
                px-6 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg
                hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center space-x-2
              "
            >
              {isChangingPassword && <Icon name="Loader2" size={16} color="currentColor" className="animate-spin" />}
              <Icon name="Key" size={16} color="currentColor" />
              <span>{isChangingPassword ? 'Changing...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-white">Two-Factor Authentication</h3>
            <p className="text-text-secondary dark:text-gray-400 text-sm mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`text-sm font-medium ${twoFactorEnabled ? 'text-green-600' : 'text-text-secondary'}`}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-smooth
                ${twoFactorEnabled ? 'bg-green-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-smooth
                  ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>

        {twoFactorEnabled && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="Shield" size={16} color="#10b981" />
              <p className="text-sm text-green-700">
                Two-factor authentication is active. You'll need your authenticator app to sign in.
              </p>
            </div>
            <div className="mt-3 flex space-x-3">
              <button className="text-sm text-green-700 hover:text-green-800 font-medium">
                View Recovery Codes
              </button>
              <button className="text-sm text-green-700 hover:text-green-800 font-medium">
                Reconfigure
              </button>
            </div>
          </div>
        )}

        {!twoFactorEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Icon name="AlertTriangle" size={16} color="#f59e0b" />
              <p className="text-sm text-yellow-700">
                Your account is not protected by two-factor authentication. Enable it for better security.
              </p>
            </div>
            <button className="mt-3 text-sm text-yellow-700 hover:text-yellow-800 font-medium">
              Set Up Two-Factor Authentication
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;
