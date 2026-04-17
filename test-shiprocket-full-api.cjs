#!/usr/bin/env node

// Test Shiprocket Full API with API User
require('dotenv').config();

async function testShiprocketFullApi() {
  try {
    console.log('Testing Shiprocket Full API with API User...\n');
    
    // Import the full API service
    const shiprocketFullApiService = await import('./services/shiprocketFullApiService.js');
    const service = shiprocketFullApiService.default;
    
    console.log('1. Testing API User authentication...');
    
    try {
      const token = await service.getApiToken();
      console.log('✅ API User authentication successful');
      console.log('🔑 Token length:', token.length);
    } catch (authError) {
      console.log('❌ API User authentication failed:', authError.message);
      return;
    }
    
    console.log('\n2. Testing serviceable couriers...');
    
    const orderData = {
      pickupPincode: '400001',
      deliveryPincode: '400002',
      weight: 0.5,
      paymentMethod: 'prepaid'
    };
    
    try {
      const couriers = await service.getServiceableCouriers(orderData);
      console.log('✅ Serviceable couriers:', couriers.success ? 'Success' : 'Failed');
      if (couriers.success) {
        console.log('   Available couriers count:', couriers.data?.data?.couriers?.length || 0);
      }
    } catch (courierError) {
      console.log('❌ Serviceable couriers failed:', courierError.message);
    }
    
    console.log('\n3. Testing order creation with full API...');
    
    const testOrder = {
      _id: 'full-api-test-' + Date.now(),
      items: [{
        name: 'Test Jewelry - Full API',
        productId: 'test-product-full-api',
        price: 1999,
        quantity: 1,
        subtotal: 1999
      }],
      shippingAddress: {
        firstName: 'Full',
        lastName: 'API Test',
        streetAddress: '123 Full API Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        mobile: '9876543210',
        email: 'fullapi@kkingsjewellery.com'
      },
      paymentMethod: 'prepaid',
      totalAmount: 1999,
      notes: 'Full API Test Order'
    };
    
    try {
      const orderResult = await service.createOrder(testOrder);
      console.log('✅ Order creation:', orderResult.success ? 'Success' : 'Failed');
      if (orderResult.success) {
        console.log('   Shipment ID:', orderResult.shipmentId);
        console.log('   Order ID:', orderResult.orderId);
        console.log('   Tracking URL:', orderResult.trackingUrl);
        
        // Test AWB assignment
        console.log('\n4. Testing AWB assignment...');
        try {
          const awbResult = await service.assignAWB(orderResult.shipmentId);
          console.log('✅ AWB assignment:', awbResult.success ? 'Success' : 'Failed');
          if (awbResult.success) {
            console.log('   AWB Code:', awbResult.awbCode);
            console.log('   Courier:', awbResult.courierName);
            
            // Test tracking by AWB
            console.log('\n5. Testing tracking by AWB...');
            try {
              const trackingResult = await service.trackByAWB(awbResult.awbCode);
              console.log('✅ Tracking by AWB:', trackingResult.success ? 'Success' : 'Failed');
              if (trackingResult.success) {
                console.log('   Tracking data available');
              }
            } catch (trackingError) {
              console.log('❌ Tracking by AWB failed:', trackingError.message);
            }
          }
        } catch (awbError) {
          console.log('❌ AWB assignment failed:', awbError.message);
        }
        
        // Test label generation
        console.log('\n6. Testing label generation...');
        try {
          const labelResult = await service.generateLabel(orderResult.shipmentId);
          console.log('✅ Label generation:', labelResult.success ? 'Success' : 'Failed');
          if (labelResult.success) {
            console.log('   Label URL:', labelResult.labelUrl);
          }
        } catch (labelError) {
          console.log('❌ Label generation failed:', labelError.message);
        }
        
        // Test invoice printing
        console.log('\n7. Testing invoice printing...');
        try {
          const invoiceResult = await service.printInvoice(orderResult.orderId);
          console.log('✅ Invoice printing:', invoiceResult.success ? 'Success' : 'Failed');
          if (invoiceResult.success) {
            console.log('   Invoice URL:', invoiceResult.invoiceUrl);
          }
        } catch (invoiceError) {
          console.log('❌ Invoice printing failed:', invoiceError.message);
        }
        
        // Test manifest generation
        console.log('\n8. Testing manifest generation...');
        try {
          const manifestResult = await service.generateManifest([orderResult.orderId]);
          console.log('✅ Manifest generation:', manifestResult.success ? 'Success' : 'Failed');
          if (manifestResult.success) {
            console.log('   Manifest ID:', manifestResult.manifestId);
            console.log('   Manifest URL:', manifestResult.manifestUrl);
            
            // Test manifest printing
            console.log('\n9. Testing manifest printing...');
            try {
              const printResult = await service.printManifest(manifestResult.manifestId);
              console.log('✅ Manifest printing:', printResult.success ? 'Success' : 'Failed');
              if (printResult.success) {
                console.log('   PDF URL:', printResult.pdfUrl);
              }
            } catch (printError) {
              console.log('❌ Manifest printing failed:', printError.message);
            }
          }
        } catch (manifestError) {
          console.log('❌ Manifest generation failed:', manifestError.message);
        }
        
        // Test pickup generation
        console.log('\n10. Testing pickup generation...');
        try {
          const pickupResult = await service.generatePickup([orderResult.shipmentId]);
          console.log('✅ Pickup generation:', pickupResult.success ? 'Success' : 'Failed');
          if (pickupResult.success) {
            console.log('   Pickup data available');
          }
        } catch (pickupError) {
          console.log('❌ Pickup generation failed:', pickupError.message);
        }
        
      }
    } catch (orderError) {
      console.log('❌ Order creation failed:', orderError.message);
    }
    
    console.log('\n11. Testing orders list...');
    
    try {
      const ordersResult = await service.getOrders(1, 10);
      console.log('✅ Orders list:', ordersResult.success ? 'Success' : 'Failed');
      if (ordersResult.success) {
        console.log('   Orders count:', ordersResult.orders.length);
        console.log('   Total pages:', ordersResult.pagination?.total_pages || 0);
        console.log('   Current page:', ordersResult.pagination?.current_page || 0);
      }
    } catch (ordersError) {
      console.log('❌ Orders list failed:', ordersError.message);
    }
    
    console.log('\n🎯 Full API Test Complete!');
    console.log('✅ All Shiprocket Full API features tested');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testShiprocketFullApi();
