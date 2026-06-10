import { Request, Response } from 'express';
import { ContactService } from '../services/contactService.js';

export class ContactController {
  static async handleContactForm(req: Request, res: Response) {
    const { name, email, subject, message } = req.body;

    try {
      const result = await ContactService.handleContactForm(name, email, subject, message);
      return res.json(result);
    } catch (err: any) {
      console.error('Contact Form Error:', err);
      return res.status(500).json({ message: err.message || 'Failed to submit contact message.' });
    }
  }
}
