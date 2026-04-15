import crypto from 'crypto'
import Order from '../models/Order.js'
import { createShiprocketOrder } from '../services/shiprocket.service.js'
import { sendOrderConfirmationEmail } from '../services/email.service.js'

// Verify Razorpay payment and create order
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cartItems,
      shippingAddress,
      customer
    } = req.body

    // Verify Razorpay signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex")

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment verification failed - invalid signature" 
      })
    }

    // Calculate totals
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
    const shippingCharge = subtotal > 500 ? 0 : 50 // Free shipping above 500
    const discount = 0 // Can be implemented later
    const total = subtotal + shippingCharge - discount

    // Create order with verified payment
    const order = new Order({
      customer: {
        userId: customer.userId || null,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || '',
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          country: shippingAddress.country || 'India'
        }
      },
      items: cartItems.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image
      })),
      payment: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        method: 'razorpay',
        status: 'paid',
        paidAt: new Date(),
        amount: total,
        currency: 'INR'
      },
      status: 'confirmed',
      subtotal,
      shippingCharge,
      discount,
      total,
      notes: customer.notes || ''
    })

    // Save order to database
    const savedOrder = await order.save()

    // Create Shiprocket order
    try {
      const shiprocketResponse = await createShiprocketOrder(savedOrder)
      
      // Update order with Shiprocket details
      savedOrder.shipping.shiprocketOrderId = shiprocketResponse.order_id
      savedOrder.shipping.shiprocketShipmentId = shiprocketResponse.shipment_id
      savedOrder.shipping.status = 'processing'
      await savedOrder.save()
    } catch (shiprocketError) {
      console.error('Shiprocket order creation failed:', shiprocketError)
      // Continue with order creation even if Shiprocket fails
      // Admin can manually create shipment later
    }

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(savedOrder)
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Continue with order creation even if email fails
    }

    res.status(201).json({ 
      success: true, 
      orderId: savedOrder.orderId,
      message: "Order confirmed!",
      order: savedOrder
    })

  } catch (error) {
    console.error('Payment verification error:', error)
    res.status(500).json({ 
      success: false, 
      message: "Payment verification failed" 
    })
  }
}

// Handle Shiprocket webhook
const handleShiprocketWebhook = async (req, res) => {
  try {
    const { order_id, current_status, awb_code, courier_name, tracking_url } = req.body

    // Find order by Shiprocket order ID
    const order = await Order.findOne({ 'shipping.shiprocketOrderId': order_id })
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      })
    }

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

    // Update shipping details
    order.shipping.status = statusMapping[current_status] || order.shipping.status
    order.shipping.awbCode = awb_code || order.shipping.awbCode
    order.shipping.courierName = courier_name || order.shipping.courierName
    order.shipping.trackingUrl = tracking_url || order.shipping.trackingUrl

    // Update order status based on shipping status
    if (current_status === 'DELIVERED') {
      order.status = 'delivered'
      order.shipping.deliveredAt = new Date()
    } else if (current_status === 'CANCELLED') {
      order.status = 'cancelled'
    } else if (current_status === 'RETURNED') {
      order.status = 'returned'
    }

    await order.save()

    // Send shipping update email if order is shipped
    if (current_status === 'PICKED UP' || current_status === 'IN TRANSIT') {
      try {
        const { sendShippingUpdateEmail } = await import('../services/email.service.js')
        await sendShippingUpdateEmail(order)
      } catch (emailError) {
        console.error('Failed to send shipping update email:', emailError)
      }
    }

    res.status(200).json({ 
      success: true, 
      message: "Webhook processed successfully" 
    })

  } catch (error) {
    console.error('Shiprocket webhook error:', error)
    res.status(500).json({ 
      success: false, 
      message: "Webhook processing failed" 
    })
  }
}

// Get order details by order ID
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await Order.findOne({ orderId })
      .populate('items.productId', 'name images price')
      .lean()

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      })
    }

    res.status(200).json({ 
      success: true, 
      order 
    })

  } catch (error) {
    console.error('Get order details error:', error)
    res.status(500).json({ 
      success: false, 
      message: "Failed to get order details" 
    })
  }
}

// Track order by order ID
const trackOrder = async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await Order.findOne({ orderId })

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      })
    }

    let trackingData = {
      status: order.shipping.status,
      courierName: order.shipping.courierName,
      trackingUrl: order.shipping.trackingUrl,
      estimatedDelivery: order.shipping.estimatedDelivery,
      history: []
    }

    // If AWB code exists, get live tracking from Shiprocket
    if (order.shipping.awbCode) {
      try {
        const { trackShipment } = await import('../services/shiprocket.service.js')
        const shiprocketTracking = await trackShipment(order.shipping.awbCode)
        
        trackingData = {
          ...trackingData,
          ...shiprocketTracking,
          awbCode: order.shipping.awbCode
        }
      } catch (trackingError) {
        console.error('Failed to get live tracking:', trackingError)
        // Return stored tracking data if live tracking fails
      }
    }

    res.status(200).json({ 
      success: true, 
      tracking: trackingData 
    })

  } catch (error) {
    console.error('Track order error:', error)
    res.status(500).json({ 
      success: false, 
      message: "Failed to track order" 
    })
  }
}

export {
  verifyPayment,
  handleShiprocketWebhook,
  getOrderDetails,
  trackOrder
}
