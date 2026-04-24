import express from 'express';
const router = express.Router();
import { createContactMessage } from '../controllers/contactController.js';

// Public route - Create contact message
router.post('/', createContactMessage);

export default router;
