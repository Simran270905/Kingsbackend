import axios from 'axios'

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1'

// Module-level token cache with timestamp
let shiprocketToken = null
let tokenFetchedAt = null
const TOKEN_EXPIRY_MS = 9 * 24 * 60 * 60 * 1000 // 9 days in milliseconds

// Get Shiprocket token with proper caching
const getToken = async () => {
  const now = Date.now()
  
  // Check if token exists and is still valid (less than 9 days old)
  if (shiprocketToken && tokenFetchedAt && (now - tokenFetchedAt < TOKEN_EXPIRY_MS)) {
    const tokenAge = Math.floor((now - tokenFetchedAt) / (1000 * 60 * 60))
    console.log(`Using cached Shiprocket token (${tokenAge} hours old)`)
    return shiprocketToken
  }

  // Token is missing or expired, re-authenticate
  console.log('Shiprocket token missing or expired, re-authenticating...')
  
  try {
    const response = await axios.post(
      `${SHIPROCKET_BASE_URL}/external/auth/login`,
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.data || !response.data.token) {
      throw new Error('Invalid response from Shiprocket: No token in response')
    }

    // Store token and timestamp
    shiprocketToken = response.data.token.trim()
    tokenFetchedAt = now
    
    console.log('Shiprocket authentication successful')
    console.log(`Token expires in: ${TOKEN_EXPIRY_MS / (1000 * 60 * 60)} hours`)
    
    return shiprocketToken

  } catch (error) {
    console.error('Shiprocket authentication failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      timestamp: new Date().toISOString()
    })
    
    throw new Error(`Shiprocket authentication failed: ${error.response?.data?.message || error.message}`)
  }
}

// Refresh token if needed
const refreshTokenIfNeeded = async () => {
  await getToken()
}

// 401 interceptor - force re-authentication and retry once
const makeAuthenticatedRequest = async (method, url, data = {}, headers = {}) => {
  try {
    const token = await getToken()
    
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 30000
    })
    
    return response
    
  } catch (error) {
    const status = error.response?.status
    
    // If 401, force re-authentication ONCE and retry
    if (status === 401) {
      console.log('Shiprocket 401 error, forcing re-authentication and retrying...')
      
      // Clear token cache
      shiprocketToken = null
      tokenFetchedAt = null
      
      try {
        // Get fresh token
        const freshToken = await getToken()
        
        // Retry the original request
        const retryResponse = await axios({
          method,
          url,
          data,
          headers: {
            'Authorization': `Bearer ${freshToken}`,
            'Content-Type': 'application/json',
            ...headers
          },
          timeout: 30000
        })
        
        console.log('Shiprocket request successful after re-authentication')
        return retryResponse
        
      } catch (retryError) {
        console.error('Shiprocket retry failed:', retryError.response?.data?.message || retryError.message)
        throw new Error(`Shiprocket API error: ${retryError.response?.data?.message || retryError.message}`)
      }
    }
    
    // For other errors, log and throw
    console.error('Shiprocket API error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url,
      timestamp: new Date().toISOString()
    })
    
    throw new Error(`Shiprocket API error: ${error.response?.data?.message || error.message}`)
  }
}

class ShiprocketService {
  constructor() {
    // Use module-level cache
  }

  validateOrderData(orderData) {
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      throw new Error('Order items are required')
    }
    
    if (!orderData.shippingAddress) {
      throw new Error('Shipping address is required')
    }

    const required = ['firstName', 'lastName', 'email', 'mobile', 'streetAddress', 'city', 'state', 'zipCode']
    for (const field of required) {
      if (!orderData.shippingAddress[field]) {
        throw new Error(`Shipping address field ${field} is required`)
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(orderData.shippingAddress.email)) {
      throw new Error('Invalid email format')
    }
    
    // Clean and validate mobile number
    const originalMobile = orderData.shippingAddress.mobile.toString()
    let cleanMobile = originalMobile.replace(/\D/g, '') // Remove all non-digits
    
    // Handle different formats
    if (cleanMobile.startsWith('91') && cleanMobile.length === 12) {
      cleanMobile = cleanMobile.substring(2) // Remove country code 91
    } else if (cleanMobile.startsWith('0') && cleanMobile.length === 11) {
      cleanMobile = cleanMobile.substring(1) // Remove leading 0
    }
    
    // Validate final format (should be 10 digits)
    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      throw new Error(`Invalid mobile number format: "${originalMobile}". Should be 10 digits after cleaning.`)
    }
    
    // Update the mobile number with cleaned version
    orderData.shippingAddress.mobile = cleanMobile
    console.log(`Phone number cleaned: "${originalMobile}" -> "${cleanMobile}"`)
  }

  async createOrder(orderData) {
    const startTime = Date.now()
    
    try {
      this.validateOrderData(orderData)

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

      const response = await makeAuthenticatedRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`,
        payload
      )

      const duration = Date.now() - startTime
      console.log(`✅ Shiprocket API call completed in ${duration}ms`)

      if (!response.data) {
        throw new Error('Invalid response from Shiprocket: Empty response body')
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
      
      // Structured error response for frontend
      const errorResponse = {
        success: false,
        error: 'Shipping service unavailable. Please try again.',
        details: {
          shiprocketError: error.response?.data?.message || error.message,
          status: error.response?.status || 500,
          responseTime: duration,
          timestamp: new Date().toISOString(),
          orderId: orderData._id
        }
      }
      
      console.error('❌ Shiprocket order creation failed:', errorResponse)
      
      // Return structured error instead of throwing
      return errorResponse
    }
  }

  async getTracking(shipmentId) {
    try {
      if (!shipmentId) {
        return {
          success: false,
          error: 'Shipment ID is required'
        }
      }

      const response = await makeAuthenticatedRequest(
        'GET',
        `${SHIPROCKET_BASE_URL}/external/courier/track/shipment/${shipmentId}`
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
        error: 'Tracking service unavailable. Please try again.',
        details: error.response?.data || null
      }
    }
  }

  async retryOrderCreation(order) {
    try {
      // Clear token to force fresh authentication for retry
      shiprocketToken = null
      tokenFetchedAt = null
      
      console.log(`🔄 Retrying Shiprocket order creation for ${order._id}`)
      
      // Prepare order data for Shiprocket
      const orderData = {
        _id: order._id,
        items: order.items,
        shippingAddress: order.shippingAddress || {
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

      const result = await this.createOrder(orderData)
      
      if (result.status === 'created') {
        console.log(`✅ Retry successful for order ${order._id}`)
      } else {
        console.log(`❌ Retry failed for order ${order._id}:`, result.error)
      }

      return result
      
    } catch (error) {
      console.error('❌ Shiprocket retry failed:', error.message)
      
      return {
        success: false,
        error: 'Retry service unavailable. Please try again.',
        details: error.message
      }
    }
  }
}

/* NOTE: Shiprocket has NO sandbox environment. All test orders created 
   during development appear in your live account. Before going live:
   1. Log into Shiprocket dashboard and cancel/delete any test orders.
   2. Ensure your pickup address is KYC-verified and active.
   3. Verify your wallet has sufficient balance for COD remittance if applicable.
*/

export default new ShiprocketService()