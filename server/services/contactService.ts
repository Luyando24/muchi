import { SystemSettingsRepository } from '../repositories/systemSettingsRepository.js';
import { sendEmail } from './emailService.js';

export class ContactService {
  static async handleContactForm(
    name: string,
    email: string,
    subject: string,
    message: string
  ): Promise<{ success: boolean; message: string }> {
    // 1. Fetch system support or contact email from system_settings
    const settings = await SystemSettingsRepository.getSystemSettings();

    let recipientEmail = 'support@muchi.com'; // Default fallback
    if (settings && settings.length > 0) {
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
            <td style="padding: 8px 0; color: #334155;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 100px; vertical-align: top;">Email:</td>
            <td style="padding: 8px 0; color: #334155;"><a href="mailto:${email}" style="color: #115ec3; text-decoration: none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 100px; vertical-align: top;">Subject:</td>
            <td style="padding: 8px 0; color: #334155; font-weight: bold;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 100px; vertical-align: top;">Message:</td>
            <td style="padding: 8px 0; color: #334155; white-space: pre-wrap; line-height: 1.6;">${message}</td>
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
      subject: `[Contact Form] ${subject}`,
      html: emailHtml,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      templateKey: 'contact_form_submission'
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email.');
    }

    return { success: true, message: 'Message sent successfully.' };
  }
}
