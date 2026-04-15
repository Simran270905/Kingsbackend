import axios from 'axios'

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD
const BASE_URL = "https://apiv2.shiprocket.in/v1/external"

let token = null
let tokenExpiry = null

// Authenticate and cache token (expires every 24hrs)
const authenticate = async () => {
  if (token && tokenExpiry && Date.now() < tokenExpiry) return token
  
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD
    })
    
    token = res.data.token
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000 // 23 hours
    return token
  } catch (error) {
    console.error('Shiprocket authentication failed:', error.response?.data || error.message)
    throw new Error('Shiprocket authentication failed')
  }
}

// Create order in Shiprocket
const createShiprocketOrder = async (order) => {
  const authToken = await authenticate()
  
  const payload = {
    order_id: order.orderId,
    order_date: new Date().toISOString().split("T")[0],
    pickup_location: "Primary",   // set this in Shiprocket dashboard
    channel_id: "",
    billing_customer_name: order.customer.name,
    billing_last_name: "",
    billing_address: order.customer.address.line1,
    billing_address_2: order.customer.address.line2 || "",
    billing_city: order.customer.address.city,
    billing_pincode: order.customer.address.pincode,
    billing_state: order.customer.address.state,
    billing_country: "India",
    billing_email: order.customer.email,
    billing_phone: order.customer.phone,
    shipping_is_billing: true,
    order_items: order.items.map(item => ({
      name: item.name,
      sku: item.productId.toString(),
      units: item.quantity,
      selling_price: item.price,
      discount: 0,
      tax: 0,
      hsn: ""
    })),
    payment_method: "Prepaid",
    sub_total: order.subtotal,
    length: 10,  // in cm - adjust per product type
    breadth: 10,
    height: 5,
    weight: 0.5  // in kg - adjust per product type
  }
  
  try {
    const res = await axios.post(`${BASE_URL}/orders/create/adhoc`, payload, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    return res.data
  } catch (error) {
    console.error('Shiprocket order creation failed:', error.response?.data || error.message)
    throw new Error('Failed to create Shiprocket order')
  }
}

// Get tracking info by AWB code
const trackShipment = async (awbCode) => {
  const authToken = await authenticate()
  
  try {
    const res = await axios.get(`${BASE_URL}/courier/track/awb/${awbCode}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    return res.data
  } catch (error) {
    console.error('Shiprocket tracking failed:', error.response?.data || error.message)
    throw new Error('Failed to track shipment')
  }
}

// Get courier serviceability (optional - for checkout page)
const checkServiceability = async (pincode, weight = 0.5) => {
  const authToken = await authenticate()
  
  try {
    const res = await axios.get(`${BASE_URL}/courier/serviceability`, {
      params: { 
        pickup_postcode: "110001", // Delhi default - change to your warehouse pincode
        delivery_postcode: pincode, 
        weight, 
        cod: 0 
      },
      headers: { Authorization: `Bearer ${authToken}` }
    })
    return res.data
  } catch (error) {
    console.error('Shiprocket serviceability check failed:', error.response?.data || error.message)
    throw new Error('Failed to check serviceability')
  }
}

// Generate shipping label
const generateLabel = async (shipmentId) => {
  const authToken = await authenticate()
  
  try {
    const res = await axios.post(`${BASE_URL}/labels/print`, {
      shipment_id: shipmentId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    return res.data
  } catch (error) {
    console.error('Shiprocket label generation failed:', error.response?.data || error.message)
    throw new Error('Failed to generate shipping label')
  }
}

// Request pickup for shipment
const requestPickup = async (shipmentId) => {
  const authToken = await authenticate()
  
  try {
    const res = await axios.post(`${BASE_URL}/shipment/pickup`, {
      shipment_id: shipmentId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    return res.data
  } catch (error) {
    console.error('Shiprocket pickup request failed:', error.response?.data || error.message)
    throw new Error('Failed to request pickup')
  }
}

export {
  authenticate,
  createShiprocketOrder,
  trackShipment,
  checkServiceability,
  generateLabel,
  requestPickup
}
