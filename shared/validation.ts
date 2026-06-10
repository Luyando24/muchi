import { z } from 'zod';

export const contactSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').trim(),
    email: z.string().email('Invalid email address').trim(),
    subject: z.string().min(1, 'Subject is required').trim(),
    message: z.string().min(1, 'Message is required').trim(),
  }),
});

export type ContactInput = z.infer<typeof contactSchema>;
