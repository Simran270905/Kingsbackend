import Product from '../../models/Product.js'
import Order from '../../models/Order.js'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'

// ======================
// 📊 GET DASHBOARD STATS
// ======================
export const getDashboardStats = catchAsync(async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...')

    // Fetch products and orders in parallel
    const [products, orders] = await Promise.all([
      Product.find({}).lean(),
      Order.find({}).lean()
    ])

    console.log(`📦 Found ${products.length} products`)
    console.log(`📋 Found ${orders.length} orders`)

    // Calculate Total Products
    const totalProducts = products.length

    // Calculate Total Revenue (only delivered orders)
    const totalRevenue = orders
      .filter(order => order.status === 'delivered')
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0)

    // Calculate Pending Orders
    const pendingOrders = orders.filter(order => order.status === 'pending').length

    // Calculate Low Stock Products (stock <= 5)
    const lowStock = products.filter(product => {
      const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || product.stock || 0
      return totalStock <= 5
    }).length

    // Get Recent Products (last 5 added)
    const recentProducts = products
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(product => ({
        _id: product._id,
        name: product.name,
        price: product.sellingPrice || product.price,
        stock: product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || product.stock || 0,
        image: product.images?.[0] || '/placeholder-product.jpg'
      }))

    // Additional metrics
    const totalOrders = orders.length
    const processingOrders = orders.filter(order => order.status === 'processing').length
    const deliveredOrders = orders.filter(order => order.status === 'delivered').length

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const dashboardData = {
      // Main metrics
      totalProducts,
      totalRevenue,
      pendingOrders,
      lowStock,
      
      // Additional metrics
      totalOrders,
      processingOrders,
      deliveredOrders,
      averageOrderValue,
      
      // Recent data
      recentProducts,
      
      // Timestamp
      lastUpdated: new Date().toISOString()
    }

    console.log('✅ Dashboard stats calculated successfully')
    console.log(`📊 Total Products: ${totalProducts}`)
    console.log(`💰 Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`)
    console.log(`⏳ Pending Orders: ${pendingOrders}`)
    console.log(`⚠️ Low Stock Products: ${lowStock}`)

    sendSuccess(res, dashboardData, 200, 'Dashboard stats retrieved successfully')
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error)
    sendError(res, 'Failed to fetch dashboard stats', 500)
  }
})

// ======================
// 🔄 REFRESH DASHBOARD DATA
// ======================
export const refreshDashboard = catchAsync(async (req, res) => {
  try {
    console.log('🔄 Refreshing dashboard data...')
    
    // This is essentially the same as getDashboardStats but can be used for explicit refresh
    const result = await getDashboardStats(req, res)
    return result
  } catch (error) {
    console.error('❌ Error refreshing dashboard:', error)
    sendError(res, 'Failed to refresh dashboard', 500)
  }
})
