#!/usr/bin/env node

// 🧪 Simple Local Deployment Test
console.log('🧪 Testing local deployment...\n')

const { spawn } = require('child_process')

console.log('🌐 Starting server...')
const serverProcess = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: {
    NODE_ENV: 'production',
    NODE_OPTIONS: '--loader'
  }
})

serverProcess.on('error', (error) => {
  console.error('❌ Server start error:', error)
})

serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code: ${code}`)
})
