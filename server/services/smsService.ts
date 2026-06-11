import { SystemSettingsRepository } from '../repositories/systemSettingsRepository.js';

export class SmsService {
  /**
   * Send SMS via Africa's Talking
   * @param to Phone number (e.g. +260XXXXXXXXX or 09XXXXXXXX)
   * @param message Text message content
   */
  static async sendSms(to: string, message: string) {
    try {
      const settings = await SystemSettingsRepository.getSystemSettings();
      const mapped = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      const username = mapped.africastalking_username?.trim();
      const apiKey = mapped.africastalking_apikey?.trim();
      const senderId = mapped.africastalking_sms_sender_id?.trim();
      const isEnabled = mapped.africastalking_sms_enabled === 'true';

      if (!isEnabled || !username || !apiKey) {
        console.warn('[SmsService] SMS not enabled or missing credentials.');
        return { success: false, error: 'SMS service not enabled or configured' };
      }

      const formattedTo = this.formatPhoneNumber(to);
      const isSandbox = username.toLowerCase() === 'sandbox';
      const baseUrl = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

      const bodyParams = new URLSearchParams();
      bodyParams.append('username', username);
      bodyParams.append('to', formattedTo);
      bodyParams.append('message', message);
      
      if (senderId && senderId.trim() !== '') {
        bodyParams.append('from', senderId);
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'apiKey': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || `HTTP Error ${response.status}` };
      }
      
      if (!response.ok) {
        console.error('[SmsService] Error sending SMS:', data);
        return { success: false, error: data };
      }

      console.log('[SmsService] SMS sent successfully:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('[SmsService] Fetch error:', error);
      return { success: false, error: error?.message || String(error) };
    }
  }

  /**
   * Helper to ensure phone number is correctly formatted for Africa's Talking
   * Africa's Talking expects numbers in international format with leading + (e.g. +260971234567)
   */
  private static formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except '+'
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with '0', replace with '+260' (assuming Zambian number)
    if (cleaned.startsWith('0')) {
      cleaned = '+260' + cleaned.substring(1);
    }

    // Ensure it starts with '+'
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }
}
