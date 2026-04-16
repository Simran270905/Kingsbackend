#!/usr/bin/env node

// 🚀 Render Deployment Script for ES Modules (CommonJS wrapper)
console.log('🚀 Starting Render deployment...\n')

// Set environment for ES modules
process.env.NODE_ENV = 'production'

console.log('📋 Environment set for ES module deployment')
console.log(`NODE_ENV: ${process.env.NODE_ENV}`)

// Start the server using child_process
const { spawn } = require('child_process')

console.log('🌐 Starting server...')
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
