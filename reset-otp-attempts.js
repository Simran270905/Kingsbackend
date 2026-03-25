// Reset OTP attempts script
// Run this to clear OTP attempts for a specific email

const fetch = require('node-fetch');

async function resetOTPAttempts(email) {
  try {
    const response = await fetch('https://kingsbackend-y3fu.onrender.com/api/otp/reset-attempts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ OTP attempts reset successfully for:', email);
      console.log('📧 You can now request a new OTP and try again');
    } else {
      console.error('❌ Error:', data.message);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Replace with your email address
const email = 'your-email@example.com'; // Change this to your email

resetOTPAttempts(email);
