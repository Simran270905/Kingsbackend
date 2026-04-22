import Order, { default as OrderDefault } from '../../models/Order.js'
import Product from '../../models/Product.js'
import { sendSuccess, sendError, catchAsync } from '../../middleware/errorHandler.js'
import { sendReviewEmail } from '../../services/reviewEmailService.js'

/**
 * Handle Shiprocket webhook for order status updates
 * POST /api/webhooks/shiprocket
 */
export const handleShiprocketWebhook = catchAsync(async (req, res) => {
  console.log(' Shiprocket webhook received:', JSON.stringify(req.body, null, 2))
  
  const { 
    order_id, 
    shipment_id, 
    status, 
    status_id, 
    shipment_status, 
    shipment_status_id,
    awb_code,
    tracking_data,
    order_id: shiprocketOrderId
  } = req.body

  // Validate required fields
  if (!order_id && !shiprocketOrderId) {
    return sendError(res, 'Order ID is required', 400)
  }

  if (!status) {
    return sendError(res, 'Status is required', 400)
  }

  // Find the order by Shiprocket order ID
  const order = await Order.findOne({
    $or: [
      { shiprocketOrderId: order_id },
      { shiprocketOrderId: shiprocketOrderId },
      { shipmentId: shipment_id }
    ]
  })

  if (!order) {
    console.log(' Order not found for webhook:', { order_id, shiprocketOrderId, shipment_id })
    return sendError(res, 'Order not found', 404)
  }

  console.log(` Found order ${order._id} for webhook processing`)

  // Store webhook data for idempotency
  const webhookData = {
    shiprocketOrderId: order_id || shiprocketOrderId,
    shipmentId: shipment_id,
    status,
    statusId: status_id,
    shipmentStatus,
    shipmentStatusId: shipment_status_id,
    awbCode: awb_code,
    trackingData: tracking_data,
    processedAt: new Date()
  }

  // Check if this webhook was already processed (idempotency)
  if (order.lastWebhookData) {
    const lastWebhook = JSON.parse(order.lastWebhookData)
    if (lastWebhook.shiprocketOrderId === webhookData.shiprocketOrderId && 
        lastWebhook.status === webhookData.status &&
        lastWebhook.processedAt &&
        new Date(lastWebhook.processedAt).toISOString() === new Date(webhookData.processedAt).toISOString()) {
      console.log(' Duplicate webhook detected, skipping')
      return sendSuccess(res, { message: 'Webhook already processed' })
    }
  }

  // Update order with webhook data
  order.shiprocketStatus = status
  order.shiprocketStatusId = status_id
  order.shiprocketShipmentStatus = shipment_status
  order.shiprocketShipmentStatusId = shipment_status_id
  order.trackingUpdatedAt = new Date()
  order.lastWebhookData = JSON.stringify(webhookData)

  // Handle stock synchronization based on status
  await handleStockSynchronization(order, status, shipment_status)

  // Update AWB code if provided
  if (awb_code && !order.awbCode) {
    order.awbCode = awb_code
    order.awbNumber = awb_code
  }

  // Update order status based on shipment status
  if (shipment_status) {
    switch (shipment_status.toLowerCase()) {
      case 'delivered':
        order.status = 'delivered'
        order.deliveredAt = new Date()
        order.paymentStatus = order.paymentMethod === 'cod' ? 'paid' : order.paymentStatus
        if (order.paymentMethod === 'cod') {
          order.amountPaid = order.totalAmount
          order.paymentDate = new Date()
        }
        
        // AUTOMATIC REVIEW EMAIL: Send review email when Shiprocket confirms delivery
        console.log(`Shiprocket confirmed delivery for order ${order._id} - sending review email...`)
        
        // Send review email asynchronously (don't block webhook response)
        sendReviewEmail(order).then(success => {
          if (success) {
            console.log(`Review email sent successfully for order ${order._id} (Shiprocket webhook)`)
          } else {
            console.error(`Failed to send review email for order ${order._id} (Shiprocket webhook)`)
          }
        }).catch(error => {
          console.error(`Error sending review email for order ${order._id} (Shiprocket webhook):`, error)
        })
        
        break
      
      case 'cancelled':
      case 'rto':
      case 'returned':
        order.status = 'cancelled'
        order.cancelledAt = new Date()
        order.cancellationReason = `Shiprocket: ${shipment_status}`
        break
      
      case 'in_transit':
      case 'dispatched':
        order.status = 'shipped'
        break
      
      case 'out_for_delivery':
        order.status = 'shipped'
        break
    }
  }

  await order.save()

  console.log(` Order ${order._id} updated with webhook data:`, {
    status: order.status,
    shiprocketStatus: order.shiprocketStatus,
    shipmentStatus: order.shiprocketShipmentStatus
  })

  // Trigger analytics and reports refresh for real-time updates
  setTimeout(async () => {
    try {
      // Refresh Analytics
      await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/analytics/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'admin-token'}`
        }
      })
      console.log(' Analytics refresh triggered after webhook processing')
      
      // Refresh Reports
      await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/reports/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'admin-token'}`
        }
      })
      console.log(' Reports refresh triggered after webhook processing')
    } catch (error) {
      console.log(' Analytics/Reports refresh failed (non-critical):', error.message)
    }
  }, 500)

  sendSuccess(res, {
    message: 'Webhook processed successfully',
    orderId: order._id,
    status: order.status,
    shiprocketStatus: order.shiprocketStatus
  })
})

