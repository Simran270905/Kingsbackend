import axios from 'axios';

const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1';

// Global token cache to prevent repeated login attempts
let shiprocketToken = null;
let tokenExpiry = null;
let lastLoginAttempt = 0;

// Rate limiting guard to prevent repeated login attempts
const safeLoginGuard = () => {
  const now = Date.now();
  if (now - lastLoginAttempt < 10000) { // 10 second cooldown
    throw new Error('Shiprocket login blocked: Too many attempts. Please wait.');
  }
  lastLoginAttempt = now;
};

/**
 * Login to Shiprocket and get token
 * @returns {string} Shiprocket token
 */
export const loginToShiprocket = async () => {
  const now = Date.now();
  
  // Check if token is still valid (Shiprocket tokens last for 24 hours)
  if (shiprocketToken && tokenExpiry && tokenExpiry > now) {
    console.log('✅ Reusing existing Shiprocket token (expires in:', Math.floor((tokenExpiry - now) / (1000 * 60)), 'minutes)');
    return shiprocketToken;
  }

  // Rate limiting protection
  safeLoginGuard();

  try {
    console.log('🔐 Logging into Shiprocket API...');
    
    // Get credentials from environment variables
    const email = process.env.SHIPROCKET_API_EMAIL?.trim();
    const password = process.env.SHIPROCKET_API_PASSWORD?.trim();
    
    if (!email || !password) {
      throw new Error('Shiprocket credentials not found in environment variables');
    }

    const response = await axios.post(`${SHIPROCKET_BASE_URL}/external/auth/login`, {
      email: email,
      password: password
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    if (response.data && response.data.token) {
      shiprocketToken = response.data.token;
      // Set expiry to 24 hours from now (Shiprocket tokens last 24 hours)
      tokenExpiry = now + (24 * 60 * 60 * 1000);
      
      console.log('✅ Shiprocket login successful! Token received');
      console.log('🔑 Token expires in:', Math.floor((tokenExpiry - now) / (1000 * 60)), 'minutes');
      
      return shiprocketToken;
    } else {
      throw new Error('Invalid response from Shiprocket API');
    }
  } catch (error) {
    console.error('❌ Shiprocket login failed:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 429) {
      throw new Error('Too many login attempts. Account temporarily blocked. Please wait before retrying.');
    } else if (error.response?.status === 401) {
      throw new Error('Invalid Shiprocket credentials. Please check your email and password.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Shiprocket API timeout. Please try again.');
    }
    
    throw error;
  }
};

/**
 * Create a test order in Shiprocket
 * @param {string} token - Shiprocket auth token
 * @returns {object} Shiprocket order creation response
 */
export const createTestOrder = async (token) => {
  try {
    console.log('📦 Creating test order in Shiprocket...');
    
    const testOrderData = {
      order_id: "TEST123",
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name: "Test User",
      billing_last_name: "",
      billing_address: "Test Address",
      billing_city: "Mumbai",
      billing_pincode: "400001",
      billing_state: "Maharashtra",
      billing_country: "India",
      billing_email: "test@example.com",
      billing_phone: "9876543210",
      shipping_is_billing: true,
      order_items: [
        {
          name: "Test Product",
          sku: "TESTSKU",
          units: 1,
          selling_price: 100
        }
      ],
      payment_method: "Prepaid",
      sub_total: 100,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5
    };

    const response = await axios.post(`${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`, testOrderData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ Test order created successfully!');
    console.log('📋 Order response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Test order creation failed:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      throw new Error('Shiprocket token expired. Please try logging in again.');
    } else if (error.response?.status === 422) {
      throw new Error('Invalid order data. Please check the order details.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Shiprocket API timeout. Please try again.');
    }
    
    throw error;
  }
};

/**
 * Complete test flow: login and create test order
 * @returns {object} Complete test results
 */
export const testShiprocketIntegration = async () => {
  try {
    console.log('🚀 Starting Shiprocket integration test...');
    
    // Step 1: Login
    const token = await loginToShiprocket();
    
    // Step 2: Create test order
    const orderResponse = await createTestOrder(token);
    
    const result = {
      success: true,
      message: 'Shiprocket integration test completed successfully',
      shiprocketResponse: orderResponse,
      tokenReceived: !!token,
      timestamp: new Date().toISOString()
    };
    
    console.log('🎉 Shiprocket integration test completed successfully!');
    return result;
    
  } catch (error) {
    const result = {
      success: false,
      message: error.message,
      error: error.response?.data || error.message,
      timestamp: new Date().toISOString()
    };
    
    console.error('💥 Shiprocket integration test failed:', result);
    return result;
  }
};

/**
 * Get current token status
 * @returns {object} Token status information
 */
export const getTokenStatus = () => {
  const now = Date.now();
  return {
    hasToken: !!shiprocketToken,
    tokenExpiry: tokenExpiry,
    isExpired: tokenExpiry ? tokenExpiry <= now : true,
    minutesUntilExpiry: tokenExpiry ? Math.floor((tokenExpiry - now) / (1000 * 60)) : 0,
    lastLoginAttempt: lastLoginAttempt
  };
};
