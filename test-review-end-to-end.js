// End-to-end review system test
import { generateJWTReviewToken } from './utils/reviewToken.js';

async function testReviewSystem() {
  console.log('=== END-TO-END REVIEW SYSTEM TEST ===\n');

  // Test order details (using a realistic order ID format)
  const testOrderId = '69e679bf0a9eb574729bbd7e'; // From previous logs
  const testEmail = 'simrankadamkb12@gmail.com';
  
  console.log('1. Generating JWT Review Token...');
  const jwtToken = generateJWTReviewToken(testOrderId, testEmail);
  console.log('✅ JWT Token generated:', jwtToken.substring(0, 50) + '...');
  
  console.log('\n2. Testing Token Verification...');
  try {
    const verifyUrl = `https://api.kkingsjewellery.com/api/reviews/verify-token?orderId=${testOrderId}&token=${encodeURIComponent(jwtToken)}`;
    console.log('URL:', verifyUrl);
    
    const response = await fetch(verifyUrl);
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.valid) {
      console.log('✅ Token verification successful!');
      
      if (data.products && data.products.length > 0) {
        console.log('\n3. Testing Review Submission...');
        
        const productId = data.products[0].productId;
        const reviewData = {
          orderId: testOrderId,
          productId: productId,
          rating: 5,
          comment: 'Excellent product! Great quality and fast delivery. Very satisfied with my purchase.',
          token: jwtToken
        };
        
        console.log('Review Data:', JSON.stringify(reviewData, null, 2));
        
        try {
          const submitResponse = await fetch('https://api.kkingsjewellery.com/api/reviews/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(reviewData)
          });
          
          const submitData = await submitResponse.json();
          
          console.log('Submit Response Status:', submitResponse.status);
          console.log('Submit Response Data:', JSON.stringify(submitData, null, 2));
          
          if (submitResponse.ok) {
            console.log('✅ Review submitted successfully!');
            console.log('Review ID:', submitData.reviewId);
            console.log('Status:', submitData.status);
            
            // Test admin panel verification
            console.log('\n4. Testing Admin Panel Verification...');
            await testAdminPanel(submitData.reviewId);
            
          } else {
            console.log('❌ Review submission failed:', submitData.error);
          }
        } catch (submitError) {
          console.log('❌ Submit API error:', submitError.message);
        }
      } else {
        console.log('❌ No products found in order for testing');
      }
    } else {
      console.log('❌ Token verification failed:', data.error || 'Unknown error');
    }
  } catch (verifyError) {
    console.log('❌ Verification API error:', verifyError.message);
  }
}

async function testAdminPanel(reviewId) {
  try {
    // Get admin login token
    const loginResponse = await fetch('https://api.kkingsjewellery.com/api/admin/login', {
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
    
    if (loginResponse.ok && loginData.token) {
      console.log('✅ Admin login successful');
      
      // Check admin reviews endpoint
      const reviewsResponse = await fetch('https://api.kkingsjewellery.com/api/admin/reviews', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      
      const reviewsData = await reviewsResponse.json();
      
      console.log('Admin Reviews Response Status:', reviewsResponse.status);
      console.log('Admin Reviews Data:', JSON.stringify(reviewsData, null, 2));
      
      // Look for our submitted review
      if (reviewsData.data && Array.isArray(reviewsData.data)) {
        const ourReview = reviewsData.data.find(review => review._id === reviewId);
        if (ourReview) {
          console.log('✅ Review found in admin panel!');
          console.log('Review details:', {
            id: ourReview._id,
            status: ourReview.status,
            rating: ourReview.rating,
            email: ourReview.email,
            orderId: ourReview.orderId
          });
        } else {
          console.log('❌ Review not found in admin panel yet');
        }
      } else {
        console.log('❌ Invalid reviews data format from admin API');
      }
    } else {
      console.log('❌ Admin login failed:', loginData.message);
    }
  } catch (adminError) {
    console.log('❌ Admin panel test error:', adminError.message);
  }
}

// Run the test
testReviewSystem().then(() => {
  console.log('\n=== TEST COMPLETE ===');
}).catch(error => {
  console.error('Test failed:', error);
});
