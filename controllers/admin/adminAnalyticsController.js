import Order from '../../models/Order.js'
import Payment from '../../models/Payment.js'
import Product from '../../models/Product.js'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'

/**
 * Get comprehensive admin analytics including revenue validation
 * GET /api/admin/analytics
 */
export const getAdminAnalytics = catchAsync(async (req, res) => {
  const { range = '30', period = 'daily', validate = 'false' } = req.query
  
  console.log(`👑 Admin Analytics - Range: ${range} days, Period: ${period}, Validate: ${validate}`)
  
  const daysBack = parseInt(range)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  startDate.setHours(0, 0, 0, 0)
  
  // Get all orders for analysis
  const allOrders = await Order.find({
    createdAt: { $gte: startDate }
  }).lean()
  
  // Get paid orders for revenue calculations
  const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid')
  
  // Get payments for validation
  const capturedPayments = await Payment.find({
    status: 'captured',
    verifiedAt: { $gte: startDate }
  }).populate('orderId').lean()
  
  console.log(`📊 Data: ${allOrders.length} total orders, ${paidOrders.length} paid orders, ${capturedPayments.length} captured payments`)
  
  // Revenue calculations
  const orderRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const paymentRevenue = capturedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  
  // Revenue validation
  const revenueMatch = Math.abs(orderRevenue - paymentRevenue) < 1 // Allow minor rounding differences
  const revenueDifference = Math.abs(orderRevenue - paymentRevenue)
  
  if (validate === 'true' && !revenueMatch) {
    console.warn(`⚠️ REVENUE MISMATCH DETECTED:`)
    console.warn(`   Orders Revenue: ₹${orderRevenue}`)
    console.warn(`   Payments Revenue: ₹${paymentRevenue}`)
    console.warn(`   Difference: ₹${revenueDifference}`)
  }
  
  // Calculate metrics
  const totalRevenue = orderRevenue
  const totalOrders = allOrders.length
  const totalPaidOrders = paidOrders.length
  const avgOrderValue = totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0
  const totalProductsSold = paidOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
  
  // Customer analytics
  const uniqueCustomers = new Set(paidOrders.map(o => o.customer?.email || o.shippingAddress?.email).filter(Boolean))
  const repeatCustomers = new Set()
  const customerOrders = new Map()
  
  paidOrders.forEach(order => {
    const email = order.customer?.email || order.shippingAddress?.email
    if (email) {
      const count = customerOrders.get(email) || 0
      customerOrders.set(email, count + 1)
      if (count >= 1) repeatCustomers.add(email)
    }
  })
  
  // Status breakdowns
  const statusBreakdown = {
    pending: allOrders.filter(o => o.status === 'pending').length,
    confirmed: allOrders.filter(o => o.status === 'confirmed').length,
    processing: allOrders.filter(o => o.status === 'processing').length,
    shipped: allOrders.filter(o => o.status === 'shipped').length,
    delivered: allOrders.filter(o => o.status === 'delivered').length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
    refunded: allOrders.filter(o => o.status === 'refunded').length
  }
  
  const paymentStatusBreakdown = {
    pending: allOrders.filter(o => o.paymentStatus === 'pending').length,
    paid: allOrders.filter(o => o.paymentStatus === 'paid').length,
    failed: allOrders.filter(o => o.paymentStatus === 'failed').length,
    refunded: allOrders.filter(o => o.paymentStatus === 'refunded').length
  }
  
  // Date-wise revenue data
  let dateData = {}
  
  if (period === 'daily') {
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
        customers: new Set(dayPaidOrders.map(o => o.customer?.email || o.shippingAddress?.email).filter(Boolean)).size,
        avgOrderValue: dayPaidOrders.length > 0 ? dayPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / dayPaidOrders.length : 0
      }
    }
  } else if (period === 'monthly') {
    for (let i = 0; i < 12; i++) {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - i)
      date.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(date)
      nextDate.setMonth(nextDate.getMonth() + 1)
      
      const monthPaidOrders = paidOrders.filter(o => {
        const orderDate = new Date(o.createdAt)
        return orderDate >= date && orderDate < nextDate
      })
      
      const monthStr = date.toISOString().slice(0, 7)
      dateData[monthStr] = {
        orders: monthPaidOrders.length,
        revenue: monthPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        customers: new Set(monthPaidOrders.map(o => o.customer?.email || o.shippingAddress?.email).filter(Boolean)).size,
        avgOrderValue: monthPaidOrders.length > 0 ? monthPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / monthPaidOrders.length : 0
      }
    }
  }
  
  // Top selling products
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
  
  // Recent orders
  const recentOrders = await Order.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
  
  // Get payment method breakdown
  const paymentMethods = {}
  paidOrders.forEach(order => {
    const method = order.paymentMethod || 'unknown'
    paymentMethods[method] = (paymentMethods[method] || 0) + 1
  })
  
  // COD-specific analytics
  const codOrders = allOrders.filter(o => o.paymentMethod === 'cod')
  const codPaidOrders = codOrders.filter(o => o.paymentStatus === 'paid')
  const codPendingOrders = codOrders.filter(o => o.paymentStatus === 'pending')
  const codDeliveredUnpaid = codOrders.filter(o => o.status === 'delivered' && o.paymentStatus === 'pending')
  
  const codRevenue = codPaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const codPendingAmount = codPendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const codDeliveredUnpaidAmount = codDeliveredUnpaid.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  
  console.log(`💰 COD Analytics - Paid Orders: ${codPaidOrders.length}, Revenue: ₹${codRevenue}, Pending Collection: ₹${codDeliveredUnpaidAmount}`)
  
  // Revenue by payment status (for debugging)
  const revenueByPaymentStatus = {
    paid: paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    pending: allOrders.filter(o => o.paymentStatus === 'pending').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    failed: allOrders.filter(o => o.paymentStatus === 'failed').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    refunded: allOrders.filter(o => o.paymentStatus === 'refunded').reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  }
  
  console.log(`✅ Admin Analytics Complete - Revenue: ₹${totalRevenue}, Match: ${revenueMatch}`)
  
  const response = {
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      totalPaidOrders,
      totalCustomers: uniqueCustomers.size,
      repeatCustomers: repeatCustomers.size,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalProductsSold,
      daysRange: daysBack,
      revenueValidation: {
        orderRevenue: Math.round(orderRevenue * 100) / 100,
        paymentRevenue: Math.round(paymentRevenue * 100) / 100,
        revenueMatch,
        revenueDifference: Math.round(revenueDifference * 100) / 100
      },
      codAnalytics: {
        totalCODOrders: codOrders.length,
        codPaidOrders: codPaidOrders.length,
        codPendingOrders: codPendingOrders.length,
        codDeliveredUnpaid: codDeliveredUnpaid.length,
        codRevenue: Math.round(codRevenue * 100) / 100,
        codPendingAmount: Math.round(codPendingAmount * 100) / 100,
        codDeliveredUnpaidAmount: Math.round(codDeliveredUnpaidAmount * 100) / 100
      }
    },
    statusBreakdown,
    paymentStatusBreakdown,
    paymentMethods,
    revenueByPaymentStatus,
    dateData,
    topSellingProducts,
    recentOrders: recentOrders.slice(0, 10),
    validation: validate === 'true' ? {
      revenueMatch,
      orderRevenue,
      paymentRevenue,
      difference: revenueDifference,
      mismatchedOrders: !revenueMatch ? await findMismatchedOrders(paidOrders, capturedPayments) : []
    } : null
  }
  
  sendSuccess(res, response)
})

