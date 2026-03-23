import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { sendSuccess, sendError, catchAsync } from '../utils/errorHandler.js'

// GET analytics data
export const getAnalytics = catchAsync(async (req, res) => {
  const { range = '30', period = 'daily' } = req.query // days
  
  console.log(`📊 Fetching analytics data - Range: ${range} days, Period: ${period}`)
  
  const daysBack = parseInt(range)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  startDate.setHours(0, 0, 0, 0) // Start of day
  
  // Get ONLY PAID orders in range for revenue calculations
  const paidOrders = await Order.find({
    paymentStatus: 'paid',
    createdAt: { $gte: startDate }
  }).lean()
  
  // Get all orders in range for status breakdown
  const allOrders = await Order.find({
    createdAt: { $gte: startDate }
  }).lean()
  
  console.log(`📈 Found ${paidOrders.length} paid orders and ${allOrders.length} total orders`) 
  
  // Calculate revenue metrics from PAID orders only
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const totalPaidOrders = paidOrders.length
  const avgOrderValue = totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0
  const totalProductsSold = paidOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
  
  // Get unique customers from paid orders
  const uniqueCustomers = new Set(paidOrders.map(o => o.customer?.email || o.shippingAddress?.email).filter(Boolean))
  
  // Get status breakdown from ALL orders
  const statusBreakdown = {
    pending: allOrders.filter(o => o.status === 'pending').length,
    confirmed: allOrders.filter(o => o.status === 'confirmed').length,
    processing: allOrders.filter(o => o.status === 'processing').length,
    shipped: allOrders.filter(o => o.status === 'shipped').length,
    delivered: allOrders.filter(o => o.status === 'delivered').length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
    refunded: allOrders.filter(o => o.status === 'refunded').length
  }
  
  // Get payment status breakdown
  const paymentStatusBreakdown = {
    pending: allOrders.filter(o => o.paymentStatus === 'pending').length,
    paid: allOrders.filter(o => o.paymentStatus === 'paid').length,
    failed: allOrders.filter(o => o.paymentStatus === 'failed').length,
    refunded: allOrders.filter(o => o.paymentStatus === 'refunded').length
  }
  
  // Get date-wise data for charts
  let dateData = {}
  
  if (period === 'daily') {
    // Daily data
    for (let i = 0; i < daysBack; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      
      const dayPaidOrders = paidOrders.filter(o => {
        const orderDate = new Date(o.createdAt)
        return orderDate >= date && orderDate < nextDate
      })
      
      const dateStr = date.toISOString().split('T')[0]
      dateData[dateStr] = {
        orders: dayPaidOrders.length,
        revenue: dayPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        customers: new Set(dayPaidOrders.map(o => o.customer?.email || o.shippingAddress?.email).filter(Boolean)).size
      }
    }
  } else if (period === 'monthly') {
    // Monthly data (last 12 months)
    for (let i = 0; i < 12; i++) {
      const date = new Date()
      date.setDate(1) // First day of month
      date.setMonth(date.getMonth() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setMonth(nextDate.getMonth() + 1)
      
      const monthPaidOrders = paidOrders.filter(o => {
        const orderDate = new Date(o.createdAt)
        return orderDate >= date && orderDate < nextDate
      })
      
      const monthStr = date.toISOString().slice(0, 7) // YYYY-MM
      dateData[monthStr] = {
        orders: monthPaidOrders.length,
        revenue: monthPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        customers: new Set(monthPaidOrders.map(o => o.customer?.email || o.shippingAddress?.email).filter(Boolean)).size
      }
    }
  }
  
  // Get top selling products
  const productSales = {}
  paidOrders.forEach(order => {
    order.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          productId: item.productId,
          name: item.name,
          totalQuantity: 0,
          totalRevenue: 0
        }
      }
      productSales[item.productId].totalQuantity += item.quantity
      productSales[item.productId].totalRevenue += item.subtotal || 0
    })
  })
  
  const topSellingProducts = Object.values(productSales)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10)
  
  // Get recent orders (all statuses)
  const recentOrders = await Order.find({})
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()
  
  console.log(`✅ Analytics calculated - Revenue: ₹${totalRevenue}, Orders: ${totalPaidOrders}, Customers: ${uniqueCustomers.size}`)
  
  sendSuccess(res, {
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders: allOrders.length,
      totalPaidOrders,
      totalCustomers: uniqueCustomers.size,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalProductsSold,
      daysRange: daysBack
    },
    statusBreakdown,
    paymentStatusBreakdown,
    dateData,
    topSellingProducts,
    recentOrders
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
  console.log('👥 Fetching customer analytics...')
  
  // Get all orders for customer analysis
  const allOrders = await Order.find({}).lean()
  
  // Get only paid orders for revenue calculations
  const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid')
  
  console.log(`📊 Total orders: ${allOrders.length}, Paid orders: ${paidOrders.length}`)
  
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
