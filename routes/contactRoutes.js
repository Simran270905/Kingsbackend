import express from 'express';
const router = express.Router();
import {
  createContactMessage,
  getContactMessages,
  getContactMessage,
  updateMessageStatus,
  deleteContactMessage
} from '../controllers/contactController.js';
import { protectAdmin } from '../middleware/auth.js';

// Admin routes - Manage contact messages
router.get('/', protectAdmin, getContactMessages);
router.get('/:id', protectAdmin, getContactMessage);
router.put('/:id/status', protectAdmin, updateMessageStatus);
router.delete('/:id', protectAdmin, deleteContactMessage);

export default router;
