// src/pages/portfolio-management/components/ItemFormModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';

const ItemFormModal = ({ isOpen, onClose, onSave, item = null }) => {
  const modalRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cryptoType: 'Bitcoin',
    cryptoAmount: '',
    address: '',
    image: '',
    status: 'active'
  });

  // Initialize form with item data if editing
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price?.toString() || '',
        cryptoType: item.cryptoPrice?.type || 'Bitcoin',
        cryptoAmount: item.cryptoPrice?.amount?.toString() || '',
        address: item.address || '',
        image: item.image || '',
        status: item.status || 'active'
      });
    } else {
      // Reset form for new item
      setFormData({
        name: '',
        description: '',
        price: '',
        cryptoType: 'Bitcoin',
        cryptoAmount: '',
        address: '',
        image: '',
        status: 'active'
      });
    }
    setErrors({});
  }, [item, isOpen]);

  const cryptocurrencyOptions = [
    { value: 'Bitcoin', label: 'Bitcoin (BTC)', symbol: 'BTC' },
    { value: 'Ethereum', label: 'Ethereum (ETH)', symbol: 'ETH' },
    { value: 'USDT', label: 'Tether (USDT)', symbol: 'USDT' },
    { value: 'USDC', label: 'USD Coin (USDC)', symbol: 'USDC' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('📋 Form submission started');
    console.log('📋 Current form data:', formData);
    
    if (validateForm()) {
      const formattedData = {
        productName: formData.name.trim(),
        description: formData.description.trim(),
        amountUSD: parseFloat(formData.price),
        image: formData.image,
        isActive: formData.status === 'active'
      };
      
      console.log('📋 Formatted data being submitted:', formattedData);
      
      // Validate required fields one more time
      if (!formattedData.productName) {
        alert('Product name is required');
        return;
      }
      
      if (isNaN(formattedData.amountUSD) || formattedData.amountUSD <= 0) {
        alert('Valid price is required');
        return;
      }
      
      console.log('📋 Calling onSave function...');
      
      try {
        onSave(formattedData);
      } catch (error) {
        console.error('❌ Error in onSave:', error);
        alert('Error saving item: ' + error.message);
      }
    } else {
      console.log('❌ Form validation failed:', errors);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be a positive number';
    }
    
    console.log('🔍 Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleInputChange('image', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleInputChange('image', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle escape key and backdrop click
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleBackdropClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleBackdropClick);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleBackdropClick);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-300 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-smooth" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="
          relative bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 shadow-dropdown
          w-full max-w-2xl max-h-[90vh] overflow-hidden
          transition-layout
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Icon name={item ? 'Edit' : 'Plus'} size={24} color="currentColor" className="text-primary" />
            <h2 className="text-xl font-semibold text-text-primary dark:text-white">
              {item ? 'Edit Portfolio Item' : 'Add New Item'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="
              p-2 rounded-lg
              hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth
              text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white
            "
          >
            <Icon name="X" size={20} color="currentColor" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-background dark:bg-gray-900">
          <div className="space-y-6">
            {/* Product Image */}
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                Product Image
              </label>
              <div 
                className={`
                  border-2 border-dashed rounded-lg p-4 text-center
                  ${isDragging ? 'border-primary bg-primary-50 dark:bg-teal-900/20' : 'border-border dark:border-gray-700'}
                  ${errors.image ? 'border-error dark:border-red-600' : ''}
                  transition-smooth bg-background dark:bg-gray-800
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {formData.image ? (
                  <div className="relative w-full aspect-video max-h-48 mx-auto">
                    <Image 
                      src={formData.image} 
                      alt="Product preview" 
                      className="w-full h-full object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('image', '')}
                      className="
                        absolute top-2 right-2 p-1 rounded-full
                        bg-error text-white
                        hover:bg-error-700 transition-smooth
                      "
                    >
                      <Icon name="X" size={16} color="currentColor" />
                    </button>
                  </div>
                ) : (
                  <div className="py-8">
                    <Icon 
                      name="Image" 
                      size={40} 
                      color="currentColor" 
                      className="mx-auto text-text-secondary dark:text-gray-400 mb-2"
                    />
                    <p className="text-text-secondary dark:text-gray-400 mb-2">Drag and drop an image here, or click to browse</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="
                        inline-block px-4 py-2 bg-secondary-100 dark:bg-gray-700 rounded-lg
                        text-text-primary dark:text-white hover:bg-secondary-200 dark:hover:bg-gray-600 transition-smooth
                        cursor-pointer
                      "
                    >
                      Browse Files
                    </label>
                  </div>
                )}
              </div>
              {errors.image && (
                <p className="mt-1 text-sm text-error dark:text-red-400">{errors.image}</p>
              )}
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`
                    w-full px-3 py-2 border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    text-text-primary dark:text-white bg-background dark:bg-gray-900
                    ${errors.name ? 'border-error dark:border-red-600' : 'border-border dark:border-gray-700'}
                  `}
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-error dark:text-red-400">{errors.name}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="
                    w-full px-3 py-2 border border-border dark:border-gray-700 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    text-text-primary dark:text-white bg-background dark:bg-gray-900 resize-none
                  "
                  placeholder="Describe your product"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                  Price (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-text-secondary dark:text-gray-400">$</span>
                  </div>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className={`
                      w-full pl-8 pr-3 py-2 border rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                      text-text-primary dark:text-white bg-background dark:bg-gray-900
                      ${errors.price ? 'border-error dark:border-red-600' : 'border-border dark:border-gray-700'}
                    `}
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-error dark:text-red-400">{errors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                  Status
                </label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={() => handleInputChange('status', 'active')}
                      className="form-radio text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="ml-2 text-text-primary dark:text-white">Active</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={() => handleInputChange('status', 'inactive')}
                      className="form-radio text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="ml-2 text-text-primary dark:text-white">Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Information Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Icon name="Info" size={16} color="#2563eb" className="mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Payment Methods</p>
                  <p>
                    Customers will be able to pay for this product using any cryptocurrency payment methods 
                    you have enabled in your Payment Configuration settings. You don't need to specify 
                    payment methods here.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 mt-6 border-t border-border dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                console.log('❌ Cancel button clicked');
                onClose();
              }}
              className="
                px-4 py-2 border border-border dark:border-gray-700 rounded-lg
                text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white
                hover:bg-secondary-100 dark:hover:bg-gray-700 transition-smooth
              "
            >
              Cancel
            </button>
            <button 
              type="submit"
              onClick={(e) => {
                console.log('💾 Submit button clicked');
                handleSubmit(e);
              }}
              className="
                px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg
                hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
                flex items-center space-x-2
              "
            >
              <Icon name="Save" size={16} color="currentColor" />
              <span>{item ? 'Update Item' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ItemFormModal;