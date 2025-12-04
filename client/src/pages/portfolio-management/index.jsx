// src/pages/portfolio-management/index.jsx
import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import { ordersAPI, apiKeysAPI } from 'utils/api';

import ItemFormModal from './components/ItemFormModal';
import ItemCard from './components/ItemCard';

const PortfolioManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    sortBy: 'newest'
  });

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await ordersAPI.getAll({
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        
        if (response.success) {
          // Transform API data to match component expectations
          const transformedItems = response.orders.map(order => ({
            id: order._id,
            name: order.productName,
            description: order.description || 'No description provided',
            price: order.amountUSD,
            cryptoPrice: { type: 'USDT', symbol: 'USDT', amount: order.amountUSD },
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=350&fit=crop',
            address: order.businessEmail,
            status: order.isActive ? 'active' : 'inactive',
            salesCount: 0, // This would need to be calculated from payments
            createdAt: new Date(order.createdAt),
            orderId: order.orderId
          }));
          
          setPortfolioItems(transformedItems);
        } else {
          setError(response.message || 'Failed to fetch portfolio items');
        }
      } catch (err) {
        console.error('Error fetching portfolio items:', err);
        setError('Failed to load portfolio items. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleAddItem = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const response = await ordersAPI.delete(itemId);
      if (response.success) {
        setPortfolioItems(prevItems => prevItems.filter(item => item.id !== itemId));
      } else {
        alert('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleSaveItem = async (itemData) => {
    try {
      console.log('💾 Saving item with data:', itemData);
      setLoading(true);
      
      if (selectedItem) {
        // Edit existing item
        console.log('✏️ Editing existing item:', selectedItem._id || selectedItem.id);
        const itemId = selectedItem._id || selectedItem.id;
        
        const response = await ordersAPI.update(itemId, {
          productName: itemData.productName,
          description: itemData.description,
          amountUSD: itemData.amountUSD,
          isActive: itemData.isActive
        });
        
        console.log('📝 Update response:', response);
        
        if (response.success) {
          // Refresh the portfolio items
          await fetchPortfolioItems();
          console.log('✅ Item updated successfully');
          
          // Show success message
          alert('Product updated successfully!');
        } else {
          throw new Error(response.message || 'Failed to update item');
        }
      } else {
        // Add new item - create order in backend
        console.log('➕ Creating new item');
        const orderData = {
          productName: itemData.productName,
          description: itemData.description,
          amountUSD: itemData.amountUSD,
          isActive: itemData.isActive
        };
        
        console.log('📦 Order data to create:', orderData);
        
        const response = await ordersAPI.create(orderData);
        
        console.log('📋 Create response:', response);
        
        if (response.success) {
          // Refresh the portfolio items to get the latest data
          await fetchPortfolioItems();
          console.log('✅ Portfolio item created with order ID:', response.order?.orderId);
          
          // Show success message
          alert('Product created successfully!');
        } else {
          throw new Error(response.message || 'Failed to create item');
        }
      }
      
      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('❌ Error saving item:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to save item';
      
      if (error.message.includes('404')) {
        errorMessage = 'Order not found or access denied. Please refresh and try again.';
      } else if (error.message.includes('validation')) {
        errorMessage = 'Invalid data provided. Please check your inputs.';
      } else if (error.message.includes('deactivated')) {
        errorMessage = 'This product is deactivated and cannot be modified.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioItems = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching portfolio items...');
      
      const response = await ordersAPI.getAll({ limit: 100 });
      console.log('📦 Orders response:', response);

      if (response.success) {
        const orders = response.orders || [];
        // Transform orders to portfolio items format
        const transformedItems = orders.map(order => ({
          id: order._id,
          name: order.productName,
          description: order.description || '',
          price: order.amountUSD,
          cryptoPrice: { 
            type: 'USDT', 
            symbol: 'USDT', 
            amount: order.amountUSD 
          },
          image: order.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=350&fit=crop',
          address: order.businessEmail,
          status: order.isActive ? 'active' : 'inactive',
          salesCount: 0,
          createdAt: new Date(order.createdAt),
          orderId: order.orderId,
          _id: order._id // Keep original ID for updates
        }));
        
        setPortfolioItems(transformedItems);
        console.log(`✅ Loaded ${transformedItems.length} portfolio items`);
      } else {
        console.warn('⚠️ Failed to fetch orders:', response.message);
        setPortfolioItems([]);
      }
    } catch (error) {
      console.error('❌ Error fetching portfolio items:', error);
      setPortfolioItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch items on component mount
  useEffect(() => {
    fetchPortfolioItems();
  }, []);

  const handleToggleStatus = async (itemId) => {
    try {
      const item = portfolioItems.find(item => item.id === itemId);
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      
      const response = await ordersAPI.update(itemId, {
        isActive: newStatus === 'active'
      });
      
      if (response.success) {
        setPortfolioItems(prevItems => 
          prevItems.map(item => {
            if (item.id === itemId) {
              return { ...item, status: newStatus };
            }
            return item;
          })
        );
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update item status');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-4 lg:p-6 bg-background dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-teal-500"></div>
          <p className="text-text-secondary dark:text-gray-400">Loading portfolio items...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 lg:p-6 bg-background dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Icon name="AlertCircle" size={48} color="var(--color-error)" className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-2">Error Loading Portfolio</h2>
          <p className="text-text-secondary dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Filter and sort items
  const filteredItems = portfolioItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                           item.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || item.status === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch(filters.sortBy) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'price-high':
        return b.price - a.price;
      case 'price-low':
        return a.price - b.price;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  // Add missing filter handler functions
  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleStatusFilterChange = (e) => {
    setFilters(prev => ({ ...prev, status: e.target.value }));
  };

  const handleSortChange = (e) => {
    setFilters(prev => ({ ...prev, sortBy: e.target.value }));
  };

  return (
    <div className="p-4 lg:p-6 bg-background dark:bg-gray-900 min-h-screen overflow-x-hidden max-w-full">
      <div className="max-w-8xl mx-auto">
        
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-semibold text-text-primary dark:text-white">Portfolio Management</h1>
              <p className="text-text-secondary dark:text-gray-400 mt-1 text-sm lg:text-base">Manage your product catalog for cryptocurrency payments</p>
            </div>
            <button 
              onClick={handleAddItem}
              className="
                flex items-center justify-center space-x-2 px-4 py-2
                bg-primary dark:bg-teal-500 text-white rounded-lg
                hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
                text-sm lg:text-base
                w-full sm:w-auto
              "
            >
              <Icon name="Plus" size={16} color="currentColor" />
              <span>Add Item</span>
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-border dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary dark:text-gray-400 text-sm">Total Items</p>
                  <p className="text-xl lg:text-2xl font-semibold text-text-primary dark:text-white">{portfolioItems.length}</p>
                </div>
                <div className="w-10 h-10 bg-primary-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="ShoppingBag" size={20} color="var(--color-primary)" />
                </div>
              </div>
            </div>
            <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-border dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary dark:text-gray-400 text-sm">Active Items</p>
                  <p className="text-xl lg:text-2xl font-semibold text-success">
                    {portfolioItems.filter(item => item.status === 'active').length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-success-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="CheckCircle" size={20} color="var(--color-success)" />
                </div>
              </div>
            </div>
            <div className="bg-surface dark:bg-gray-800 rounded-lg p-4 border border-border dark:border-gray-700 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary dark:text-gray-400 text-sm">Total Sales</p>
                  <p className="text-xl lg:text-2xl font-semibold text-text-primary dark:text-white">
                    {portfolioItems.reduce((total, item) => total + item.salesCount, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-secondary-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="TrendingUp" size={20} color="var(--color-text-primary)" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-4 lg:p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                Search Items
              </label>
              <div className="relative">
                <Icon 
                  name="Search" 
                  size={16} 
                  color="currentColor"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary dark:text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Search by name or description..."
                  value={filters.search}
                  onChange={handleSearchChange}
                  className="
                    w-full pl-10 pr-4 py-2
                    bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg
                    text-text-primary dark:text-white placeholder-text-secondary dark:placeholder-gray-500
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    transition-smooth text-sm
                  "
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={handleStatusFilterChange}
                className="
                  w-full px-3 py-2
                  bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg
                  text-text-primary dark:text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                  transition-smooth
                "
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={handleSortChange}
                className="
                  w-full px-3 py-2
                  bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg
                  text-text-primary dark:text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                  transition-smooth
                "
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-border dark:border-gray-700">
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Showing {sortedItems.length} of {portfolioItems.length} items
            </p>
          </div>
        </div>

        {/* Items Grid */}
        {sortedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {sortedItems.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onEdit={() => handleEditItem(item)} 
                onDelete={() => handleDeleteItem(item.id)}
                onToggleStatus={() => handleToggleStatus(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-8 lg:p-10 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-secondary-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Icon name="PackageOpen" size={32} color="var(--color-text-secondary)" />
              </div>
              <h3 className="text-lg lg:text-xl font-medium text-text-primary dark:text-white">No items found</h3>
              <p className="text-text-secondary dark:text-gray-400 max-w-md mx-auto text-sm lg:text-base">
                {portfolioItems.length === 0 
                  ? "You haven't added any items to your portfolio yet. Click 'Add Item' to get started." :"No items match your current filters. Try adjusting your search criteria."}
              </p>
              {portfolioItems.length === 0 && (
                <button 
                  onClick={handleAddItem}
                  className="
                    mt-2 flex items-center space-x-2 px-4 py-2
                    bg-primary dark:bg-teal-500 text-white rounded-lg
                    hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth
                    text-sm lg:text-base
                  "
                >
                  <Icon name="Plus" size={16} color="currentColor" />
                  <span>Add Your First Item</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      <ItemFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        item={selectedItem}
      />
    </div>
  );
};

export default PortfolioManagement;