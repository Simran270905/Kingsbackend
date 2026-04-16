#!/usr/bin/env node

// 🚀 Render Deployment Script for CommonJS Backend
console.log('🚀 Starting Render deployment...\n')

// Set environment for ES modules
process.env.NODE_ENV = 'production'
process.env.NODE_OPTIONS = '--loader'

console.log('📋 Environment set for CommonJS deployment')
console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS}`)

// Start the server
console.log('🌐 Starting server...')
const { spawn } = require('child_process')

// Start server with --loader flag for ES modules
const serverProcess = spawn('node', ['--loader', 'server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    NODE_OPTIONS: '--loader'
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
