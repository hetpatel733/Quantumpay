import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 overflow-x-hidden max-w-full">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="AlertTriangle" size={48} color="var(--color-primary)" />
          </div>
          <h1 className="text-6xl font-bold text-text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-text-primary mb-4">Page Not Found</h2>
          <p className="text-text-secondary mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/"
            className="
              inline-flex items-center space-x-2 px-6 py-3
              bg-primary text-white rounded-lg
              hover:bg-primary-700 transition-smooth
              font-medium
            "
          >
            <Icon name="Home" size={20} color="currentColor" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="text-sm text-text-secondary">
            <p>Need help? <Link to="/account-settings" className="text-primary hover:underline">Contact Support</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;