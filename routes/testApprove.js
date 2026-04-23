// Test route to debug approve endpoint
export async function testApprove(req, res) {
  try {
    // Check if Review model works
    const Review = (await import('../models/Review.js')).default
    
    console.log('Testing Review model...')
    
    // Try to find any reviews
    const reviews = await Review.find().limit(1)
    console.log('Found reviews:', reviews.length)
    
    // Try to find by ID
    const review = await Review.findById('test-id')
    console.log('Review by test-id:', review)
    
    res.json({
      success: true,
      message: 'Test completed',
      reviewsCount: reviews.length,
      testReview: review
    })
  } catch (error) {
    console.error('Test error:', error)
    res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}