/**
 * Find mismatched orders for debugging
 */
async function findMismatchedOrders(orders, payments) {
  const mismatches = []
  
  // Create maps for easier lookup
  const paymentMap = new Map()
  payments.forEach(p => {
    if (p.orderId) {
      paymentMap.set(p.orderId.toString(), p)
    }
  })
  
  orders.forEach(order => {
    const payment = paymentMap.get(order._id.toString())
    if (!payment || Math.abs(order.totalAmount - payment.amount) > 1) {
      mismatches.push({
        orderId: order._id,
        orderAmount: order.totalAmount,
        paymentAmount: payment?.amount || 0,
        paymentStatus: payment?.status || 'no_payment',
        paymentId: payment?._id || null
      })
    }
  })
  
  return mismatches.slice(0, 10) // Limit to 10 for readability
}

/**
 * Get revenue validation report
 * GET /api/admin/analytics/validate-revenue
 */
export const validateRevenue = catchAsync(async (req, res) => {
  console.log('🔍 Running revenue validation...')
  
  // Get all paid orders
  const paidOrders = await Order.find({ paymentStatus: 'paid' }).lean()
  
  // Get all captured payments
  const capturedPayments = await Payment.find({ status: 'captured' }).populate('orderId').lean()
  
  // Calculate revenues
  const orderRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const paymentRevenue = capturedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  
  // Find mismatches
  const paymentMap = new Map()
  capturedPayments.forEach(p => {
    if (p.orderId) {
      paymentMap.set(p.orderId.toString(), p)
    }
  })
  
  const mismatches = []
  paidOrders.forEach(order => {
    const payment = paymentMap.get(order._id.toString())
    if (!payment) {
      mismatches.push({
        type: 'missing_payment',
        orderId: order._id,
        orderAmount: order.totalAmount,
        paymentId: null
      })
    } else if (Math.abs(order.totalAmount - payment.amount) > 1) {
      mismatches.push({
        type: 'amount_mismatch',
        orderId: order._id,
        orderAmount: order.totalAmount,
        paymentAmount: payment.amount,
        paymentId: payment._id,
        difference: Math.abs(order.totalAmount - payment.amount)
      })
    }
  })
  
  // Find payments without orders
  const orphanedPayments = capturedPayments.filter(p => !p.orderId)
  
  const validation = {
    summary: {
      totalOrders: paidOrders.length,
      totalPayments: capturedPayments.length,
      orderRevenue: Math.round(orderRevenue * 100) / 100,
      paymentRevenue: Math.round(paymentRevenue * 100) / 100,
      revenueDifference: Math.abs(Math.round((orderRevenue - paymentRevenue) * 100) / 100),
      revenueMatch: Math.abs(orderRevenue - paymentRevenue) < 1
    },
    mismatches: mismatches.slice(0, 20), // Limit results
    orphanedPayments: orphanedPayments.slice(0, 10),
    mismatchCount: mismatches.length,
    orphanedPaymentCount: orphanedPayments.length
  }
  
  console.log(`✅ Revenue validation complete - Match: ${validation.summary.revenueMatch}, Mismatches: ${mismatches.length}`)
  
  sendSuccess(res, validation)
})

export default {
  getAdminAnalytics,
  validateRevenue
}
