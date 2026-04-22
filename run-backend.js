// SIMPLE BACKEND STARTUP
// Run with: node run-backend.js

console.log('=== STARTING BACKEND SERVER ===')

const { exec } = require('child_process')

console.log('Starting backend server...')

// Start server using exec (works with current setup)
const serverProcess = exec('node server.js', {
  cwd: __dirname,
  stdio: 'inherit'
})

serverProcess.stdout.on('data', (data) => {
  process.stdout.write(data)
})

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(data)
})

serverProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Backend server started successfully!')
    console.log('📧 Server is running on: http://localhost:5000')
    console.log('📧 Frontend should connect to http://localhost:5000/api')
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
console.log('📧 Manual review email feature is ready for testing!')

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
console.log('📧 Manual review email feature is ready!')
