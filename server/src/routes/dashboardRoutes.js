const express = require('express');
const router = express.Router();
const { DashboardDailyMetric } = require('../models/DashboardDailyMetric');
const { Payment } = require('../models/Payment');
const { Order } = require('../models/Order');
const { authenticateUser } = require('../services/auth');
const { recalculateMetrics, getMetricsForRange, getMonthlySummary } = require('../services/dashboardMetricsService');

// Get dashboard overview (summary data)
router.get('/overview', authenticateUser, async (req, res) => {
  try {
    const businessEmail = req.user.email;
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);
    
    const { User } = require('../models/User');
    const user = await User.findOne({ email: businessEmail });
    
    if (!user || user.type !== 'business') {
      return res.status(200).json({
        success: true,
        todayMetrics: {
          businessEmail,
          date: today,
          // Updated volume structure
          volume: { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 },
          currentMonthSummary: { totalPayments: 0, completed: 0, failed: 0, pending: 0 },
          totalSales: 0,
          transactionCount: 0,
          averageTransactionValue: 0,
          topCryptoCurrency: 'USDT'
        },
        monthlyMetrics: {
          totalSales: 0,
          transactionCount: 0,
          // Updated volume structure
          volume: { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 }
        },
        orderStats: { total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 }
      });
    }
    
    // Calculate real-time metrics from Payment collection
    const currentDate = new Date();
    const startOfToday = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
    
    // Get all-time payment statistics
    const [
      allTimeStats,
      monthlyStats,
      todayStats,
      pendingCount,
      completedThisMonth,
      failedThisMonth,
      monthlyVolumeByCrypto
    ] = await Promise.all([
      // All-time statistics
      Payment.aggregate([
        { $match: { businessEmail } },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            totalCompletedValue: { 
              $sum: { 
                $cond: [
                  { $eq: ['$status', 'completed'] }, 
                  '$amountUSD', 
                  0
                ] 
              } 
            }
          }
        }
      ]),
      
      // This month statistics
      Payment.aggregate([
        { 
          $match: { 
            businessEmail,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
          } 
        },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            totalSales: { 
              $sum: { 
                $cond: [
                  { $eq: ['$status', 'completed'] }, 
                  '$amountUSD', 
                  0
                ] 
              } 
            }
          }
        }
      ]),
      
      // Today statistics
      Payment.aggregate([
        { 
          $match: { 
            businessEmail,
            createdAt: { $gte: startOfToday, $lt: endOfToday }
          } 
        },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            totalSales: { 
              $sum: { 
                $cond: [
                  { $eq: ['$status', 'completed'] }, 
                  '$amountUSD', 
                  0
                ] 
              } 
            }
          }
        }
      ]),
      
      // Current pending payments (all time)
      Payment.countDocuments({ businessEmail, status: 'pending' }),
      
      // Completed payments this month
      Payment.countDocuments({ 
        businessEmail, 
        status: 'completed',
        completedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      
      // Failed payments this month
      Payment.countDocuments({ 
        businessEmail, 
        status: 'failed',
        updatedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      
      // Monthly volume by cryptocurrency
      Payment.aggregate([
        { 
          $match: { 
            businessEmail,
            status: 'completed',
            completedAt: { $gte: startOfMonth, $lte: endOfMonth }
          } 
        },
        {
          $group: {
            _id: '$cryptoType',
            volume: { $sum: '$amountUSD' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    // Process results
    const allTime = allTimeStats[0] || { totalPayments: 0, completed: 0, pending: 0, failed: 0, totalCompletedValue: 0 };
    const monthly = monthlyStats[0] || { totalPayments: 0, completed: 0, pending: 0, failed: 0, totalSales: 0 };
    const todayMetricsData = todayStats[0] || { totalPayments: 0, completed: 0, totalSales: 0 };
    
    // Build volume object with new crypto types
    const volume = { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 };
    monthlyVolumeByCrypto.forEach(item => {
      // Only include supported cryptocurrencies
      if (['USDT', 'USDC', 'BTC', 'ETH', 'MATIC', 'SOL'].includes(item._id)) {
        volume[item._id] = item.volume;
      }
    });
    
    // Find the top crypto currency
    let topCrypto = 'USDT';
    let maxVolume = 0;
    Object.entries(volume).forEach(([crypto, vol]) => {
      if (vol > maxVolume) {
        maxVolume = vol;
        topCrypto = crypto;
      }
    });
    
    // Create or update today's metrics in the database
    const todayMetrics = await DashboardDailyMetric.findOneAndUpdate(
      { businessEmail, date: today },
      {
        businessEmail,
        date: today,
        volume,
        currentMonthSummary: {
          totalPayments: monthly.totalPayments,
          completed: completedThisMonth,
          failed: failedThisMonth,
          pending: pendingCount
        },
        totalSales: monthly.totalSales,
        transactionCount: completedThisMonth,
        averageTransactionValue: completedThisMonth > 0 ? monthly.totalSales / completedThisMonth : 0,
        topCryptoCurrency: topCrypto
      },
      { new: true, upsert: true }
    );
    
    // Get last 7 days data for trends
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(dateStr);
    }
    
    // Get daily breakdown for chart with updated crypto types
    const dailyBreakdown = await Promise.all(
      last7Days.map(async (dateStr) => {
        const dayStart = new Date(dateStr + 'T00:00:00.000Z');
        const dayEnd = new Date(dateStr + 'T23:59:59.999Z');
        
        const dayData = await Payment.aggregate([
          {
            $match: {
              businessEmail,
              status: 'completed',
              completedAt: { $gte: dayStart, $lte: dayEnd }
            }
          },
          {
            $group: {
              _id: '$cryptoType',
              volume: { $sum: '$amountUSD' }
            }
          }
        ]);
        
        // Updated day volume structure
        const dayVolume = { USDT: 0, USDC: 0, BTC: 0, ETH: 0, MATIC: 0, SOL: 0 };
        dayData.forEach(item => {
          if (['USDT', 'USDC', 'BTC', 'ETH', 'MATIC', 'SOL'].includes(item._id)) {
            dayVolume[item._id] = item.volume;
          }
        });
        
        return {
          name: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: dateStr,
          ...dayVolume
        };
      })
    );
    
    // Get current product counts (orders) - only use isActive
    const [totalProducts, activeProducts, inactiveProducts] = 
      await Promise.all([
        Order.countDocuments({ businessEmail }),
        Order.countDocuments({ businessEmail, isActive: true }),
        Order.countDocuments({ businessEmail, isActive: false })
      ]);
    
    // Add timestamp to help client determine freshness
    const responseTimestamp = new Date().toISOString();
    
    // Add debug info to help diagnose data consistency issues
    const debugInfo = {
      timestamp: responseTimestamp,
      pendingCount,
      completedValue: monthly.totalSales,
      failedCount: failedThisMonth,
      monthlyTotal: monthly.totalPayments
    };
    
    console.log('📊 Dashboard Overview - Metrics calculated:', debugInfo);
    
    res.status(200).json({
      success: true,
      timestamp: responseTimestamp,
      todayMetrics: {
        ...todayMetrics.toObject(),
        currentMonthSummary: {
          totalPayments: monthly.totalPayments,
          completed: completedThisMonth,
          failed: failedThisMonth,
          pending: pendingCount
        },
        totalSales: monthly.totalSales,
        transactionCount: completedThisMonth
      },
      monthlyMetrics: {
        totalSales: monthly.totalSales,
        transactionCount: completedThisMonth,
        volume
      },
      dailyBreakdown, 
      productStats: {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts
      },
      debugInfo
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get daily metrics for a date range
router.get('/metrics', authenticateUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessEmail = req.user.email;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const metrics = await DashboardDailyMetric.find({
      businessEmail,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });
    
    res.status(200).json({ success: true, metrics });
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get transaction volume by crypto type
router.get('/volume-by-crypto', authenticateUser, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    const businessEmail = req.user.email;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case '7days':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30days':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90days':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }
    
    const volumeByCrypto = await Payment.aggregate([
      {
        $match: {
          businessEmail,
          status: 'completed',
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$cryptoType',
          volume: { $sum: '$amountUSD' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { volume: -1 }
      }
    ]);
    
    res.status(200).json({ success: true, volumeByCrypto });
  } catch (error) {
    console.error('Error fetching volume by crypto:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get recent activity (recent payments)
router.get('/recent-activity', authenticateUser, async (req, res) => {
  try {
    const businessEmail = req.user.email;
    const limit = parseInt(req.query.limit) || 5;
    
    // Get recent payments
    const recentPayments = await Payment.find({
      businessEmail
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('payId customerName customerEmail amountUSD amountCrypto cryptoType cryptoSymbol status createdAt completedAt')
    .lean();

    // Transform for frontend
    const recentActivity = recentPayments.map(payment => ({
      id: payment.payId,
      customer: payment.customerName || payment.customerEmail.split('@')[0],
      customerEmail: payment.customerEmail,
      amount: payment.amountUSD,
      cryptocurrency: payment.cryptoType,
      cryptoAmount: payment.amountCrypto,
      cryptoSymbol: payment.cryptoSymbol,
      status: payment.status,
      timestamp: payment.createdAt,
      completedAt: payment.completedAt
    }));

    res.status(200).json({
      success: true,
      recentActivity,
      isEmpty: recentActivity.length === 0
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      recentActivity: [],
      isEmpty: true
    });
  }
});

// Get crypto distribution data
router.get('/crypto-distribution', authenticateUser, async (req, res) => {
  try {
    const businessEmail = req.user.email;
    const period = req.query.period || '30days';
    
    // Calculate date range
    let startDate;
    const now = new Date();
    
    switch (period) {
      case '7days':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30days':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90days':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }

    // Get crypto distribution from completed payments
    const cryptoDistribution = await Payment.aggregate([
      {
        $match: {
          businessEmail,
          status: 'completed',
          completedAt: { $gte: startDate },
          // Only include supported cryptocurrencies
          cryptoType: { $in: ['USDT', 'USDC', 'BTC', 'ETH', 'MATIC', 'SOL'] }
        }
      },
      {
        $group: {
          _id: '$cryptoType',
          totalVolume: { $sum: '$amountUSD' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalVolume: -1 }
      }
    ]);

    const totalVolume = cryptoDistribution.reduce((sum, item) => sum + item.totalVolume, 0);

    const distributionData = cryptoDistribution.map(item => {
      let color = '#64748B'; // Default color
      
      switch (item._id) {
        case 'BTC':
          color = '#F7931A';
          break;
        case 'ETH':
          color = '#627EEA';
          break;
        case 'USDT':
          color = '#26A17B';
          break;
        case 'USDC':
          color = '#1FC7D4';
          break;
        case 'MATIC':
          color = '#8247E5';
          break;
        case 'SOL':
          color = '#9945FF';
          break;
      }

      return {
        name: item._id,
        value: totalVolume > 0 ? Math.round((item.totalVolume / totalVolume) * 100) : 0,
        volume: item.totalVolume,
        count: item.count,
        color
      };
    });

    res.status(200).json({
      success: true,
      distribution: distributionData,
      totalVolume,
      isEmpty: distributionData.length === 0
    });
  } catch (error) {
    console.error('Error fetching crypto distribution:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      distribution: [],
      totalVolume: 0,
      isEmpty: true
    });
  }
});

// Recalculate metrics for a specific date (admin endpoint)
router.post('/recalculate-metrics', authenticateUser, async (req, res) => {
  try {
    const { date } = req.body;
    const businessEmail = req.user.email;
    
    console.log('🔄 Recalculating metrics for:', businessEmail, 'Date:', date);
    
    const updatedMetrics = await recalculateMetrics(businessEmail, date);
    
    res.status(200).json({
      success: true,
      metrics: updatedMetrics,
      message: 'Metrics recalculated successfully'
    });
  } catch (error) {
    console.error('Error recalculating metrics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get metrics for a date range
router.get('/metrics-range', authenticateUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessEmail = req.user.email;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const metrics = await getMetricsForRange(businessEmail, startDate, endDate);
    
    res.status(200).json({
      success: true,
      metrics,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching metrics range:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get monthly summary
router.get('/monthly-summary', authenticateUser, async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM
    const businessEmail = req.user.email;
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month parameter is required (format: YYYY-MM)'
      });
    }
    
    const summary = await getMonthlySummary(businessEmail, month);
    
    res.status(200).json({
      success: true,
      summary,
      month
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get current cryptocurrency prices
router.get('/crypto-prices', authenticateUser, async (req, res) => {
  try {
    const { symbols } = req.query;
    const pricingService = require('../services/pricingService');
    
    // Parse requested symbols or use defaults
    const requestedSymbols = symbols ? 
      symbols.split(',').map(s => s.trim().toUpperCase()) : 
      ['BTC', 'ETH', 'USDT', 'USDC', 'MATIC', 'SOL'];
    
    console.log('💰 Fetching crypto prices for:', requestedSymbols);
    
    const prices = await pricingService.getMultipleCryptoPrices(requestedSymbols);
    
    // Get additional trend data for major cryptocurrencies
    const trendPromises = ['BTC', 'ETH', 'MATIC', 'SOL'].map(async (symbol) => {
      if (requestedSymbols.includes(symbol)) {
        try {
          const trend = await pricingService.getPriceTrend(symbol);
          return { symbol, trend };
        } catch (error) {
          return { symbol, trend: null, error: error.message };
        }
      }
      return null;
    });
    
    const trendResults = (await Promise.all(trendPromises)).filter(Boolean);
    const trends = {};
    trendResults.forEach(({ symbol, trend }) => {
      trends[symbol] = trend;
    });
    
    res.status(200).json({
      success: true,
      prices,
      trends,
      timestamp: new Date(),
      source: 'binance',
      cacheStatus: pricingService.getCacheStatus()
    });
  } catch (error) {
    console.error('❌ Error fetching crypto prices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message,
      prices: {},
      trends: {}
    });
  }
});

module.exports = router;