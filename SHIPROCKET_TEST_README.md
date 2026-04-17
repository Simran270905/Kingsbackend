# 🚀 Shiprocket Integration Test

This directory contains a complete Shiprocket API integration test suite for your Node.js backend.

## 📁 Files Created

### 1. `services/shiprocketTestService.js`
- **Purpose**: Core Shiprocket API service with token management
- **Features**:
  - Token caching (prevents repeated logins)
  - Rate limiting protection (10-second cooldown)
  - Automatic token expiry handling
  - Comprehensive error handling
  - Test order creation

### 2. `routes/shiprocketTestRoutes.js`
- **Purpose**: Express.js routes for testing Shiprocket integration
- **Endpoints**:
  - `POST /api/test-shiprocket` - Complete integration test
  - `GET /api/test-shiprocket/status` - Token status
  - `POST /api/test-shiprocket/login-only` - Login test only

### 3. `test-shiprocket-integration.js`
- **Purpose**: Standalone test script
- **Usage**: `node test-shiprocket-integration.js`

## 🔧 Environment Variables

Ensure these are set in your `.env` file:

```env
# ===============================  
# 🚀 SHIPROCKET CONFIG
# ===============================
SHIPROCKET_API_EMAIL=your-email@example.com
SHIPROCKET_API_PASSWORD=your-password
```

## 🧪 Testing Methods

### Method 1: HTTP API Test (Recommended)

**Complete Integration Test:**
```bash
curl -X POST http://localhost:5000/api/test-shiprocket \
  -H "Content-Type: application/json"
```

**Login Only Test:**
```bash
curl -X POST http://localhost:5000/api/test-shiprocket/login-only \
  -H "Content-Type: application/json"
```

**Token Status Check:**
```bash
curl -X GET http://localhost:5000/api/test-shiprocket/status
```

### Method 2: Standalone Script

```bash
node test-shiprocket-integration.js
```

## 📊 Expected Responses

### Successful Test Response:
```json
{
  "success": true,
  "message": "Shiprocket integration test completed successfully",
  "shiprocketResponse": {
    "order_id": "TEST123",
    "shipment_id": 123456,
    "status": "NEW",
    "courier_name": "Delhivery",
    "awb_code": "1234567890"
  },
  "tokenReceived": true,
  "timestamp": "2024-04-17T12:51:00.000Z"
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Invalid Shiprocket credentials",
  "error": "Invalid email or password",
  "timestamp": "2024-04-17T12:51:00.000Z"
}
```

## 🔒 Security Features

### Token Management
- **Caching**: Tokens are cached in memory to prevent repeated logins
- **Expiry**: Tokens automatically expire after 24 hours
- **Reuse**: Valid tokens are reused until expiry

### Rate Limiting
- **Cooldown**: 10-second cooldown between login attempts
- **Protection**: Prevents "too many attempts" errors
- **Safe Login Guard**: Blocks rapid successive login attempts

### Error Handling
- **Authentication Errors**: Clear messages for invalid credentials
- **Rate Limiting**: Detects and reports account blocking
- **Timeout**: 30-second timeout for all API calls
- **Network Errors**: Graceful handling of connection issues

## 📋 Test Order Data

The test uses this dummy order data:

```json
{
  "order_id": "TEST123",
  "order_date": "2024-04-01",
  "pickup_location": "Primary",
  "billing_customer_name": "Test User",
  "billing_address": "Test Address",
  "billing_city": "Mumbai",
  "billing_pincode": "400001",
  "billing_state": "Maharashtra",
  "billing_country": "India",
  "billing_email": "test@example.com",
  "billing_phone": "9999999999",
  "shipping_is_billing": true,
  "order_items": [
    {
      "name": "Test Product",
      "sku": "TESTSKU",
      "units": 1,
      "selling_price": 100
    }
  ],
  "payment_method": "Prepaid",
  "sub_total": 100,
  "length": 10,
  "breadth": 10,
  "height": 10,
  "weight": 0.5
}
```

## 🚀 Usage in Production

To use this in your production application:

1. **Import the service**:
```javascript
import { loginToShiprocket, createTestOrder } from './services/shiprocketTestService.js';
```

2. **Use in your controllers**:
```javascript
// Get token (cached automatically)
const token = await loginToShiprocket();

// Create real order (replace test data)
const orderResponse = await createTestOrder(token);
```

3. **Error handling**:
```javascript
try {
  const result = await testShiprocketIntegration();
  if (result.success) {
    // Handle success
    console.log('Order created:', result.shiprocketResponse);
  } else {
    // Handle error
    console.error('Failed:', result.message);
  }
} catch (error) {
  console.error('Error:', error.message);
}
```

## 🔍 Debugging

### Console Logs
The service provides detailed console logs:
- ✅ Token status and expiry
- 🔐 Login attempts and results
- 📦 Order creation progress
- ❌ Detailed error messages

### Common Issues

1. **Invalid Credentials**
   - Check email/password in `.env`
   - Ensure Shiprocket account is active

2. **Rate Limiting**
   - Wait 10 seconds between attempts
   - Check if account is temporarily blocked

3. **Network Issues**
   - Verify internet connection
   - Check Shiprocket API status

4. **Token Expiry**
   - Tokens expire after 24 hours
   - Service handles automatic refresh

## 📞 Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify your Shiprocket credentials
3. Ensure your Shiprocket account is active
4. Check network connectivity to `apiv2.shiprocket.in`

## 🎯 Next Steps

Once testing is complete:

1. Replace test order data with real order data
2. Integrate with your order management system
3. Add webhook handling for real-time updates
4. Implement proper error recovery
5. Add monitoring and alerting

---

**🎉 Your Shiprocket integration is now ready for testing!**
