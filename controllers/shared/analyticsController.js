import { sendSuccess, sendError, catchAsync } from '../../utils/errorHandler.js'
import SharedAnalyticsService from '../../services/sharedAnalyticsService.js'

// GET comprehensive analytics data - Using Shared Service
export const getAnalytics = catchAsync(async (req, res) => {
  const { range = '30', period = 'daily' } = req.query // days
  
  console.log(` Fetching analytics via SHARED SERVICE - Range: ${range} days, Period: ${period}`)
  
  try {
    const analyticsData = await SharedAnalyticsService.getAnalyticsData(range)
    
    console.log(` Shared Analytics Service - Revenue: ${analyticsData.summary.totalRevenue}, Orders: ${analyticsData.summary.totalOrders}`)
    
    sendSuccess(res, analyticsData)
  } catch (error) {
    console.error(' Shared Analytics Service error:', error)
    sendError(res, error.message || 'Failed to fetch analytics data', 500)
  }
})

// REAL-TIME SYNC TRIGGER - Using Shared Service
export const triggerAnalyticsRefresh = catchAsync(async (req, res) => {
  console.log(' Triggering analytics refresh via SHARED SERVICE')
  
  try {
    const refreshResult = await SharedAnalyticsService.triggerRefresh()
    sendSuccess(res, refreshResult)
  } catch (error) {
    console.error(' Analytics refresh trigger error:', error)
    sendError(res, error.message || 'Failed to trigger analytics refresh', 500)
  }
})

// GET product analytics
export const getProductAnalytics = catchAsync(async (req, res) => {
  const totalProducts = await Product.countDocuments({ isActive: true })
  const lowStockProducts = await Product.countDocuments({ 
    stock: { $lt: 5 },
    isActive: true 
  })
  
  const categories = await Product.distinct('category')
  
  const categoryStats = await Promise.all(
    categories.map(async (cat) => ({
      category: cat,
      count: await Product.countDocuments({ category: cat, isActive: true })
    }))
  )
  
  const avgPrice = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, avgPrice: { $avg: '$price' } } }
  ])
  
  sendSuccess(res, {
    totalProducts,
    lowStockProducts,
    categories: categoryStats,
    avgPrice: Math.round(avgPrice[0]?.avgPrice || 0 * 100) / 100
  })
})

// GET customer analytics
// GET dynamic sold analytics from Orders (Single Source of Truth)
export const getSoldAnalytics = catchAsync(async (req, res) => {
  console.log(' Fetching sold analytics from Orders (Single Source of Truth)...')
  
  // Calculate sold counts from Orders - Single Source of Truth
  const soldData = await Order.aggregate([
    {
      $match: {
        status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
        paymentStatus: 'paid'
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
        orderCount: { $sum: 1 }
      }
    },
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
        name: '$product.name',
        totalSold: 1,
        totalRevenue: 1,
        orderCount: 1,
        currentStock: '$product.stock',
        availableStock: { $ifNull: [{ $sum: '$product.sizes.stock' }, '$product.stock'] },
        isActive: '$product.isActive'
      }
    },
    { $sort: { totalSold: -1 } }
  ])
  
  // Calculate total sold across all products
  const totalSold = soldData.reduce((sum, item) => sum + item.totalSold, 0)
  
  // Calculate stock analytics
  const stockAnalytics = {
    totalSold,
    stockOut: soldData.filter(item => item.availableStock === 0).length,
    lowStock: soldData.filter(item => item.availableStock > 0 && item.availableStock <= 10).length,
    inStock: soldData.filter(item => item.availableStock > 10).length
  }
  
  console.log(` Sold analytics calculated - Total Sold: ${totalSold}, Products with sales: ${soldData.length}`)
  
  sendSuccess(res, {
    totalSold,
    stockAnalytics,
    productSales: soldData,
    lastUpdated: new Date()
  })
})

// GET customer analytics
export const getCustomerAnalytics = catchAsync(async (req, res) => {
  console.log(' Fetching customer analytics...')
  
  // Get all orders for customer analysis
  const allOrders = await Order.find({}).lean()
  
  // Get only paid orders for revenue calculations
  const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid')
  
  console.log(` Total orders: ${allOrders.length}, Paid orders: ${paidOrders.length}`)
  
  // Unique customers from all orders
  const uniqueCustomersAll = await Order.aggregate([
    {
      $group: {
        _id: '$customer.email',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' }
      }
    },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        avgCustomerValue: { $avg: '$totalSpent' }
      }
    }
  ])
  
  // Unique customers from paid orders only
  const uniqueCustomersPaid = await Order.aggregate([
    {
      $match: { paymentStatus: 'paid' }
    },
    {
      $group: {
        _id: '$customer.email',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$totalAmount' }
      }
    },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        avgCustomerValue: { $avg: '$totalSpent' }
      }
    }
  ])
  
  // Repeat customers (paid orders only)
  const repeatCustomers = await Order.aggregate([
    {
      $match: { paymentStatus: 'paid' }
    },
    {
      $group: {
        _id: '$customer.email',
        orderCount: { $sum: 1 }
      }
    },
    {
      $match: {
        orderCount: { $gt: 1 }
      }
    },
    {
      $count: 'count'
    }
  ])
  
  // Customer acquisition trend (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const newCustomers = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: '$customer.email',
        firstOrderDate: { $min: '$createdAt' }
      }
    },
    {
      $match: {
        firstOrderDate: { $gte: thirtyDaysAgo }
      }
    },
    {
      $count: 'count'
    }
  ])
  
  sendSuccess(res, {
    totalOrders: allOrders.length,
    totalPaidOrders: paidOrders.length,
    totalCustomers: uniqueCustomersAll[0]?.totalCustomers || 0,
    totalPayingCustomers: uniqueCustomersPaid[0]?.totalCustomers || 0,
    avgCustomerValue: Math.round((uniqueCustomersPaid[0]?.avgCustomerValue || 0) * 100) / 100,
    repeatCustomers: repeatCustomers[0]?.count || 0,
    newCustomersLast30Days: newCustomers[0]?.count || 0
  })
})
