// Create a test order for review testing
import fetch from 'node-fetch';

async function createTestOrder() {
  console.log('=== CREATING TEST ORDER FOR REVIEW TESTING ===\n');

  try {
    // First get a product to include in the order
    console.log('1. Getting available products...');
    const productsResponse = await fetch('http://localhost:5000/api/products?limit=5');
    const productsData = await productsResponse.json();
    
    if (!productsResponse.ok || !productsData.data || productsData.data.length === 0) {
      throw new Error('No products available');
    }
    
    const product = productsData.data[0];
    console.log('✅ Found product:', product.name);
    console.log('Product ID:', product._id);
    console.log('Price:', product.price);
    
    // Create test order with delivered status
    console.log('\n2. Creating test order...');
    
    const testOrder = {
      guestInfo: {
        firstName: 'Simran',
        lastName: 'Kadam',
        email: 'simrankadamkb12@gmail.com',
        mobile: '9876543210',
        streetAddress: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001'
      },
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images?.[0] || ''
      }],
      subtotal: product.price,
      shipping: 50,
      tax: 0,
      codCharges: 0,
      discount: 0,
      finalAmount: product.price + 50,
      paymentMethod: 'COD',
      status: 'delivered',  // Important: must be delivered for review system
      deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
    };
    
    console.log('Order data:', JSON.stringify(testOrder, null, 2));
    
    const orderResponse = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrder)
    });
    
    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      throw new Error(`Order creation failed: ${orderData.error || 'Unknown error'}`);
    }
    
    console.log('✅ Test order created successfully!');
    console.log('Order ID:', orderData.order._id);
    console.log('Status:', orderData.order.status);
    console.log('Email:', orderData.order.guestInfo.email);
    
    // Now test the review system with this order
    await testReviewWithOrder(orderData.order);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testReviewWithOrder(order) {
  console.log('\n=== TESTING REVIEW SYSTEM WITH CREATED ORDER ===\n');
  
  try {
    // Generate JWT review token
    console.log('1. Generating JWT review token...');
    
    // Use the debug endpoint to get a valid token
    const debugResponse = await fetch(`http://localhost:5000/api/reviews/debug-token`);
    const debugData = await debugResponse.json();
    
    if (!debugResponse.ok) {
      throw new Error(`Debug endpoint failed: ${debugData.error}`);
    }
    
    console.log('✅ JWT Token generated (from debug endpoint)');
    
    // Test token verification
    console.log('\n2. Testing token verification...');
    
    const verifyUrl = `http://localhost:5000/api/reviews/verify-token?orderId=${order._id}&token=${encodeURIComponent(debugData.jwt_token)}`;
    console.log('Verification URL:', verifyUrl);
    
    const verifyResponse = await fetch(verifyUrl);
    const verifyData = await verifyResponse.json();
    
    console.log('Verification Status:', verifyResponse.status);
    console.log('Verification Data:', JSON.stringify(verifyData, null, 2));
    
    if (!verifyResponse.ok) {
      throw new Error(`Token verification failed: ${verifyData.error}`);
    }
    
    if (!verifyData.valid) {
      throw new Error(`Token invalid: ${verifyData.error}`);
    }
    
    console.log('✅ Token verification successful!');
    
    if (verifyData.products && verifyData.products.length > 0) {
      // Submit a review
      console.log('\n3. Submitting review...');
      
      const product = verifyData.products[0];
      const reviewData = {
        orderId: order._id,
        productId: product.productId,
        rating: 5,
        comment: 'Excellent product! Great quality and fast delivery. Very satisfied with my purchase. The item was exactly as described and arrived in perfect condition.',
        token: debugData.jwt_token
      };
      
      console.log('Review data:', JSON.stringify(reviewData, null, 2));
      
      const submitResponse = await fetch('http://localhost:5000/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData)
      });
      
      const submitData = await submitResponse.json();
      
      console.log('Submit Response Status:', submitResponse.status);
      console.log('Submit Response Data:', JSON.stringify(submitData, null, 2));
      
      if (!submitResponse.ok) {
        throw new Error(`Review submission failed: ${submitData.error}`);
      }
      
      console.log('✅ Review submitted successfully!');
      console.log('Review ID:', submitData.reviewId);
      console.log('Review Status:', submitData.status);
      
      // Test admin panel
      console.log('\n4. Testing admin panel...');
      await testAdminPanel(submitData.reviewId);
      
    } else {
      console.log('❌ No products found in order for review testing');
    }
    
  } catch (error) {
    console.error('❌ Review test failed:', error.message);
  }
}

async function testAdminPanel(reviewId) {
  try {
    console.log('Testing admin panel for submitted review...');
    
    // Get admin login
    const loginResponse = await fetch('http://localhost:5000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@kkings.com',
        password: 'Kkingsjewellery@11'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      throw new Error(`Admin login failed: ${loginData.message}`);
    }
    
    console.log('✅ Admin login successful');
    
    // Check admin reviews
    const reviewsResponse = await fetch('http://localhost:5000/api/admin/reviews', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    const reviewsData = await reviewsResponse.json();
    
    console.log('Admin Reviews Response:', JSON.stringify(reviewsData, null, 2));
    
    if (reviewsData.data && Array.isArray(reviewsData.data)) {
      const ourReview = reviewsData.data.find(review => review._id === reviewId);
      
      if (ourReview) {
        console.log('✅ Review found in admin panel!');
        console.log('Review Details:', {
          id: ourReview._id,
          status: ourReview.status,
          rating: ourReview.rating,
          email: ourReview.email,
          orderId: ourReview.orderId,
          comment: ourReview.comment?.substring(0, 50) + '...'
        });
        
        // Test review approval
        if (ourReview.status === 'pending') {
          console.log('\n5. Testing review approval...');
          await testReviewApproval(loginData.token, reviewId);
        }
        
      } else {
        console.log('❌ Review not found in admin panel');
      }
    } else {
      console.log('❌ Invalid admin reviews response');
    }
    
  } catch (error) {
    console.error('❌ Admin panel test failed:', error.message);
  }
}

async function testReviewApproval(adminToken, reviewId) {
  try {
    console.log('Approving review...', reviewId);
    
    const approveResponse = await fetch(`http://localhost:5000/api/admin/reviews/${reviewId}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const approveData = await approveResponse.json();
    
    console.log('Approval Response:', JSON.stringify(approveData, null, 2));
    
    if (approveResponse.ok) {
      console.log('✅ Review approved successfully!');
      console.log('New status:', approveData.review?.status);
    } else {
      console.log('❌ Review approval failed:', approveData.error);
    }
    
  } catch (error) {
    console.error('❌ Approval test failed:', error.message);
  }
}

// Run the complete test
createTestOrder().then(() => {
  console.log('\n=== END-TO-END TEST COMPLETE ===');
  console.log('✅ Review system tested successfully!');
}).catch(error => {
  console.error('Test suite failed:', error);
});
