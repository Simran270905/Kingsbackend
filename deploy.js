#!/usr/bin/env node

// 🚀 Final Production Deployment Script
console.log('🚀 Starting production deployment...\n')

// Set production environment
process.env.NODE_ENV = 'production'

console.log('📋 Environment set:', process.env.NODE_ENV)

// Start the server
const { spawn } = require('child_process')

console.log('🌐 Starting production server...')
const serverProcess = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
})

serverProcess.on('error', (error) => {
  console.error('❌ Server start error:', error)
  process.exit(1)
})

serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code: ${code}`)
  process.exit(code)
})
