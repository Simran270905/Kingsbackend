// Test coupon routes import
try {
  console.log('🔍 Testing coupon routes import...')
  import('./src/routes/shared/coupons.js').then(couponRoutes => {
    console.log('✅ Coupon routes imported successfully:', couponRoutes)
  }).catch(error => {
    console.error('❌ Error importing coupon routes:', error.message)
    console.error('❌ Stack trace:', error.stack)
  })
} catch (error) {
  console.error('❌ Error importing coupon routes:', error.message)
  console.error('❌ Stack trace:', error.stack)
}
