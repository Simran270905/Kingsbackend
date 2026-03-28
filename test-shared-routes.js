// Test shared routes import
try {
  console.log('🔍 Testing shared routes import...')
  import('./src/routes/shared/index.js').then(sharedRoutes => {
    console.log('✅ Shared routes imported successfully')
  }).catch(error => {
    console.error('❌ Error importing shared routes:', error.message)
    console.error('❌ Stack trace:', error.stack)
  })
} catch (error) {
  console.error('❌ Error importing shared routes:', error.message)
  console.error('❌ Stack trace:', error.stack)
}
