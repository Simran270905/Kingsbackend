#!/usr/bin/env node

// Simple test for webhook endpoint
const http = require('http');

const webhookData = {
  awb: "123456789",
  current_status: "Delivered",
  order_id: "SR123456",
  channel_order_id: "test-simple-789",
  courier_name: "Test Courier"
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/payment/fulfillment/update',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'kings_webhook_secret_2024'
  }
};

const req = http.request(options, (res) => {
  console.log('📡 Status:', res.statusCode);
  console.log('📄 Response:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response:', data);
    console.log('✅ Webhook test result:', data.includes('received":true') ? 'SUCCESS' : 'FAILED');
  });
});

req.on('error', (e) => {
  console.error('❌ Webhook test error:', e.message);
});

req.write(JSON.stringify(webhookData));

console.log('🔍 Testing webhook endpoint...');
console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Data:', JSON.stringify(webhookData, null, 2));
