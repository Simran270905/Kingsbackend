import Order, { default as OrderDefault } from '../models/Order.js'
import ShiprocketService from '../services/shiprocketService.js'

// Get all orders with pagination and filtering
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      fromDate,
      toDate
    } = req.query

    // Build query
    const query = {}

    // Status filter
    if (status && status !== 'all') {
      query.status = status
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      query['payment.status'] = paymentStatus
    }

    // Date range filter
    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate)
      }
      if (toDate) {
        query.createdAt.$lte = new Date(toDate)
      }
    }

    // Search filter
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ]
    }

    // Sort options
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('items.productId', 'name images price')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()

    // Get total count
    const total = await Order.countDocuments(query)

    // Calculate summary statistics
    const stats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] }
          },
          totalOrders: { $sum: 1 },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          avgOrderValue: {
            $avg: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', null] }
          }
        }
      }
    ])

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        cancelledOrders: 0,
        avgOrderValue: 0
      }
    })

  } catch (error) {
    console.error('Get all orders error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get orders'
    })
  }
}

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params

    const order = await Order.findById(id)
      .populate('items.productId', 'name images price description')
      .lean()

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    res.status(200).json({
      success: true,
      order
    })

  } catch (error) {
    console.error('Get order by ID error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get order'
    })
  }
}

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes } = req.body

    const validStatuses = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded']
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      })
    }

    const order = await Order.findById(id)
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    // Update status and timestamps
    order.status = status
    
    if (status === 'delivered') {
      order.shipping.deliveredAt = new Date()
    } else if (status === 'cancelled') {
      order.cancelledAt = new Date()
      order.cancellationReason = notes || 'Cancelled by admin'
    }

    if (notes) {
      order.notes = notes
    }

    await order.save()

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    })

  } catch (error) {
    console.error('Update order status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    })
  }
}

// Sync Shiprocket status
const syncShiprocketStatus = async (req, res) => {
  try {
    const { id } = req.params

    const order = await Order.findById(id)
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    if (!order.shipping.awbCode) {
      return res.status(400).json({
        success: false,
        message: 'No AWB code available for tracking'
      })
    }

    // Get live tracking from Shiprocket
    const shiprocketService = new ShiprocketService()
    const trackingData = await shiprocketService.getTracking(order.shipping.awbCode)

    // Update order with latest tracking data
    if (trackingData.tracking_data) {
      const latestStatus = trackingData.tracking_data[trackingData.tracking_data.length - 1]
      
      // Map Shiprocket status to our status
      const statusMapping = {
        'NEW': 'processing',
        'PICKUP GENERATED': 'processing',
        'PICKED UP': 'shipped',
        'IN TRANSIT': 'shipped',
        'OUT FOR DELIVERY': 'out_for_delivery',
        'DELIVERED': 'delivered',
        'CANCELLED': 'cancelled',
        'RETURNED': 'returned'
      }

      order.shipping.status = statusMapping[latestStatus.status] || order.shipping.status
      
      if (latestStatus.status === 'DELIVERED') {
        order.status = 'delivered'
        order.shipping.deliveredAt = new Date()
      }
    }

    await order.save()

    res.status(200).json({
      success: true,
      message: 'Shiprocket status synced successfully',
      order,
      trackingData
    })

  } catch (error) {
    console.error('Sync Shiprocket status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to sync Shiprocket status'
    })
  }
}

