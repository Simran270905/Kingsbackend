import express from 'express'
import jwt from 'jsonwebtoken'
import { loginAdmin, verifyAdmin, logoutAdmin } from '../../controllers/admin/adminController.js'
import { getDashboardStats, refreshDashboard } from '../../controllers/admin/adminDashboardController.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'
import Review from '../../models/Review.js'

const router = express.Router()

// Basic admin routes
router.post('/login', loginAdmin)
router.get('/verify', protectAdmin, verifyAdmin)
router.post('/logout', protectAdmin, logoutAdmin)

// Dashboard endpoints - temporarily without protectAdmin
router.get('/dashboard', getDashboardStats)
router.post('/dashboard/refresh', refreshDashboard)

// Reviews management endpoints
router.get('/reviews', protectAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
    const status = req.query.status || null

    // Build query
    const query = {}
    if (status) {
      query.status = status
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('productId', 'name')
      .lean()

    const total = await Review.countDocuments(query)

    res.json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching admin reviews:', error)
    res.status(500).json({
      error: 'Failed to fetch reviews'
    })
  }
})

router.put('/reviews/:id/approve', protectAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { moderationNote } = req.body

    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        error: 'Review not found'
      })
    }

    review.status = 'approved'
    review.moderatedBy = req.user.id
    review.moderatedAt = new Date()
    if (moderationNote) {
      review.moderationNote = moderationNote
    }

    await review.save()

    res.json({
      success: true,
      message: 'Review approved successfully',
      reviewId: review._id,
      review: review
    })

  } catch (error) {
    console.error('Error approving review:', error)
    res.status(500).json({
      error: 'Failed to approve review'
    })
  }
})

router.put('/reviews/:id/reject', protectAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { moderationNote } = req.body

    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        error: 'Review not found'
      })
    }

    review.status = 'rejected'
    review.moderatedBy = req.user.id
    review.moderatedAt = new Date()
    if (moderationNote) {
      review.moderationNote = moderationNote
    }

    await review.save()

    res.json({
      success: true,
      message: 'Review rejected successfully',
      reviewId: review._id,
      review: review
    })

  } catch (error) {
    console.error('Error rejecting review:', error)
    res.status(500).json({
      error: 'Failed to reject review'
    })
  }
})

export default router
