// src/pages/portfolio-management/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'components/AppIcon';
import { ordersAPI } from 'utils/api';
import { useToast } from 'contexts/ToastContext';
import ItemCard from './components/ItemCard';
import ItemFormModal from './components/ItemFormModal';

const PortfolioManagement = ({ userData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    sortBy: 'newest'
  });

  const fetchPortfolioItems = useCallback(async () => {
    if (!userData?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await ordersAPI.getAll({ 
        userId: userData.id,
        limit: 100 
      });

      if (response.success) {
        const orders = response.orders || [];
        const transformedItems = orders.map(order => ({
          id: order._id,
          _id: order._id,
          name: order.productName,
          description: order.description || '',
          price: order.amountUSD,
          cryptoPrice: { 
            type: 'USDT', 
            symbol: 'USDT', 
            amount: order.amountUSD 
          },
          image: order.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=350&fit=crop',
          status: order.isActive ? 'active' : 'inactive',
          salesCount: order.salesCount || 0,
          totalVolume: order.totalVolume || 0,
          createdAt: new Date(order.createdAt),
          productId: order.productId
        }));
        
        console.log('✅ Portfolio items loaded:', transformedItems.length);
        setPortfolioItems(transformedItems);
      } else {
        setError(response.message || 'Failed to fetch portfolio items');
      }
    } catch (error) {
      console.error('❌ Error fetching portfolio items:', error);
      setError('Failed to load portfolio items. Please try again.');
      setPortfolioItems([]);
    } finally {
      setLoading(false);
    }
  }, [userData?.id]);

  useEffect(() => {
    fetchPortfolioItems();
  }, [fetchPortfolioItems]);

  const handleAddItem = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item) => {
    console.log('✏️ Editing item:', item);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (itemId) => {
    console.log('🗑️ Delete button clicked for item:', itemId);
    
    if (!itemId) {
      console.error('❌ No item ID provided');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this item?');
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await ordersAPI.delete(itemId);
      
      if (response.success) {
        // Immediately remove from local state
        setPortfolioItems(prevItems => prevItems.filter(item => item.id !== itemId && item._id !== itemId));
        showToast('Item deleted successfully!', 'success');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('portfolio:updated', { detail: { action: 'delete', itemId } }));
      } else if (response.deactivated) {
        // Update local state to show as inactive
        setPortfolioItems(prevItems => 
          prevItems.map(item => 
            (item.id === itemId || item._id === itemId) 
              ? { ...item, status: 'inactive' } 
              : item
          )
        );
        showToast(response.message || 'Item has been deactivated (has associated payments)', 'warning');
      } else {
        throw new Error(response.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('❌ Error deleting item:', error);
      showToast('Failed to delete item: ' + error.message, 'error');
    }
  };

  const handleToggleStatus = async (itemId) => {
    if (!itemId) {
      return;
    }

    try {
      const item = portfolioItems.find(item => item.id === itemId || item._id === itemId);
      const newStatus = item.status === 'active' ? 'inactive' : 'active';
      
      const response = await ordersAPI.update(itemId, {
        isActive: newStatus === 'active'
      });
      
      if (response.success) {
        // Immediately update local state
        setPortfolioItems(prevItems => 
          prevItems.map(item => {
            if (item.id === itemId || item._id === itemId) {
              return { ...item, status: newStatus };
            }
            return item;
          })
        );
        showToast(`Item ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('portfolio:updated', { detail: { action: 'toggle', itemId, newStatus } }));
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('❌ Error toggling status:', error);
      showToast('Failed to update item status: ' + error.message, 'error');
    }
  };

  const handleSaveItem = async (itemData) => {
    if (!userData?.id) {
      showToast('User ID not found', 'error');
      return;
    }

    try {
      console.log('💾 Saving item with data:', itemData);
      
      if (selectedItem) {
        // Edit existing item
        const itemId = selectedItem._id || selectedItem.id;
        
        const response = await ordersAPI.update(itemId, {
          productName: itemData.productName,
          description: itemData.description,
          amountUSD: itemData.amountUSD,
          isActive: itemData.isActive,
          image: itemData.image
        });
        
        if (response.success) {
          console.log('✅ Item updated successfully');
          
          // Immediately update local state with the edited item
          setPortfolioItems(prevItems => 
            prevItems.map(item => {
              if (item.id === itemId || item._id === itemId) {
                return {
                  ...item,
                  name: itemData.productName,
                  description: itemData.description,
                  price: itemData.amountUSD,
                  status: itemData.isActive ? 'active' : 'inactive',
                  image: itemData.image || item.image
                };
              }
              return item;
            })
          );
          
          setIsModalOpen(false);
          setSelectedItem(null);
          showToast('Product updated successfully!', 'success');
          
          // Dispatch event for other components (like PaymentLinkModal)
          window.dispatchEvent(new CustomEvent('portfolio:updated', { detail: { action: 'update', itemId } }));
        } else {
          throw new Error(response.message || 'Failed to update item');
        }
      } else {
        // Add new item
        const orderData = {
          userId: userData.id,
          productName: itemData.productName,
          description: itemData.description,
          amountUSD: itemData.amountUSD,
          isActive: itemData.isActive,
          image: itemData.image
        };
        
        console.log('📦 Creating new order:', orderData);
        
        const response = await ordersAPI.create(orderData);
        
        console.log('📋 Create response:', response);
        
        if (response.success) {
          console.log('✅ Item created successfully');
          
          // Get the created order from response
          const newOrder = response.order || response.product || {};
          
          // Create the new item object with all required fields
          const newItem = {
            id: newOrder._id || newOrder.id,
            _id: newOrder._id || newOrder.id,
            name: itemData.productName,
            description: itemData.description || '',
            price: itemData.amountUSD,
            cryptoPrice: { 
              type: 'USDT', 
              symbol: 'USDT', 
              amount: itemData.amountUSD 
            },
            image: itemData.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=350&fit=crop',
            status: itemData.isActive ? 'active' : 'inactive',
            salesCount: 0,
            totalVolume: 0,
            createdAt: new Date(),
            productId: newOrder.productId || newOrder._id
          };
          
          console.log('🆕 Adding new item to list:', newItem);
          
          // Immediately add to local state - prepend to show at top
          setPortfolioItems(prevItems => [newItem, ...prevItems]);
          
          setIsModalOpen(false);
          setSelectedItem(null);
          showToast('Product created successfully!', 'success');
          
          // Dispatch event for other components (like PaymentLinkModal)
          window.dispatchEvent(new CustomEvent('portfolio:updated', { detail: { action: 'create', item: newItem } }));
        } else {
          throw new Error(response.message || 'Failed to create item');
        }
      }
    } catch (error) {
      console.error('❌ Error saving item:', error);
      showToast('Error: ' + error.message, 'error');
    }
  };

  // Filter handler functions
  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleStatusFilterChange = (e) => {
    setFilters(prev => ({ ...prev, status: e.target.value }));
  };

  const handleSortChange = (e) => {
    setFilters(prev => ({ ...prev, sortBy: e.target.value }));
  };

  // Calculate stats from portfolio items
  const stats = {
    totalProducts: portfolioItems.length,
    activeProducts: portfolioItems.filter(item => item.status === 'active').length,
    totalSales: portfolioItems.reduce((sum, item) => sum + (item.salesCount || 0), 0),
    totalRevenue: portfolioItems.reduce((sum, item) => sum + (item.totalVolume || 0), 0)
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
            onClick={fetchPortfolioItems} 
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
                           (item.description || '').toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || item.status === filters.status;
    
    return matchesSearch && matchesStatus;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch(filters.sortBy) {
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'sales':
        return (b.salesCount || 0) - (a.salesCount || 0);
      case 'newest':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return (
    <div className="p-4 lg:p-6 bg-background dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary dark:text-white">Portfolio Management</h1>
          <p className="text-text-secondary dark:text-gray-400 mt-1">
            Manage your products and services
          </p>
        </div>
        <button
          onClick={handleAddItem}
          className="flex items-center space-x-2 px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth"
        >
          <Icon name="Plus" size={20} color="currentColor" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Products */}
        <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary dark:text-gray-400 text-sm font-medium">Total Products</p>
              <p className="text-2xl font-bold text-text-primary dark:text-white mt-1">{stats.totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-primary-50 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
              <Icon name="Package" size={24} color="var(--color-primary)" className="dark:text-teal-400" />
            </div>
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary dark:text-gray-400 text-sm font-medium">Active Products</p>
              <p className="text-2xl font-bold text-success dark:text-green-400 mt-1">{stats.activeProducts}</p>
              <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">
                {stats.totalProducts > 0 
                  ? `${Math.round((stats.activeProducts / stats.totalProducts) * 100)}% of total`
                  : '0% of total'
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-success-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Icon name="CheckCircle" size={24} color="var(--color-success)" className="dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary dark:text-gray-400 text-sm font-medium">Total Sales</p>
              <p className="text-2xl font-bold text-primary dark:text-teal-400 mt-1">{stats.totalSales.toLocaleString()}</p>
              <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">
                Across all products
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-50 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
              <Icon name="ShoppingCart" size={24} color="var(--color-primary)" className="dark:text-teal-400" />
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary dark:text-gray-400 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-success dark:text-green-400 mt-1">
                ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">
                Lifetime earnings
              </p>
            </div>
            <div className="w-12 h-12 bg-success-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Icon name="DollarSign" size={24} color="var(--color-success)" className="dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-teal-500"
          />
          <select 
            value={filters.status} 
            onChange={handleStatusFilterChange}
            className="w-full px-4 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select 
            value={filters.sortBy} 
            onChange={handleSortChange}
            className="w-full px-4 py-2 bg-background dark:bg-gray-900 border border-border dark:border-gray-600 rounded-lg dark:text-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-high">Price: High to Low</option>
            <option value="price-low">Price: Low to High</option>
            <option value="sales">Most Sales</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {sortedItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id || item._id}
              item={item}
              userData={userData}
              onEdit={() => handleEditItem(item)}
              onDelete={() => handleDeleteItem(item.id || item._id)}
              onToggleStatus={() => handleToggleStatus(item.id || item._id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-surface dark:bg-gray-800 rounded-lg border border-border dark:border-gray-700">
          <Icon name="Package" size={48} color="var(--color-text-secondary)" className="mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary dark:text-white mb-2">
            {filters.search || filters.status !== 'all' ? 'No products match your filters' : 'No products yet'}
          </h3>
          <p className="text-text-secondary dark:text-gray-400 mb-6">
            {filters.search || filters.status !== 'all' 
              ? 'Try adjusting your filters to see more products.' 
              : 'Create your first product to start accepting payments.'}
          </p>
          {!filters.search && filters.status === 'all' && (
            <button
              onClick={handleAddItem}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary dark:bg-teal-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-teal-600 transition-smooth"
            >
              <Icon name="Plus" size={16} color="currentColor" />
              <span>Create Your First Product</span>
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      <ItemFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSaveItem}
        item={selectedItem}
      />
    </div>
  );
};

export default PortfolioManagement;