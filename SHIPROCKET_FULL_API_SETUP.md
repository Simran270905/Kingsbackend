# 🚀 SHIPROCKET FULL API SETUP - COMPLETE GUIDE

## 🎯 OVERVIEW
This guide will help you set up **complete Shiprocket API access** with all features enabled according to Shiprocket's official documentation.

## 📋 REQUIREMENTS

### 1. SHIPROCKET ACCOUNT ACCESS
- ✅ Main Account: `kkingsjewellery@gmail.com` (already configured)
- 🆕 API User: Need to create separate API user
- 🔐 Permissions: Full API access required

### 2. ENVIRONMENT VARIABLES
```bash
# Main Account (already configured)
SHIPROCKET_API_EMAIL=kkingsjewellery@gmail.com
SHIPROCKET_API_PASSWORD=I1seJ8HO8om4j6ocqhHIhupU4ooYON7%

# NEW: API User (to be created)
SHIPROCKET_API_USER_EMAIL=api@kkingsjewellery.com
SHIPROCKET_API_USER_PASSWORD=your_secure_password_here

# Additional settings
SHIPROCKET_CHANNEL_ID=5489727
SHIPROCKET_PICKUP_LOCATION=Primary
```

## 🛠️ STEP-BY-STEP SETUP

### STEP 1: CREATE API USER IN SHIPROCKET PANEL

1. **Login to Shiprocket Panel**
   - Go to: https://app.shiprocket.in
   - Login with: `kkingsjewellery@gmail.com`

2. **Navigate to API Settings**
   - Click "Settings" from left menu
   - Select "API" from submenu
   - Click "Configure" button

3. **Create API User**
   - Click "Create an API User" button
   - **Important**: Use email DIFFERENT from main account
   - Recommended: `api@kkingsjewellery.com`
   - Set a strong password
   - Note down the credentials

4. **Generate API Token**
   - Use the API User credentials (not main account)
   - Call: `POST https://apiv2.shiprocket.in/v1/external/auth/login`
   - Token valid for 240 hours (10 days)

### STEP 2: UPDATE ENVIRONMENT VARIABLES

1. **Update .env file**
   ```bash
   SHIPROCKET_API_USER_EMAIL=api@kkingsjewellery.com
   SHIPROCKET_API_USER_PASSWORD=your_api_user_password
   ```

2. **Restart Server**
   ```bash
   npm restart
   # or
   node server.js
   ```

### STEP 3: VERIFY FULL API ACCESS

1. **Run the test script**
   ```bash
   node test-shiprocket-full-api.cjs
   ```

2. **Check all features work**:
   - ✅ API User authentication
   - ✅ Serviceable couriers
   - ✅ Order creation
   - ✅ AWB assignment
   - ✅ Label generation
   - ✅ Invoice printing
   - ✅ Manifest generation/printing
   - ✅ Pickup generation
   - ✅ Orders listing
   - ✅ Tracking by AWB

## 🚀 AVAILABLE API ENDPOINTS

### ✅ FULLY SUPPORTED ENDPOINTS:

#### **Authentication:**
- `POST /external/auth/login` - Get API token

#### **Order Management:**
- `POST /external/orders/create/adhoc` - Create order
- `GET /external/orders` - List all orders
- `POST /external/courier/assign/awb` - Assign AWB

#### **Tracking & Logistics:**
- `POST /external/courier/serviceability/` - Get serviceable couriers
- `GET /external/courier/track/awb/{awb_code}` - Track by AWB

#### **Shipping Operations:**
- `POST /external/courier/generate/pickup` - Generate pickup
- `POST /external/manifests/generate` - Generate manifest
- `POST /external/manifests/print` - Print manifest
- `POST /external/courier/generate/label` - Generate label
- `POST /external/orders/print/invoice` - Print invoice

## 🎯 FEATURES COMPARISON

### BEFORE (Limited API):
- ❌ Order creation only
- ❌ Basic tracking only
- ❌ No AWB assignment
- ❌ No label generation
- ❌ No manifest operations
- ❌ No invoice printing
- ❌ No pickup management
- ❌ Limited courier info

### AFTER (Full API):
- ✅ Complete order management
- ✅ Advanced tracking capabilities
- ✅ AWB assignment and tracking
- ✅ Label and invoice generation
- ✅ Manifest generation and printing
- ✅ Pickup scheduling
- ✅ Full courier serviceability
- ✅ Complete order lifecycle management

## 🔧 IMPLEMENTATION STATUS

### ✅ ALREADY IMPLEMENTED:
1. **Full API Service**: `shiprocketFullApiService.js`
   - All 11 API endpoints implemented
   - Token management with 240-hour expiry
   - Comprehensive error handling
   - Rate limiting protection

2. **Test Suite**: `test-shiprocket-full-api.cjs`
   - Tests all API endpoints
   - Validates authentication
   - Checks error handling

3. **Environment Setup**: `.env` updated
   - API user credentials added
   - Configuration validation included

## 🚀 NEXT ACTIONS

### IMMEDIATE (Today):
1. **Create API User** in Shiprocket panel
2. **Update .env file** with API user credentials
3. **Run test script** to verify full API access
4. **Deploy to production** with full API service

### INTEGRATION (This Week):
1. **Update order controller** to use full API service
2. **Enhance admin panel** with new features
3. **Add webhook support** for real-time updates
4. **Implement advanced tracking** in frontend

## 🎯 EXPECTED BENEFITS

### 📦 **Complete Order Management:**
- Create orders with full control
- Assign AWB codes automatically
- Generate shipping labels
- Print invoices and manifests
- Schedule pickups efficiently

### 📊 **Advanced Tracking:**
- Real-time tracking updates
- Multiple tracking methods
- Complete shipment history
- Delivery status management

### 🚀 **Operational Efficiency:**
- Automated shipping workflows
- Reduced manual work
- Better customer experience
- Complete audit trails

### 💼 **Business Intelligence:**
- Complete order analytics
- Courier performance data
- Delivery insights
- Cost optimization opportunities

## 📞 SUPPORT CONTACTS

### For API User Creation Issues:
- **Shiprocket Support**: support@shiprocket.in
- **Phone**: +91 9212089090
- **Documentation**: https://apidocs.shiprocket.in

### For Technical Implementation:
- **Developer Support**: developers@shiprocket.in
- **API Documentation**: https://apiv2.shiprocket.in/v1/external
- **Help Center**: https://help.shiprocket.in/

---

## 🎯 ACTION REQUIRED

1. **Create API User** in Shiprocket panel NOW
2. **Update environment variables** with API user credentials
3. **Test full API access** using provided test script
4. **Deploy enhanced integration** with complete Shiprocket features

**This will unlock ALL Shiprocket API capabilities for your e-commerce platform!** 🚀
