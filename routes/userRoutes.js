import express from 'express'
import { loginOrRegisterUser, getAllUsers } from '../controllers/userController.js'

const router = express.Router()

// Login or register user (no password required)
router.post('/login', loginOrRegisterUser)

// Get all users (for admin panel)
router.get('/', getAllUsers)

export default router
