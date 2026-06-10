import { Router } from 'express';
import { ContactController } from '../controllers/contactController.js';
import { validateRequest } from '../middleware/validation.js';
import { contactSchema } from '../../shared/validation.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post(
  '/contact',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many contact requests. Please try again in 15 minutes.' }),
  validateRequest(contactSchema),
  ContactController.handleContactForm
);

export const contactRouter = router;
