// SIMPLE BACKEND SERVER STARTUP SCRIPT
// Run with: node start-server.js

console.log('=== STARTING BACKEND SERVER ===')

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('\n=== STARTING SERVER ===')
console.log('Starting backend server...')

// Start the server
const serverProcess = spawn('node', ['./server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
})

serverProcess.stdout.on('data', (data) => {
  process.stdout.write(data)
})

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(data)
})

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message)
})

serverProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Backend server started successfully!')
    console.log('📧 Server is running on: https://www.kkingsjewellery.com')
    console.log('📧 Frontend should connect to https://www.kkingsjewellery.com/api')
    console.log('📧 Admin panel: https://www.kkingsjewellery.com/admin')
    console.log('📧 Manual review email feature is ready!')
    console.log('📧 Go to: https://www.kkingsjewellery.com/admin/orders')
    console.log('📧 Click Orders → View any order → Send Review Email')
  } else {
    console.error('❌ Backend server exited with code:', code)
  }
})

console.log('\n=== SERVER INFO ===')
console.log('📧 Server will run on port 5000')
console.log('📧 Frontend should connect to http://localhost:5000/api')
console.log('📧 Admin panel: http://localhost:5173/admin')
console.log('📧 Manual review email feature is ready!')

console.log('\n=== TO STOP SERVER ===')
console.log('Press Ctrl+C to stop the server')

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...')
  serverProcess.kill('SIGINT')
  process.exit(0)
})

console.log('\n=== READY ===')
console.log('🚀 Backend server starting...')
console.log('📧 Manual review email feature is ready for testing!')
