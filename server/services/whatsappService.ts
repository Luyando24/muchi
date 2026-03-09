import dotenv from 'dotenv';
dotenv.config();

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERSION = process.env.WHATSAPP_VERSION || 'v21.0';

/**
 * Service to handle WhatsApp notifications via Meta WhatsApp Cloud API
 */
export class WhatsAppService {
    private static baseUrl = `https://graph.facebook.com/${WHATSAPP_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    /**
     * Send a template message to a parent/guardian
     * @param to Phone number in international format (e.g. 260XXXXXXXXX)
     * @param studentName Name of the student
     * @param subjectName Name of the subject
     */
    static async sendResultPublishedNotification(to: string, studentName: string, subjectName: string) {
        if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
            console.warn('[WhatsAppService] Missing API credentials. Logging message instead:');
            console.log(`To: ${to}, Message: Results for ${studentName} in ${subjectName} are published.`);
            return { success: false, message: 'Credentials missing' };
        }

        // Prepare payload for Meta WhatsApp Cloud API
        // Note: This assumes a template named 'result_published' exists in the Meta account.
        // If you don't have a template, we can send a text message if the 24h window is open, 
        // but for initial notification, templates are required.
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.formatPhoneNumber(to),
            type: "template",
            template: {
                name: "result_published",
                language: {
                    code: "en_US"
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: studentName },
                            { type: "text", text: subjectName }
                        ]
                    }
                ]
            }
        };

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[WhatsAppService] Error sending message:', data);
                return { success: false, error: data };
            }

            console.log('[WhatsAppService] Message sent successfully:', data);
            return { success: true, data };
        } catch (error) {
            console.error('[WhatsAppService] Fetch error:', error);
            return { success: false, error };
        }
    }

    /**
     * Helper to ensure phone number is correctly formatted for Meta
     * Meta expects numbers without '+' and with country code.
     */
    private static formatPhoneNumber(phone: string): string {
        // Remove any non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // If it starts with '0', it might be a local Zambian number (09...)
        // We should probably ensure it has the 260 prefix if it's 10 digits starting with 0
        if (cleaned.length === 10 && cleaned.startsWith('0')) {
            cleaned = '260' + cleaned.substring(1);
        }

        return cleaned;
    }
}
