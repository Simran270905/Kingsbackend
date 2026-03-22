import express from 'express'
import { loginAdmin, verifyAdmin, logoutAdmin } from '../controllers/adminController.js'
import { getAllCustomers } from '../controllers/userController.js'
import { protectAdmin, loginRateLimiter } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/login', loginRateLimiter, loginAdmin)
router.get('/verify', protectAdmin, verifyAdmin)
router.post('/logout', protectAdmin, logoutAdmin)
router.get('/customers', protectAdmin, getAllCustomers)

export default router
