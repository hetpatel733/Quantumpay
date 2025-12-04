import React, { useState } from 'react';
import Icon from 'components/AppIcon';


// Import components
import ProfileInformation from './components/ProfileInformation';
import SecuritySettings from './components/SecuritySettings';
import PaymentConfiguration from './components/PaymentConfiguration';
import NotificationSettings from './components/NotificationSettings';
import ApiManagement from './components/ApiManagement';

const AccountSettings = ({ userData, refreshUserData }) => {
  const [activeTab, setActiveTab] = useState('profile');

  // Debug log to see what userData is received
  console.log('🎯 AccountSettings received userData:', userData);

  const tabs = [
    {
      id: 'profile',
      label: 'Profile Information',
      icon: 'User',
      description: 'Manage your business details and contact information'
    },
    {
      id: 'security',
      label: 'Security Settings',
      icon: 'Shield',
      description: 'Password, 2FA, and session management'
    },
    {
      id: 'payment',
      label: 'Payment Configuration',
      icon: 'CreditCard',
      description: 'Cryptocurrency settings and wallet addresses'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'Bell',
      description: 'Email alerts and webhook preferences'
    },
    {
      id: 'api',
      label: 'API Management',
      icon: 'Code',
      description: 'API keys and integration settings'
    }
  ];

  const renderTabContent = () => {
    
    switch (activeTab) {
      case 'profile':
        return <ProfileInformation userData={userData} refreshUserData={refreshUserData} />;
      case 'security':
        return <SecuritySettings userData={userData} />;
      case 'payment':
        return <PaymentConfiguration userData={userData} />;
      case 'notifications':
        return <NotificationSettings userData={userData} />;
      case 'api':
        return <ApiManagement userData={userData} />;
      default:
        return <ProfileInformation userData={userData} refreshUserData={refreshUserData} />;
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900 overflow-x-hidden max-w-full">
      <div className="px-6 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Icon name="Settings" size={28} color="var(--color-primary)" />
            <h1 className="text-3xl font-bold text-text-primary dark:text-white">Account Settings</h1>
          </div>
          <p className="text-text-secondary dark:text-gray-400">
            Manage your profile, security, payment configuration, and API settings
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Tabs Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-4">
              <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Settings</h2>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-smooth
                      ${activeTab === tab.id
                        ? 'bg-primary dark:bg-teal-500 text-white' :'text-text-secondary dark:text-gray-400 hover:bg-secondary-100 dark:hover:bg-gray-700 hover:text-text-primary dark:hover:text-white'
                      }
                    `}
                  >
                    <Icon 
                      name={tab.icon} 
                      size={20} 
                      color="currentColor"
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className={`text-sm mt-1 ${
                        activeTab === tab.id ? 'text-white opacity-90' : 'text-text-secondary dark:text-gray-500'
                      }`}>
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Mobile/Tablet Tabs */}
          <div className="lg:hidden mb-6">
            <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 overflow-hidden">
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-shrink-0 flex items-center space-x-2 px-4 py-3 border-b-2 transition-smooth
                      ${activeTab === tab.id
                        ? 'border-primary dark:border-teal-500 text-primary dark:text-teal-400 bg-primary-50 dark:bg-teal-900/20' :'border-transparent text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon name={tab.icon} size={18} color="currentColor" />
                    <span className="font-medium whitespace-nowrap">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;