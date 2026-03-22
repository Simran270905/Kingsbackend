import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'

// GET analytics data
export const getAnalytics = catchAsync(async (req, res) => {
  const { range = '30' } = req.query // days
  
  const daysBack = parseInt(range)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  
  // Get orders in range
  const orders = await Order.find({
    createdAt: { $gte: startDate }
  })
  
  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const totalProductsSold = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
  
  // Get status breakdown
  const statusBreakdown = {
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  }
  
  // Get daily data for chart
  const dailyData = {}
  const dayCount = Math.min(daysBack, 30)
  
  for (let i = 0; i < dayCount; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayOrders = orders.filter(o => {
      const oDate = new Date(o.createdAt).toISOString().split('T')[0]
      return oDate === dateStr
    })
    
    dailyData[dateStr] = {
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    }
  }
  
  sendSuccess(res, {
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalProductsSold,
      daysRange: daysBack
    },
    statusBreakdown,
    dailyData,
    monthlyData: [] // Can be calculated separately if needed
  })
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
export const getCustomerAnalytics = catchAsync(async (req, res) => {
  const totalOrders = await Order.countDocuments()
  
  const uniqueCustomers = await Order.aggregate([
    {
      $group: {
        _id: '$customer.email',
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$total' }
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
  
  const repeatCustomers = await Order.aggregate([
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
  
  sendSuccess(res, {
    totalOrders,
    totalCustomers: uniqueCustomers[0]?.totalCustomers || 0,
    avgCustomerValue: Math.round((uniqueCustomers[0]?.avgCustomerValue || 0) * 100) / 100,
    repeatCustomers: repeatCustomers[0]?.count || 0
  })
})
