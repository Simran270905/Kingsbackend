import axios from 'axios'

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

// Safe token management with caching
const getShiprocketToken = async () => {
  // Use cached token if valid
  if (shiprocketToken && Date.now() < tokenExpiry) {
    console.log('Using cached Shiprocket token')
    return shiprocketToken
  }

  // Rate limiting protection
  safeLoginGuard()

  try {
    console.log('Authenticating with Shiprocket API...')
    const response = await axios.post(
      `${SHIPROCKET_BASE_URL}/external/auth/login`,
      {
        email: process.env.SHIPROCKET_API_EMAIL,
        password: process.env.SHIPROCKET_API_PASSWORD,
      },
      {
        timeout: 15000 // 15 second timeout
      }
    )

    if (!response.data || !response.data.token) {
      console.error('Shiprocket authentication failed: Invalid credentials')
      throw new Error('Shiprocket authentication failed: Invalid credentials')
    }

    // Cache the token globally
    shiprocketToken = response.data.token
    // Token valid for 240 hours (10 days)
    tokenExpiry = Date.now() + (240 * 60 * 60 * 1000)
    
    console.log('Shiprocket authentication successful')
    console.log('Token expires in:', new Date(tokenExpiry))
    return shiprocketToken

  } catch (error) {
    console.error('Shiprocket login failed:', error.response?.data?.message || error.message)
    
    // DO NOT RETRY - Fail fast to prevent account blocking
    throw new Error('Shiprocket authentication failed')
  }
}

class ShiprocketService {
  constructor() {
    // Use global cache instead of instance variables
  }

  validateConfig() {
    if (!process.env.SHIPROCKET_API_KEY && (!process.env.SHIPROCKET_API_EMAIL || !process.env.SHIPROCKET_API_PASSWORD)) {
      throw new Error('Shiprocket API key or email/password is not configured. Please set SHIPROCKET_API_KEY or SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD in environment variables.')
    }
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

      console.log('Creating Shiprocket order with payload:', JSON.stringify(payload, null, 2))

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

      console.log('🔍 DEBUG - Shiprocket API response:', JSON.stringify(response.data, null, 2))

      if (!response.data) {
        throw new Error('Invalid response from Shiprocket')
      }

      // Handle different response field names
      const shipmentId = response.data.shipment_id || response.data.shipment_id || response.data.id
      console.log('🔍 DEBUG - Extracted shipmentId:', shipmentId)
      
      if (!shipmentId) {
        throw new Error('No shipment ID in Shiprocket response')
      }

      const result = {
        shipmentId: shipmentId,
        trackingUrl: `https://shiprocket.co/tracking/${shipmentId}`,
        status: 'created',
        courierName: response.data.courier_name || response.data.courier_name || 'Partner Courier',
        estimatedDelivery: response.data.estimated_delivery_days || response.data.estimated_delivery_days || '5-7 working days'
      }

      console.log('Shiprocket order created successfully:', result)
      return result
    } catch (error) {
      console.error('Shiprocket order creation failed:', error.response?.data || error.message)
      
      // Return detailed error information
      const errorDetails = {
        status: 'failed',
        error: error.response?.data?.message || error.message,
        details: error.response?.data || null,
        code: error.response?.status || 500
      }
      
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
        data: response.data
      }
    } catch (error) {
      console.error('Shiprocket tracking failed:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message
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
        courierName: response.data.courier_name
      }
    } catch (error) {
      console.error('Failed to get AWB number:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message
      }
    }
  }
}

export default new ShiprocketService()