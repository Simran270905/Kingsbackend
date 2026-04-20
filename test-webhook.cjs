#!/usr/bin/env node

// Test webhook endpoint
const http = require('http');
const fs = require('fs');

const webhookData = {
  awb: 59629792084,
  current_status: "Delivered",
  order_id: "13905312",
  current_status_id: 7,
  channel_order_id: "test-order-123",
  courier_name: "Test Courier",
  scans: [
    {
      date: "2019-06-25 12:08:00",
      activity: "SHIPMENT DELIVERED",
      location: "PATIALA"
    }
  ]
};

const postData = JSON.stringify(webhookData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/payment/fulfillment/update',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'kings_webhook_secret_2024',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log('🔍 Testing webhook endpoint...');
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    console.log('✅ Webhook test completed');
  });
});

req.on('error', (e) => {
  console.error('❌ Webhook test failed:', e.message);
});

req.write(postData);

console.log('📤 Sending webhook test request...');
console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Data:', JSON.stringify(webhookData, null, 2));