/**
 * Handle stock synchronization based on shipment status
 */
async function handleStockSynchronization(order, status, shipmentStatus) {
  console.log(` Handling stock sync for order ${order._id}: status=${status}, shipmentStatus=${shipmentStatus}`)

  try {
    // Only process stock changes for final statuses
    const finalStatuses = ['delivered', 'cancelled', 'rto', 'returned']
    const normalizedShipmentStatus = (shipmentStatus || '').toLowerCase()
    
    if (finalStatuses.includes(normalizedShipmentStatus)) {
      const isDelivered = normalizedShipmentStatus === 'delivered'
      const isCancelled = ['cancelled', 'rto', 'returned'].includes(normalizedShipmentStatus)

      console.log(` Processing stock sync - Delivered: ${isDelivered}, Cancelled: ${isCancelled}`)

      for (const item of order.items) {
        try {
          if (isDelivered) {
            // Stock already reduced when order was placed, just confirm the sale
            console.log(` Delivery confirmed for ${item.name}: ${item.quantity} units sold`)
          } else if (isCancelled) {
            // Restore stock for cancelled/returned orders
            await Product.updateStockAtomically(
              item.productId,
              item.quantity,
              'increase',
              item.selectedSize
            )
            
            console.log(` Stock restored for ${item.name}: +${item.quantity} units (cancelled/returned)`)
          }
        } catch (error) {
          console.error(` Failed to sync stock for ${item.name}:`, error)
          // Continue with other items
        }
      }
    } else {
      console.log(` Non-final status ${shipmentStatus}, skipping stock sync`)
    }
  } catch (error) {
    console.error(' Stock synchronization error:', error)
    // Don't fail the webhook, just log the error
  }
}

/**
 * Get webhook processing status for an order
 * GET /api/webhooks/shiprocket/status/:orderId
 */
export const getWebhookStatus = catchAsync(async (req, res) => {
  const { orderId } = req.params
  
  const order = await Order.findById(orderId).select({
    shiprocketStatus: 1,
    shiprocketStatusId: 1,
    shiprocketShipmentStatus: 1,
    shiprocketShipmentStatusId: 1,
    trackingUpdatedAt: 1,
    lastWebhookData: 1,
    awbCode: 1,
    trackingNumber: 1
  })

  if (!order) {
    return sendError(res, 'Order not found', 404)
  }

  const webhookData = order.lastWebhookData ? JSON.parse(order.lastWebhookData) : null

  sendSuccess(res, {
    orderId: order._id,
    shiprocketStatus: order.shiprocketStatus,
    shiprocketStatusId: order.shiprocketStatusId,
    shiprocketShipmentStatus: order.shiprocketShipmentStatus,
    shiprocketShipmentStatusId: order.shiprocketShipmentStatusId,
    trackingUpdatedAt: order.trackingUpdatedAt,
    awbCode: order.awbCode,
    trackingNumber: order.trackingNumber,
    lastWebhookData: webhookData
  })
})
