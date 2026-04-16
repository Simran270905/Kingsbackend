const axios = require('axios')

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1'

// Global token cache to prevent repeated login attempts
let shiprocketToken = null
let tokenExpiry = null
let lastLoginAttempt = 0

// Rate limiting guard to prevent repeated login attempts
const safeLoginGuard = () => {
  const now = Date.now()
  if (now - lastLoginAttempt < 10000) { // 10 second cooldown
    throw new Error('Shiprocket login blocked: Too many attempts. Please wait.')
  }
  lastLoginAttempt = now
}

// Enhanced token management with proactive expiry validation
const getShiprocketToken = async () => {
  const now = Date.now()
  
  // Check if token is expired or will expire within 5 minutes (300000 ms)
  const fiveMinutesFromNow = now + 300000
  
  if (shiprocketToken && tokenExpiry && tokenExpiry > fiveMinutesFromNow) {
    console.log('✅ Using valid Shiprocket token (expires in:', Math.floor((tokenExpiry - now) / 60000), 'minutes)')
    return shiprocketToken
  }

  // Rate limiting protection
  safeLoginGuard()

  try {
    console.log('🔐 Authenticating with Shiprocket API...')
    
    // Validate environment variables first (with fallbacks)
    const shiprocketEmail = process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL
    const shiprocketPassword = process.env.SHIPROCKET_API_PASSWORD || process.env.SHIPROCKET_PASSWORD
    
    if (!shiprocketEmail || !shiprocketPassword) {
      throw new Error('Shiprocket credentials not configured in environment variables. Set SHIPROCKET_EMAIL/SHIPROCKET_API_EMAIL and SHIPROCKET_PASSWORD/SHIPROCKET_API_PASSWORD')
    }
    
    console.log('🔍 Shiprocket credentials validation passed')
    
    const response = await axios.post(
      `${SHIPROCKET_BASE_URL}/external/auth/login`,
      {
        email: shiprocketEmail,
        password: shiprocketPassword,
      },
      {
        timeout: 15000 // 15 second timeout
      }
    )

    if (!response.data || !response.data.token) {
      console.error('❌ Shiprocket authentication failed: Invalid response format')
      throw new Error('Shiprocket authentication failed: Invalid response format')
    }

    // Cache the token globally (ensure clean token without whitespace)
    shiprocketToken = response.data.token.trim()
    // Shiprocket tokens typically expire in 24 hours, but we'll use 23 hours for safety
    tokenExpiry = now + (23 * 60 * 60 * 1000)
    
    console.log('✅ Shiprocket authentication successful')
    console.log('🕐 Token expires at:', new Date(tokenExpiry))
    console.log('🔑 Token length:', shiprocketToken.length)
    return shiprocketToken

  } catch (error) {
    console.error('❌ Shiprocket login failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: `${SHIPROCKET_BASE_URL}/external/auth/login`
    })
    
    // DO NOT RETRY - Fail fast to prevent account blocking
    throw new Error(`Shiprocket authentication failed: ${error.response?.data?.message || error.message}`)
  }
}

class ShiprocketService {
  constructor() {
    // Use global cache instead of instance variables
  }

  validateConfig() {
    const shiprocketEmail = process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL
    const shiprocketPassword = process.env.SHIPROCKET_API_PASSWORD || process.env.SHIPROCKET_PASSWORD
    
    if (!shiprocketEmail || !shiprocketPassword) {
      throw new Error('Shiprocket API email and password are not configured. Please set SHIPROCKET_EMAIL/SHIPROCKET_API_EMAIL and SHIPROCKET_PASSWORD/SHIPROCKET_API_PASSWORD in environment variables.')
    }
    
    console.log('✅ Shiprocket configuration validated')
  }

  async authenticate() {
    this.validateConfig()
    return await getShiprocketToken()
  }

  async getToken() {
    if (!shiprocketToken || Date.now() >= tokenExpiry) {
      await this.authenticate()
    }
    return shiprocketToken
  }

  validateOrderData(orderData) {
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      throw new Error('Order items are required')
    }
    
    if (!orderData.shippingAddress) {
      throw new Error('Shipping address is required')
    }

    const requiredAddressFields = ['firstName', 'lastName', 'streetAddress', 'city', 'state', 'zipCode', 'mobile']
    for (const field of requiredAddressFields) {
      if (!orderData.shippingAddress[field]) {
        throw new Error(`${field} is required in shipping address`)
      }
    }

    // Validate pincode (should be 6 digits)
    if (!/^[0-9]{6}$/.test(orderData.shippingAddress.zipCode)) {
      throw new Error('Invalid pincode format. Should be 6 digits.')
    }

