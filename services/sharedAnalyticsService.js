import Order from '../models/Order.js'
import Product from '../models/Product.js'

// VALID ORDERS FILTER - Single Source of Truth
const VALID_ORDERS_FILTER = {
  paymentStatus: 'paid',
  status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
}

/**
 * Shared Analytics Service - Used by both Analytics and Reports
 * Ensures consistent data across the entire admin system
 */
class SharedAnalyticsService {
  /**
   * Get comprehensive analytics data - Single Source of Truth
   * @param {number} range - Number of days to analyze
   * @returns {Promise<Object>} Analytics data
   */
  static async getAnalyticsData(range = 30) {
    console.log(` Fetching shared analytics data - Range: ${range} days`)
    
    const daysBack = parseInt(range)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    startDate.setHours(0, 0, 0, 0) // Start of day UTC
    
    const dateFilter = {
      createdAt: { $gte: startDate }
    }
    
    const matchFilter = { ...VALID_ORDERS_FILTER, ...dateFilter }
    
    // 1. SUMMARY STATS
    const statsData = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' },
          totalSold: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ])
    
    const stats = statsData[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      totalSold: 0
    }
    
    // 2. SALES TREND (Daily)
    const salesTrend = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            $dateToString: { 
              format: '%Y-%m-%d', 
              date: '$createdAt',
              timezone: 'UTC'
            }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $addToSet: '$_id' },
          itemsSold: { $sum: '$items.quantity' }
        }
      },
      {
        $project: {
          _id: 1,
          revenue: 1,
          orders: { $size: '$orders' },
          itemsSold: 1
        }
      },
      { $sort: { _id: 1 } }
    ])
    
    // 3. ORDERS STATUS CHART
    const ordersChart = await Order.aggregate([
      { $match: { createdAt: dateFilter.createdAt } }, // All orders for status breakdown
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
    
    // 4. CATEGORY DISTRIBUTION
    const categoryStats = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category.name',
          total: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { total: -1 } }
    ])
    
    // 5. TOP SELLING PRODUCTS
    const topProducts = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
          productName: { $first: '$items.name' }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          name: '$productName',
          unitsSold: 1,
          revenue: 1,
          image: { $arrayElemAt: ['$product.images', 0] },
          currentStock: '$product.stock',
          isActive: '$product.isActive'
        }
      }
    ])
    
    // 6. STOCK ANALYTICS
    const stockStats = {
      inStock: await Product.countDocuments({ 
        stock: { $gt: 0 },
        isActive: true 
      }),
      outOfStock: await Product.countDocuments({ 
        stock: 0,
        isActive: true 
      }),
      lowStock: await Product.countDocuments({ 
        stock: { $lt: 5, $gt: 0 },
        isActive: true 
      }),
      totalProducts: await Product.countDocuments({ isActive: true })
    }
    
    // 7. PAYMENT METHODS
    const paymentMethods = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ])
    
    // 8. UNIQUE CUSTOMERS
    const uniqueCustomersData = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          uniqueCustomers: { $addToSet: '$guestInfo.email' }
        }
      },
      {
        $project: {
          count: { $size: '$uniqueCustomers' }
        }
      }
    ])
    
    const uniqueCustomers = uniqueCustomersData[0]?.count || 0
    
    // 9. TOTAL USERS (from User collection if exists)
    let totalUsers = 0
    try {
      // Try to get user count if User model exists
      const User = (await import('../models/User.js')).default
      totalUsers = await User.countDocuments()
    } catch (error) {
      // User model doesn't exist, use unique customers as fallback
      totalUsers = uniqueCustomers
    }
    
    console.log(` Shared analytics calculated - Revenue: ${stats.totalRevenue}, Orders: ${stats.totalOrders}, Sold: ${stats.totalSold}`)
    
    return {
      summary: {
        totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
        totalOrders: stats.totalOrders,
        avgOrderValue: Math.round(stats.avgOrderValue * 100) / 100,
        totalSold: stats.totalSold,
        uniqueCustomers,
        totalUsers,
        daysRange: daysBack
      },
      salesTrend,
      ordersChart,
      categoryStats,
      topProducts,
      stockStats,
      paymentMethods,
      lastUpdated: new Date().toISOString()
    }
  }
  
  /**
   * Get export data for CSV/Excel
   * @param {number} range - Number of days to analyze
   * @returns {Promise<Array>} Export data
   */
  static async getExportData(range = 30) {
    console.log(` Getting export data - Range: ${range} days`)
    
    const daysBack = parseInt(range)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    startDate.setHours(0, 0, 0, 0)
    
    const matchFilter = { ...VALID_ORDERS_FILTER, createdAt: { $gte: startDate } }
    
    const orders = await Order.find(matchFilter)
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .lean()
    
    const exportData = orders.map(order => ({
      OrderID: order._id?.toString().slice(-8).toUpperCase() || 'N/A',
      Date: new Date(order.createdAt).toLocaleDateString('en-IN'),
      Time: new Date(order.createdAt).toLocaleTimeString('en-IN'),
      Customer: order.guestInfo?.firstName && order.guestInfo?.lastName 
        ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}`
        : order.guestInfo?.email || 'Guest',
      Email: order.guestInfo?.email || 'N/A',
      Phone: order.guestInfo?.mobile || 'N/A',
      Amount: order.totalAmount || 0,
      PaymentMethod: order.paymentMethod || 'N/A',
      PaymentStatus: order.paymentStatus || 'N/A',
      OrderStatus: order.status || 'N/A',
      Items: order.items?.length || 0,
      ShippingAddress: `${order.guestInfo?.streetAddress || ''}, ${order.guestInfo?.city || ''}, ${order.guestInfo?.state || ''} ${order.guestInfo?.zipCode || ''}`.trim(),
      AWB: order.awbCode || 'N/A',
      Tracking: order.trackingUrl || 'N/A'
    }))
    
    return exportData
  }
  
  /**
   * Trigger analytics refresh for real-time updates
   * @returns {Promise<Object>} Refresh confirmation
   */
  static async triggerRefresh() {
    console.log(' Triggering shared analytics refresh')
    
    return {
      message: 'Analytics refresh triggered',
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  }
}

export default SharedAnalyticsService
