import dotenv from 'dotenv';
import { generateReviewLink } from './utils/generateReviewLink.js';

// Load environment variables
dotenv.config();

// Generate final debug token
const realOrderId = '69e679bf0a9eb574729bbd7e';
const testEmail = 'customer@example.com';

console.log('Generating FINAL debug token:');

const reviewLink = generateReviewLink(realOrderId, testEmail);

if (reviewLink) {
  console.log('\n=== FINAL DEBUG LINK ===');
  console.log('Copy this link:');
  console.log(reviewLink);
  
  // Extract and analyze token
  const url = new URL(reviewLink);
  const token = url.searchParams.get('token');
  
  console.log('\n=== TOKEN ANALYSIS ===');
  console.log('Token:', token);
  console.log('Length:', token.length);
  
  const parts = token.split('.');
  console.log('Parts count:', parts.length);
  
  if (parts.length === 3) {
    try {
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      console.log('Header:', header);
      console.log('Payload:', payload);
      console.log('Order ID matches:', payload.orderId === realOrderId);
      console.log('Email matches:', payload.email === testEmail);
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  }
} else {
  console.log('Failed to generate review link');
}
