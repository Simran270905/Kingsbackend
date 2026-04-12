import express from 'express';
const router = express.Router();
import {
  createContactMessage,
  getContactMessages,
  getContactMessage,
  updateMessageStatus,
  deleteContactMessage
} from '../controllers/contactController.js';
import { adminOnly } from '../middleware/auth.js';

// Public route - Create contact message
router.post('/', createContactMessage);

// Admin routes - Manage contact messages
router.get('/', adminOnly, getContactMessages);
router.get('/:id', adminOnly, getContactMessage);
router.put('/:id/status', adminOnly, updateMessageStatus);
router.delete('/:id', adminOnly, deleteContactMessage);

export default router;
