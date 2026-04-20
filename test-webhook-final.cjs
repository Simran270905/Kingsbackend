#!/usr/bin/env node

// Test Shiprocket webhook endpoint
const http = require('http');

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

console.log('🔍 Testing Shiprocket webhook endpoint...');
console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Data:', JSON.stringify(webhookData, null, 2));

const req = http.request(options, (res) => {
  console.log('📡 Status:', res.statusCode);
  console.log('📋 Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response:', data);
    if (data.includes('received":true')) {
      console.log('✅ Webhook test SUCCESSFUL');
    } else {
      console.log('❌ Webhook test FAILED');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Webhook test ERROR:', e.message);
});

req.write(postData);
console.log('📤 Request sent...');
