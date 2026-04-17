import axios from 'axios'

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1'

// Global token cache for API user
let apiUserToken = null
let apiUserTokenExpiry = null
let lastApiLoginAttempt = 0

// Rate limiting guard
const safeApiLoginGuard = () => {
  const now = Date.now()
  if (now - lastApiLoginAttempt < 5000) { // 5 second cooldown
    throw new Error('Shiprocket API login blocked: Too many attempts. Please wait.')
  }
  lastApiLoginAttempt = now
}

// Get API User Token
const getShiprocketApiToken = async () => {
  const now = Date.now()
  
  // Check if token is still valid (240 hours = 10 days)
  if (apiUserToken && apiUserTokenExpiry && apiUserTokenExpiry > now) {
    console.log('Using valid Shiprocket API token (expires in:', Math.floor((apiUserTokenExpiry - now) / (1000 * 60 * 60)), 'hours')
    return apiUserToken
  }

  // Rate limiting protection
  safeApiLoginGuard()

  try {
    console.log('Authenticating with Shiprocket API User...')
    
    // Use API User credentials (different from main account)
    const apiUserEmail = process.env.SHIPROCKET_API_USER_EMAIL
    const apiUserPassword = process.env.SHIPROCKET_API_USER_PASSWORD
    
    if (!apiUserEmail || !apiUserPassword) {
      console.error('Shiprocket API User credentials not configured')
      throw new Error('Shiprocket API User credentials not configured. Set SHIPROCKET_API_USER_EMAIL and SHIPROCKET_API_USER_PASSWORD in environment variables')
    }
    
    console.log('Shiprocket API User credentials validation passed')
    
    const response = await axios.post(
      `${SHIPROCKET_BASE_URL}/external/auth/login`,
      {
        email: apiUserEmail,
        password: apiUserPassword,
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.data || !response.data.token) {
      console.error('Shiprocket API User authentication failed: Invalid response format')
      throw new Error('Shiprocket API User authentication failed: Invalid response format')
    }

    // Cache the token globally (240 hours = 10 days)
    apiUserToken = response.data.token.trim()
    apiUserTokenExpiry = now + (240 * 60 * 60 * 1000) // 240 hours in milliseconds
    lastApiLoginAttempt = now
    
    console.log('Shiprocket API User authentication successful')
    console.log('API Token expires at:', new Date(apiUserTokenExpiry))
    return apiUserToken

  } catch (error) {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message
    
    console.error('Shiprocket API User login failed:', {
      status,
      message,
      timestamp: new Date().toISOString()
    })
    
    // Handle common authentication errors
    if (status === 401) {
      throw new Error('Shiprocket API User authentication failed: Invalid email and password combination')
    } else if (status === 429) {
      throw new Error('Shiprocket API User authentication failed: Too many login attempts. Please wait before retrying.')
    } else if (status === 403) {
      throw new Error('Shiprocket API User account is blocked. Please contact Shiprocket support.')
    } else {
      throw new Error(`Shiprocket API User authentication failed: ${message}`)
    }
  }
}

// Make authenticated API requests
const makeApiRequest = async (method, url, data = {}, headers = {}) => {
  const maxRetries = 2
  let retryCount = 0
  
  while (retryCount <= maxRetries) {
    try {
      // Get fresh token for each request
      const token = await getShiprocketApiToken()
      
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
      const message = error.response?.data?.message || error.message
      
      // If authentication error, clear token and retry
      if (status === 401 && retryCount < maxRetries) {
        console.log('API User authentication error, clearing token and retrying...')
        apiUserToken = null
        apiUserTokenExpiry = null
        retryCount++
        
        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }
      
      // If other error or max retries reached, throw error
      throw error
    }
  }
}

class ShiprocketFullApiService {
  constructor() {
    // Use global cache instead of instance variables
  }

  validateApiUserConfig() {
    const apiUserEmail = process.env.SHIPROCKET_API_USER_EMAIL
    const apiUserPassword = process.env.SHIPROCKET_API_USER_PASSWORD
    
    if (!apiUserEmail || !apiUserPassword) {
      console.error('Shiprocket API User credentials not configured in environment variables')
      throw new Error('Shiprocket API User credentials not configured. Set SHIPROCKET_API_USER_EMAIL and SHIPROCKET_API_USER_PASSWORD in environment variables')
    }
    
    console.log('Shiprocket API User configuration validated')
    console.log('API User Email:', apiUserEmail)
  }

  async authenticateApiUser() {
    this.validateApiUserConfig()
    return await getShiprocketApiToken()
  }

  async getApiToken() {
    if (!apiUserToken || Date.now() >= apiUserTokenExpiry) {
      await this.authenticateApiUser()
    }
    return apiUserToken
  }

  // 1. Get Serviceable Couriers
  async getServiceableCouriers(orderData) {
    try {
      console.log('📦 Getting serviceable couriers for order...')
      
      const response = await makeApiRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/courier/serviceability/`,
        {
          pickup_postcode: orderData.pickupPincode || '400001',
          delivery_postcode: orderData.deliveryPincode || '400001',
          weight: orderData.weight || 0.5,
          cod: orderData.paymentMethod === 'cod' ? 1 : 0,
          order_type: 'ES'
        }
      )

      console.log('✅ Serviceable couriers fetched successfully')
      return {
        success: true,
        data: response.data,
        responseTime: Date.now()
      }
      
    } catch (error) {
      console.error('❌ Failed to get serviceable couriers:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500
      }
    }
  }

  // 2. Create Order (Adhoc)
  async createOrder(orderData) {
    try {
      console.log('📦 Creating Shiprocket order with full API...')
      
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
        weight: Math.max(orderData.weight || 0.5, 0.5) // Minimum 0.5kg
      }

      const response = await makeApiRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`,
        payload
      )

      console.log('✅ Shiprocket order created successfully with full API')
      return {
        success: true,
        shipmentId: response.data.shipment_id,
        orderId: response.data.order_id,
        trackingUrl: `https://shiprocket.co/tracking/${response.data.shipment_id}`,
        status: 'created',
        courierName: response.data.courier_name || 'Partner Courier',
        estimatedDelivery: response.data.estimated_delivery_days || '5-7 working days',
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ Shiprocket order creation failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }

  // 3. Assign AWB
  async assignAWB(shipmentId) {
    try {
      console.log('📦 Assigning AWB to shipment:', shipmentId)
      
      const response = await makeApiRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/courier/assign/awb`,
        {
          shipment_id: shipmentId
        }
      )

      console.log('✅ AWB assigned successfully')
      return {
        success: true,
        awbCode: response.data.awb_code,
        courierName: response.data.courier_name,
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ AWB assignment failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }

  // 4. Generate Pickup
  async generatePickup(shipmentIds) {
    try {
      console.log('📦 Generating pickup for shipments:', shipmentIds)
      
      const response = await makeApiRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/courier/generate/pickup`,
        {
          shipment_id: shipmentIds
        }
      )

      console.log('✅ Pickup generated successfully')
      return {
        success: true,
        pickupData: response.data,
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ Pickup generation failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }

  // 5. Generate Manifest
  async generateManifest(orderIds) {
    try {
      console.log('📦 Generating manifest for orders:', orderIds)
      
      const response = await makeApiRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/manifests/generate`,
        {
          order_ids: orderIds
        }
      )

      console.log('✅ Manifest generated successfully')
      return {
        success: true,
        manifestId: response.data.manifest_id,
        manifestUrl: response.data.manifest_url,
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ Manifest generation failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }

  // 6. Print Manifest
  async printManifest(manifestId) {
    try {
      console.log('📦 Printing manifest:', manifestId)
      
      const response = await makeApiRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/manifests/print`,
        {
          manifest_id: manifestId
        }
      )

      console.log('✅ Manifest printed successfully')
      return {
        success: true,
        pdfUrl: response.data.pdf_url,
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ Manifest printing failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }

  // 7. Generate Label
  async generateLabel(shipmentId) {
    try {
      console.log('📦 Generating label for shipment:', shipmentId)
      
      const response = await makeApiRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/courier/generate/label`,
        {
          shipment_id: [shipmentId]
        }
      )

      console.log('✅ Label generated successfully')
      return {
        success: true,
        labelUrl: response.data.label_url,
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ Label generation failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }

  // 8. Print Invoice
  async printInvoice(orderId) {
    try {
      console.log('📦 Printing invoice for order:', orderId)
      
      const response = await makeApiRequest(
        'POST',
        `${SHIPROCKET_BASE_URL}/external/orders/print/invoice`,
        {
          order_ids: [orderId]
        }
      )

      console.log('✅ Invoice printed successfully')
      return {
        success: true,
        invoiceUrl: response.data.invoice_url,
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ Invoice printing failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }

  // 9. Track by AWB
  async trackByAWB(awbCode) {
    try {
      console.log('📦 Tracking by AWB:', awbCode)
      
      const response = await makeApiRequest(
        'GET',
        `${SHIPROCKET_BASE_URL}/external/courier/track/awb/${awbCode}`
      )

      console.log('✅ Tracking by AWB successful')
      return {
        success: true,
        trackingData: response.data,
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ Tracking by AWB failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }

  // 10. Get Orders (Full List)
  async getOrders(page = 1, limit = 100, filters = {}) {
    try {
      console.log('📦 Getting orders list...')
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: limit.toString(),
        ...filters
      })

      const response = await makeApiRequest(
        'GET',
        `${SHIPROCKET_BASE_URL}/external/orders?${params.toString()}`
      )

      console.log('✅ Orders list fetched successfully')
      return {
        success: true,
        orders: response.data.orders || [],
        pagination: response.data.meta || {},
        responseTime: Date.now(),
        data: response.data
      }
      
    } catch (error) {
      console.error('❌ Orders list fetch failed:', error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        responseTime: Date.now()
      }
    }
  }
}

// Production startup validation
const validateFullApiConfig = () => {
  try {
    const apiUserEmail = process.env.SHIPROCKET_API_USER_EMAIL
    const apiUserPassword = process.env.SHIPROCKET_API_USER_PASSWORD
    
    if (!apiUserEmail || !apiUserPassword) {
      console.warn('⚠️ Shiprocket API User credentials not configured - Full API features will be disabled')
      return false
    }
    
    console.log('✅ Shiprocket Full API configuration validated')
    return true
  } catch (error) {
    console.error('❌ Shiprocket Full API configuration validation failed:', error.message)
    return false
  }
}

// Validate configuration on startup
validateFullApiConfig()

export default new ShiprocketFullApiService()