// Export orders to CSV
const exportOrders = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      search,
      fromDate,
      toDate,
      format = 'csv'
    } = req.query

    // Build query (same as getAllOrders)
    const query = {}

    if (status && status !== 'all') {
      query.status = status
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query['payment.status'] = paymentStatus
    }

    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate)
      }
      if (toDate) {
        query.createdAt.$lte = new Date(toDate)
      }
    }

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ]
    }

    // Get orders
    const orders = await Order.find(query)
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .lean()

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = [
        'Order ID',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Address',
        'Items Count',
        'Subtotal',
        'Shipping',
        'Discount',
        'Total',
        'Order Status',
        'AWB Code',
        'Courier',
        'Created Date',
        'Notes'
      ].join(',')

      const csvRows = orders.map(order => {
        const address = `${order.customer.address.line1}, ${order.customer.address.city}, ${order.customer.address.state} - ${order.customer.address.pincode}`
        
        return [
          `"${order.orderId}"`,
          `"${order.customer.name}"`,
          `"${order.customer.email}"`,
          `"${order.customer.phone}"`,
          `"${address}"`,
          order.items.length,
          order.subtotal,
          order.shippingCharge,
          order.discount,
          order.total,
          `"${order.status}"`,
          `"${order.shipping.awbCode || ''}"`,
          `"${order.shipping.courierName || ''}"`,
          `"${order.createdAt.toISOString()}"`,
          `"${order.notes || ''}"`
        ].join(',')
      })

      const csvContent = [csvHeader, ...csvRows].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`)
      res.status(200).send(csvContent)
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        orders
      })
    }

  } catch (error) {
    console.error('Export orders error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to export orders'
    })
  }
}

// Get analytics summary
const getAnalyticsSummary = async (req, res) => {
  try {
    const { from, to } = req.query

    // Build date filter
    const dateFilter = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) {
        dateFilter.createdAt.$gte = new Date(from)
      }
      if (to) {
        dateFilter.createdAt.$lte = new Date(to)
      }
    }

    const summary = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] }
          },
          totalOrders: { $sum: 1 },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          avgOrderValue: {
            $avg: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', null] }
          },
          totalItemsSold: {
            $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, { $sum: '$items.quantity' }, 0] }
          }
        }
      }
    ])

    // Get new customers (first-time buyers)
    const newCustomers = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$customer.email',
          firstOrder: { $min: '$createdAt' }
        }
      },
      {
        $match: {
          firstOrder: {
            $gte: from ? new Date(from) : new Date(0),
            $lte: to ? new Date(to) : new Date()
          }
        }
      },
      {
        $count: 'newCustomers'
      }
    ])

    const result = summary[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      cancelledOrders: 0,
      avgOrderValue: 0,
      totalItemsSold: 0
    }

    result.newCustomers = newCustomers[0]?.newCustomers || 0

    res.status(200).json({
      success: true,
      summary: result
    })

  } catch (error) {
    console.error('Get analytics summary error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics summary'
    })
  }
}

// Get revenue chart data
const getRevenueChart = async (req, res) => {
  try {
    const { groupBy = 'day', from, to } = req.query

    // Build date filter
    const dateFilter = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) {
        dateFilter.createdAt.$gte = new Date(from)
      }
      if (to) {
        dateFilter.createdAt.$lte = new Date(to)
      }
    }

    // Group by format
    let groupFormat
    switch (groupBy) {
      case 'week':
        groupFormat = { $dateToString: { format: '%Y-%U', date: '$createdAt' } }
        break
      case 'month':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
        break
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
    }

    const revenueData = await Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    const chartData = revenueData.map(item => ({
      date: item._id,
      revenue: item.revenue,
      orders: item.orders
    }))

    res.status(200).json({
      success: true,
      chartData
    })

  } catch (error) {
    console.error('Get revenue chart error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue chart'
    })
  }
}

// Get top products
const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, from, to } = req.query

    // Build date filter
    const dateFilter = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) {
        dateFilter.createdAt.$gte = new Date(from)
      }
      if (to) {
        dateFilter.createdAt.$lte = new Date(to)
      }
    }

    const topProducts = await Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ])

    res.status(200).json({
      success: true,
      topProducts
    })

  } catch (error) {
    console.error('Get top products error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get top products'
    })
  }
}

// Get order status breakdown
const getOrderStatusBreakdown = async (req, res) => {
  try {
    const { from, to } = req.query

    // Build date filter
    const dateFilter = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) {
        dateFilter.createdAt.$gte = new Date(from)
      }
      if (to) {
        dateFilter.createdAt.$lte = new Date(to)
      }
    }

    const statusBreakdown = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    // Get total for percentage calculation
    const totalOrders = await Order.countDocuments(dateFilter)

    const breakdown = statusBreakdown.map(item => ({
      status: item._id,
      count: item.count,
      percentage: totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(2) : 0
    }))

    res.status(200).json({
      success: true,
      breakdown
    })

  } catch (error) {
    console.error('Get order status breakdown error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get order status breakdown'
    })
  }
}

// Get shipping performance
const getShippingPerformance = async (req, res) => {
  try {
    const { from, to } = req.query

    // Build date filter
    const dateFilter = {}
    if (from || to) {
      dateFilter.createdAt = {}
      if (from) {
        dateFilter.createdAt.$gte = new Date(from)
      }
      if (to) {
        dateFilter.createdAt.$lte = new Date(to)
      }
    }

    // Calculate average delivery days
    const deliveryStats = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          status: 'delivered',
          'shipping.deliveredAt': { $exists: true }
        } 
      },
      {
        $project: {
          deliveryDays: {
            $divide: [
              { $subtract: ['$shipping.deliveredAt', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert milliseconds to days
            ]
          },
          courierName: '$shipping.courierName'
        }
      },
      {
        $group: {
          _id: null,
          avgDeliveryDays: { $avg: '$deliveryDays' },
          totalDeliveries: { $sum: 1 }
        }
      }
    ])

    // Calculate on-time delivery rate (assuming 5 days is on-time)
    const onTimeStats = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          status: 'delivered',
          'shipping.deliveredAt': { $exists: true }
        } 
      },
      {
        $project: {
          deliveryDays: {
            $divide: [
              { $subtract: ['$shipping.deliveredAt', '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          onTimeDeliveries: {
            $sum: { $cond: [{ $lte: ['$deliveryDays', 5] }, 1, 0] }
          },
          totalDeliveries: { $sum: 1 }
        }
      }
    ])

    // Get return rate
    const returnStats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          returnedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
          },
          totalOrders: { $sum: 1 }
        }
      }
    ])

    // Get courier breakdown
    const courierBreakdown = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          'shipping.courierName': { $exists: true, $ne: null },
          status: 'delivered',
          'shipping.deliveredAt': { $exists: true }
        } 
      },
      {
        $project: {
          courierName: '$shipping.courierName',
          deliveryDays: {
            $divide: [
              { $subtract: ['$shipping.deliveredAt', '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: '$courierName',
          shipments: { $sum: 1 },
          avgDays: { $avg: '$deliveryDays' }
        }
      },
      { $sort: { shipments: -1 } }
    ])

    const result = {
      avgDeliveryDays: deliveryStats[0]?.avgDeliveryDays?.toFixed(2) || 0,
      onTimeDeliveryRate: onTimeStats[0] ? 
        ((onTimeStats[0].onTimeDeliveries / onTimeStats[0].totalDeliveries) * 100).toFixed(2) : 0,
      returnRate: returnStats[0] ? 
        ((returnStats[0].returnedOrders / returnStats[0].totalOrders) * 100).toFixed(2) : 0,
      courierBreakdown
    }

    res.status(200).json({
      success: true,
      shippingPerformance: result
    })

  } catch (error) {
    console.error('Get shipping performance error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get shipping performance'
    })
  }
}

export {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  syncShiprocketStatus,
  exportOrders,
  getAnalyticsSummary,
  getRevenueChart,
  getTopProducts,
  getOrderStatusBreakdown,
  getShippingPerformance
}
