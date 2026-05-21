import crypto from 'crypto';

/**
 * Mobile Money Provider Integration Helpers
 * 
 * In a real-world scenario, you would need:
 * 1. MTN/Airtel Developer Accounts
 * 2. Subscription Keys & Target Environments
 * 3. A webhook listener that they can call back to
 */

// Mobile Money Configuration
const MOMO_API_URL = process.env.MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com';
const MOMO_SUB_KEY = process.env.MOMO_SUB_KEY || '';
const MOMO_USER_ID = process.env.MOMO_USER_ID || '';
const MOMO_API_SECRET = process.env.MOMO_API_SECRET || '';

/**
 * Simulates generating an MTN MoMo Request to Pay
 * Usually, you'd generate a token first, then hit /collection/v1_0/requesttopay
 */
export async function initiateMTNMoMoPayment({
  amount,
  currency,
  phoneNumber,
  externalId,
  payerMessage = 'School Fees Payment',
  payeeNote = 'School Fees'
}: {
  amount: number;
  currency: string;
  phoneNumber: string;
  externalId: string;
  payerMessage?: string;
  payeeNote?: string;
}) {
  const referenceId = crypto.randomUUID(); // X-Reference-Id

  // --- MOCK IMPLEMENTATION FOR DEVELOPMENT ---
  if (!MOMO_SUB_KEY) {
    console.log(`[MTN MOCK] Initiating payment of ${amount} ${currency} for ${phoneNumber}`);
    // Simulate a pending response
    return {
      success: true,
      referenceId,
      provider: 'MTN',
      status: 'pending',
      message: 'Payment request sent to phone.'
    };
  }

  // --- REAL IMPLEMENTATION (Skeleton) ---
  try {
    // 1. Get Token (Basic Auth using UserID:APISecret)
    const tokenStr = Buffer.from(`${MOMO_USER_ID}:${MOMO_API_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${MOMO_API_URL}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${tokenStr}`,
        'Ocp-Apim-Subscription-Key': MOMO_SUB_KEY
      }
    });
    
    if (!tokenRes.ok) throw new Error('Failed to get MoMo token');
    const { access_token } = await tokenRes.json();

    // 2. Request To Pay
    const paymentRes = await fetch(`${MOMO_API_URL}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox', // or mtnghana, etc.
        'Ocp-Apim-Subscription-Key': MOMO_SUB_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency,
        externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber
        },
        payerMessage,
        payeeNote
      })
    });

    if (paymentRes.status !== 202) {
      throw new Error('Failed to initiate request to pay');
    }

    return {
      success: true,
      referenceId,
      provider: 'MTN',
      status: 'pending',
      message: 'Payment request sent to phone.'
    };
  } catch (error: any) {
    console.error('[MTN MoMo Error]', error);
    return {
      success: false,
      error: error.message || 'Payment initiation failed'
    };
  }
}

/**
 * Simulates generating an Airtel Money payment
 */
export async function initiateAirtelPayment({
  amount,
  currency,
  phoneNumber,
  reference
}: {
  amount: number;
  currency: string;
  phoneNumber: string;
  reference: string;
}) {
  const transactionId = crypto.randomUUID();

  // MOCK IMPLEMENTATION
  console.log(`[Airtel MOCK] Initiating payment of ${amount} ${currency} for ${phoneNumber}`);
  return {
    success: true,
    referenceId: transactionId,
    provider: 'Airtel',
    status: 'pending',
    message: 'Payment request sent to phone.'
  };
}

/**
 * Calculates convenience fee based on amount and provider
 * Usually ~1.5% to 3% for MoMo
 */
export function calculateConvenienceFee(amount: number, provider: string) {
  const rate = provider.toLowerCase() === 'airtel' ? 0.02 : 0.015; // e.g. Airtel 2%, MTN 1.5%
  return Number((amount * rate).toFixed(2));
}
