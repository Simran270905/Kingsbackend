// Test route to clear existing review for testing
import Review from '../models/Review.js'

export async function clearTestReview(req, res) {
  try {
    const { orderId, productId } = req.query
    
    if (!orderId || !productId) {
      return res.status(400).json({
        error: 'orderId and productId are required'
      })
    }
    
    // Delete existing review for this order and product
    const result = await Review.deleteOne({
      orderId: orderId,
      productId: productId
    })
    
    if (result.deletedCount > 0) {
      res.json({
        success: true,
        message: 'Test review cleared successfully',
        deletedCount: result.deletedCount
      })
    } else {
      res.json({
        success: true,
        message: 'No existing review found to clear',
        deletedCount: 0
      })
    }
  } catch (error) {
    console.error('Error clearing test review:', error)
    res.status(500).json({
      error: 'Failed to clear test review'
    })
  }
}
