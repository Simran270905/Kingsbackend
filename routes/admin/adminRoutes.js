import express from 'express'
import jwt from 'jsonwebtoken'
import { loginAdmin, verifyAdmin, logoutAdmin } from '../../controllers/admin/adminController.js'
import { getDashboardStats, refreshDashboard } from '../../controllers/admin/adminDashboardController.js'
import { protectAdmin } from '../../middleware/authMiddleware.js'

const router = express.Router()

// Basic admin routes
router.post('/login', loginAdmin)
router.get('/verify', protectAdmin, verifyAdmin)
router.post('/logout', protectAdmin, logoutAdmin)

// Dashboard endpoints - temporarily without protectAdmin
router.get('/dashboard', getDashboardStats)
router.post('/dashboard/refresh', refreshDashboard)

export default router
