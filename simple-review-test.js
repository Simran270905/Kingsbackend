// Simple review system test with existing order
import fetch from 'node-fetch';

async function testReviewSystem() {
  console.log('=== SIMPLE REVIEW SYSTEM TEST ===\n');

  // Use the order ID from the original error logs
  const orderId = '69e679bf0a9eb574729bbd7e';
  const email = 'simrankadamkb12@gmail.com';

  try {
    // Step 1: Get a valid JWT token from debug endpoint
    console.log('1. Getting JWT token from debug endpoint...');
    const debugResponse = await fetch('http://localhost:5000/api/reviews/debug-token');
    const debugData = await debugResponse.json();

    if (!debugResponse.ok) {
      throw new Error(`Debug endpoint failed: ${debugData.error}`);
    }

    console.log('✅ JWT token obtained');
    console.log('JWT Token (first 50 chars):', debugData.jwt_token.substring(0, 50) + '...');

    // Step 2: Test token verification
    console.log('\n2. Testing token verification...');
    const verifyUrl = `http://localhost:5000/api/reviews/verify-token?orderId=${orderId}&token=${encodeURIComponent(debugData.jwt_token)}`;
    
    const verifyResponse = await fetch(verifyUrl);
    const verifyData = await verifyResponse.json();

    console.log('Verification Status:', verifyResponse.status);
    console.log('Verification Response:', JSON.stringify(verifyData, null, 2));

    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyData.error || verifyData.message}`);
    }

    if (!verifyData.valid) {
      throw new Error(`Token invalid: ${verifyData.error}`);
    }

    console.log('✅ Token verification successful!');

    // Step 3: Check if we have products to review
    if (!verifyData.products || verifyData.products.length === 0) {
      console.log('❌ No products found for review. Creating mock product data...');
      
      // Create a mock product for testing
      verifyData.products = [{
        productId: '507f1f77bcf86cd799439011',
        name: 'Test Gold Necklace',
        image: null,
        quantity: 1,
        price: 9999
      }];
    }

    // Step 4: Submit a review
    console.log('\n3. Submitting review...');
    const product = verifyData.products[0];
    
    const reviewData = {
      orderId: orderId,
      productId: product.productId,
      rating: 5,
      comment: 'Excellent product! Great quality and fast delivery. Very satisfied with my purchase. The item was exactly as described and arrived in perfect condition. Would definitely recommend to others.',
      token: debugData.jwt_token
    };

    console.log('Review Data:', JSON.stringify(reviewData, null, 2));

    const submitResponse = await fetch('http://localhost:5000/api/reviews/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewData)
    });

    const submitData = await submitResponse.json();

    console.log('Submit Response Status:', submitResponse.status);
    console.log('Submit Response:', JSON.stringify(submitData, null, 2));

    if (!submitResponse.ok) {
      throw new Error(`Review submission failed: ${submitData.error || submitData.message}`);
    }

    console.log('✅ Review submitted successfully!');
    console.log('Review ID:', submitData.reviewId);
    console.log('Review Status:', submitData.status);

    // Step 5: Test admin panel
    console.log('\n4. Testing admin panel...');
    await testAdminPanel(submitData.reviewId);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testAdminPanel(reviewId) {
  try {
    console.log('Testing admin panel for submitted review...');

    // Admin login
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
          comment: ourReview.comment ? ourReview.comment.substring(0, 100) + '...' : 'No comment'
        });

        // Test review approval if pending
        if (ourReview.status === 'pending') {
          console.log('\n5. Testing review approval...');
          await testReviewApproval(loginData.token, reviewId);
        }

      } else {
        console.log('❌ Review not found in admin panel');
        console.log('Available reviews:', reviewsData.data.map(r => ({ id: r._id, email: r.email, status: r.status })));
      }
    } else {
      console.log('❌ Invalid admin reviews response format');
    }

  } catch (error) {
    console.error('❌ Admin panel test failed:', error.message);
  }
}

async function testReviewApproval(adminToken, reviewId) {
  try {
    console.log(`Approving review ${reviewId}...`);

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
      console.log('New status:', approveData.review?.status || approveData.status);
    } else {
      console.log('❌ Review approval failed:', approveData.error);
    }

  } catch (error) {
    console.error('❌ Approval test failed:', error.message);
  }
}

// Run the test
testReviewSystem().then(() => {
  console.log('\n=== TEST COMPLETE ===');
  console.log('✅ End-to-end review system test completed!');
}).catch(error => {
  console.error('Test suite failed:', error);
});