    // Validate mobile (should be 10 digits)
    if (!/^[0-9]{10}$/.test(orderData.shippingAddress.mobile)) {
      throw new Error('Invalid mobile number format. Should be 10 digits.')
    }
  }

  async createOrder(orderData) {
    const startTime = Date.now()
    
    try {
      this.validateOrderData(orderData)
      const token = await this.getToken()

      // Calculate total weight (assuming 50g per jewelry item)
      const totalWeight = orderData.items.reduce((total, item) => total + (item.quantity * 0.05), 0.5)

      const payload = {
        order_id: orderData._id?.toString() || `order-${Date.now()}`,
        order_date: new Date().toISOString().split('T')[0],
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
        channel_id: process.env.SHIPROCKET_CHANNEL_ID || '',
        comment: orderData.notes || '',
        billing_customer_name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
        billing_last_name: orderData.shippingAddress.lastName,
        billing_address: orderData.shippingAddress.streetAddress,
        billing_address_2: orderData.shippingAddress.address2 || '',
        billing_city: orderData.shippingAddress.city,
        billing_pincode: orderData.shippingAddress.zipCode,
        billing_state: orderData.shippingAddress.state,
        billing_country: 'India',
        billing_email: orderData.shippingAddress.email,
        billing_phone: orderData.shippingAddress.mobile,
        shipping_is_billing: true,
        shipping_customer_name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
        shipping_last_name: orderData.shippingAddress.lastName,
        shipping_address: orderData.shippingAddress.streetAddress,
        shipping_address_2: orderData.shippingAddress.address2 || '',
        shipping_city: orderData.shippingAddress.city,
        shipping_pincode: orderData.shippingAddress.zipCode,
        shipping_state: orderData.shippingAddress.state,
        shipping_country: 'India',
        shipping_email: orderData.shippingAddress.email,
        shipping_phone: orderData.shippingAddress.mobile,
        order_items: orderData.items.map(item => ({
          name: item.name,
          sku: item.productId?.toString() || `item-${Date.now()}`,
          units: item.quantity,
          selling_price: item.price,
          discount: item.discountPercentage ? (item.price * item.discountPercentage / 100) : 0,
          tax: 0,
          hsn: '711319' // Jewellery HSN code
        })),
        payment_method: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        shipping_charges: orderData.shippingCost || 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: orderData.discount || 0,
        sub_total: orderData.subtotal || orderData.totalAmount,
        length: 10,
        breadth: 10,
        height: 5,
        weight: Math.max(totalWeight, 0.5) // Minimum 0.5kg
      }

      console.log('📦 Creating Shiprocket order:', {
        orderId: payload.order_id,
        itemCount: payload.order_items.length,
        totalAmount: payload.sub_total,
        paymentMethod: payload.payment_method
      })

      const response = await axios.post(
        `${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      )

      const duration = Date.now() - startTime
      console.log(`✅ Shiprocket API call completed in ${duration}ms`)
      console.log('🔍 Shiprocket response:', {
        status: response.data.status,
        statusCode: response.data.status_code,
        shipmentId: response.data.shipment_id,
        courierName: response.data.courier_name
      })

      if (!response.data) {
        throw new Error('Invalid response from Shiprocket: Empty response body')
      }

      // Check for CANCELED status
      if (response.data.status === 'CANCELED' || response.data.status_code === 5) {
        const cancelReason = {
          message: 'Shiprocket order was CANCELED',
          possibleReasons: [
            'Invalid pickup location',
            'Service not available for pincode',
            'Account issues',
            'Invalid channel ID',
            'Weight/dimension issues'
          ],
          response: response.data
        }
        console.warn('⚠️ Shiprocket order CANCELED:', cancelReason)
        throw new Error(`Shiprocket order canceled: ${JSON.stringify(cancelReason)}`)
      }

      // Handle different response field names
      const shipmentId = response.data.shipment_id || response.data.shipment_id || response.data.id
      
      if (!shipmentId) {
        throw new Error(`No shipment ID in Shiprocket response. Response: ${JSON.stringify(response.data)}`)
      }

      const result = {
        shipmentId: shipmentId,
        trackingUrl: `https://shiprocket.co/tracking/${shipmentId}`,
        status: 'created',
        courierName: response.data.courier_name || response.data.courier_name || 'Partner Courier',
        estimatedDelivery: response.data.estimated_delivery_days || response.data.estimated_delivery_days || '5-7 working days',
        shiprocketStatus: response.data.status,
        shiprocketStatusCode: response.data.status_code,
        responseTime: duration
      }

      console.log('🚀 Shiprocket order created successfully:', {
        shipmentId: result.shipmentId,
        trackingUrl: result.trackingUrl,
        courierName: result.courierName,
        responseTime: result.responseTime
      })
      
      return result
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Comprehensive error logging
      const errorDetails = {
        status: 'failed',
        error: error.response?.data?.message || error.message,
        details: error.response?.data || null,
        code: error.response?.status || 500,
        responseTime: duration,
        timestamp: new Date().toISOString(),
        orderId: orderData._id,
        url: `${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`
      }
      
      console.error('❌ Shiprocket order creation failed:', {
        ...errorDetails,
        axiosError: {
          message: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall
        }
      })
      
      // Return detailed error information for storage in order
      return errorDetails
    }
  }

  async getTracking(shipmentId) {
    try {
      if (!shipmentId) {
        throw new Error('Shipment ID is required')
      }

      const token = await this.getToken()

      const response = await axios.get(
        `${SHIPROCKET_BASE_URL}/courier/track/shipment/${shipmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 15000 // 15 second timeout
        }
      )

      return {
        success: true,
        data: response.data,
        trackingData: {
          shipmentId,
          status: response.data.tracking_data?.shipment_status,
          awbCode: response.data.tracking_data?.awb_code,
          courierName: response.data.tracking_data?.courier_name,
          estimatedDelivery: response.data.tracking_data?.estimated_delivery,
          trackingHistory: response.data.tracking_data?.tracking_data || []
        }
      }
    } catch (error) {
      console.error('❌ Shiprocket tracking failed:', {
        shipmentId,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      })
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data || null
      }
    }
  }

  async getAWBNumber(shipmentId) {
    try {
      if (!shipmentId) {
        throw new Error('Shipment ID is required')
      }

      const token = await this.getToken()

      const response = await axios.get(
        `${SHIPROCKET_BASE_URL}/orders/courier/awb/${shipmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 15000
        }
      )

      return {
        success: true,
        awbNumber: response.data.awb_code,
        courierName: response.data.courier_name,
        responseData: response.data
      }
    } catch (error) {
      console.error('❌ Failed to get AWB number:', {
        shipmentId,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString()
      })
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data || null
      }
    }
  }

  // Retry mechanism for failed orders
  async retryOrderCreation(order, maxRetries = 3) {
    if (order.shiprocketRetries >= maxRetries) {
      throw new Error(`Maximum retry attempts (${maxRetries}) exceeded for order ${order._id}`)
    }

    // Check if enough time has passed since last retry (2 minutes)
    const now = new Date()
    if (order.lastShiprocketRetry) {
      const timeSinceLastRetry = now - order.lastShiprocketRetry
      const minRetryInterval = 2 * 60 * 1000 // 2 minutes
      
      if (timeSinceLastRetry < minRetryInterval) {
        const waitTime = Math.ceil((minRetryInterval - timeSinceLastRetry) / 1000)
        throw new Error(`Please wait ${waitTime} seconds before retrying order ${order._id}`)
      }
    }

    // Prepare order data for Shiprocket
    const orderData = {
      _id: order._id,
      items: order.items,
      shippingAddress: {
        firstName: order.guestInfo?.firstName || order.customer?.firstName,
        lastName: order.guestInfo?.lastName || order.customer?.lastName || '',
        streetAddress: order.guestInfo?.streetAddress || order.customer?.streetAddress,
        city: order.guestInfo?.city || order.customer?.city,
        state: order.guestInfo?.state || order.customer?.state,
        zipCode: order.guestInfo?.zipCode || order.customer?.zipCode,
        mobile: order.guestInfo?.mobile || order.customer?.mobile,
        email: order.guestInfo?.email || order.customer?.email
      },
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      notes: order.notes
    }

    console.log(`🔄 Retrying Shiprocket order creation for ${order._id} (attempt ${order.shiprocketRetries + 1}/${maxRetries})`)

    const result = await this.createOrder(orderData)
    
    if (result.status === 'created') {
      // Clear error on successful retry
      order.shiprocketError = null
      console.log(`✅ Retry successful for order ${order._id}`)
    } else {
      // Store error details
      order.shiprocketError = JSON.stringify(result)
      console.log(`❌ Retry failed for order ${order._id}:`, result.error)
    }

    return result
  }
}

// Production startup validation
const validateShiprocketConfig = () => {
  try {
    const shiprocketEmail = process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL
    const shiprocketPassword = process.env.SHIPROCKET_API_PASSWORD || process.env.SHIPROCKET_PASSWORD
    
    if (!shiprocketEmail || !shiprocketPassword) {
      console.warn('⚠️ Shiprocket credentials not configured - Shiprocket integration will be disabled')
      return false
    }
    
    console.log('✅ Shiprocket credentials loaded and validated')
    return true
  } catch (error) {
    console.error('❌ Shiprocket configuration validation failed:', error.message)
    return false
  }
}

// Validate configuration on startup
validateShiprocketConfig()

export default ShiprocketService