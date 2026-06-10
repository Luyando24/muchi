import express from 'express';
import cors from 'cors';

// Import Routes
import { authRouter } from './routes/auth.js';
import { schoolRouter } from './routes/schools.js';
import { userRouter } from './routes/users.js';
import { infrastructureRouter } from './routes/infrastructure.js';
import { adminRouter } from './routes/admin.js';
import { schoolAdminRouter } from './routes/school.js';
import { studentRouter } from './routes/student.js';
import { teacherRouter } from './routes/teacher.js';
import { websiteRouter } from './routes/website.js';
import { feedingProgramRouter } from './routes/feeding-program.js';
import { governmentPortalRouter } from './routes/government-portal.js';
import { financeRouter } from './routes/finance.js';
import { tuckshopRouter } from './routes/tuckshop.js';
import { sendEmail } from './services/emailService.js';
import { supabaseAdmin } from './lib/supabase.js';
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/schools', schoolRouter);
app.use('/api/users', userRouter);
app.use('/api/infrastructure', infrastructureRouter);
app.use('/api/admin', adminRouter);
app.use('/api/school', schoolAdminRouter);
app.use('/api/student', studentRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/school', websiteRouter);
app.use('/api/school/feeding-program', feedingProgramRouter);
app.use('/api/government', governmentPortalRouter);
app.use('/api/finance', financeRouter);
app.use('/api/school/tuckshop', tuckshopRouter);
// The requirement says "Add a new module to school admin portal", 
// usually /api/school is for school admin portal. 
// Let's use /api/school/website as a prefix or just add to /api/school.
// Looking at the implementation of websiteRouter, it uses paths like /website-content.
// So app.use('/api/school', websiteRouter) will result in /api/school/website-content. Perfect.

// Public contact form submission endpoint
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // 1. Fetch system support or contact email from system_settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('key, value');

    let recipientEmail = 'support@muchi.com'; // Default fallback
    if (!settingsError && settings) {
      const mapped = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      recipientEmail = mapped.contact_email || mapped.support_email || 'support@muchi.com';
    }

    // 2. Build the contact email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #115ec3; border-bottom: 2px solid #eff6ff; padding-bottom: 12px; margin-top: 0;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 100px; vertical-align: top;">Name:</td>
            <td style="padding: 8px 0; color: #334155;">\${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 100px; vertical-align: top;">Email:</td>
            <td style="padding: 8px 0; color: #334155;"><a href="mailto:\${email}" style="color: #115ec3; text-decoration: none;">\${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 100px; vertical-align: top;">Subject:</td>
            <td style="padding: 8px 0; color: #334155; font-weight: bold;">\${subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 100px; vertical-align: top;">Message:</td>
            <td style="padding: 8px 0; color: #334155; white-space: pre-wrap; line-height: 1.6;">\${message}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
        <div style="text-align: center; color: #64748b; font-size: 11px;">
          <p style="margin: 0;">This email was sent automatically from the MUCHI Landing Page Contact Form using active SMTP settings.</p>
        </div>
      </div>
    `;

    // 3. Send email using nodemailer transporter from emailService
    const result = await sendEmail({
      to: recipientEmail,
      subject: `[Contact Form] \${subject}`,
      html: emailHtml,
      text: `Name: \${name}\nEmail: \${email}\nSubject: \${subject}\n\nMessage:\n\${message}`,
      templateKey: 'contact_form_submission'
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email.');
    }

    res.json({ success: true, message: 'Message sent successfully.' });
  } catch (err: any) {
    console.error('Contact Form Error:', err);
    res.status(500).json({ message: err.message || 'Failed to submit contact message.' });
  }
});

// Basic health check route
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Demo endpoint
app.get('/api/demo', (req, res) => {
  res.json({
    message: 'Hello from the backend!',
    status: 'success'
  });
});

// If running directly (not via Vercel), start the server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
