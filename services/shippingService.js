import axios from 'axios'

export class ShippingService {
  constructor() {
    this.baseURL = 'https://apiv2.shiprocket.in/v1/external'
    this.token = null
    this.tokenExpiry = null
  }

  async getAuthToken() {
    // Check if token is still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD
      })

      this.token = response.data.token
      // Token expires in 24 hours
      this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000) // 23 hours for safety
      
      return this.token
    } catch (error) {
      console.error('Shiprocket auth failed:', error.response?.data || error.message)
      throw new Error('Failed to authenticate with Shiprocket')
    }
  }

  async createOrder(orderData) {
    try {
      const token = await this.getAuthToken()
      
      const payload = {
        order_id: orderData.orderId,
        order_date: orderData.orderDate,
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',
        channel_id: process.env.SHIPROCKET_CHANNEL_ID,
        comment: orderData.comment || '',
        billing_customer_name: orderData.customerName,
        billing_last_name: '',
        billing_address: orderData.address,
        billing_address_2: '',
        billing_city: orderData.city,
        billing_pincode: orderData.pincode,
        billing_state: orderData.state,
        billing_country: orderData.country || 'India',
        billing_email: orderData.email,
        billing_phone: orderData.phone,
        shipping_is_billing: true,
        order_items: orderData.items.map(item => ({
          name: item.name,
          sku: item.sku || item.productId,
          units: item.quantity,
          selling_price: item.price,
          discount: '',
          tax: '',
          hsn: item.hsn || ''
        })),
        payment_method: orderData.paymentMethod || 'Prepaid',
        shipping_charges: orderData.shippingCharges || 0,
        giftwrap_charges: orderData.giftwrapCharges || 0,
        transaction_charges: orderData.transactionCharges || 0,
        total_discount: orderData.totalDiscount || 0,
        sub_total: orderData.subTotal,
        length: orderData.length || 10,
        breadth: orderData.breadth || 10,
        height: orderData.height || 10,
        weight: orderData.weight || 0.5
      }

      const response = await axios.post(
        `${this.baseURL}/orders/create/adhoc`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      )

      return { success: true, data: response.data }
    } catch (error) {
      console.error('Shiprocket order creation failed:', error.response?.data || error.message)
      throw new Error('Failed to create shipping order')
    }
  }

  async trackOrder(shipmentId) {
    try {
      const token = await this.getAuthToken()
      
      const response = await axios.get(
        `${this.baseURL}/orders/track/${shipmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      return { success: true, data: response.data }
    } catch (error) {
      console.error('Shiprocket tracking failed:', error.response?.data || error.message)
      throw new Error('Failed to track shipment')
    }
  }

  async getAWBNumber(orderId) {
    try {
      const token = await this.getAuthToken()
      
      const response = await axios.post(
        `${this.baseURL}/orders/courier/assign/awb`,
        { order_id: orderId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      )

      return { success: true, data: response.data }
    } catch (error) {
      console.error('AWB generation failed:', error.response?.data || error.message)
      throw new Error('Failed to generate AWB number')
    }
  }

  async cancelOrder(orderId) {
    try {
      const token = await this.getAuthToken()
      
      const response = await axios.post(
        `${this.baseURL}/orders/cancel`,
        { order_id: orderId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      )

      return { success: true, data: response.data }
    } catch (error) {
      console.error('Shiprocket order cancellation failed:', error.response?.data || error.message)
      throw new Error('Failed to cancel shipping order')
    }
  }
}

export default new ShippingService()
