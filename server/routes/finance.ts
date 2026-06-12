import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { initiateMTNMoMoPayment, initiateAirtelPayment, calculateConvenienceFee } from '../lib/payments.js';

const router = Router();

// Helper to authenticate user from Bearer token
async function getUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;
  
  // Get profile
  const { data: profile } = await supabaseAdmin.from('profiles').select('id, role, school_id').eq('id', user.id).single();
  return { user, profile };
}

// GET /api/finance/fees/structures - Get fee structures for a school
router.get('/fees/structures', async (req: Request, res: Response) => {
  try {
    const auth = await getUser(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
      .from('fee_structures')
      .select('*')
      .eq('school_id', auth.profile.school_id)
      .order('grade')
      .order('term');

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/finance/fees/structures - Create a fee structure
router.post('/fees/structures', async (req: Request, res: Response) => {
  try {
    const auth = await getUser(req);
    if (!auth || auth.profile.role !== 'school_admin') return res.status(403).json({ error: 'Forbidden' });

    const { grade, term, academic_year, amount, currency = 'ZMW', description, fee_type = 'tuition', applicable_to = 'grade' } = req.body;

    const termsToApply = term === 'All Terms' ? ['Term 1', 'Term 2', 'Term 3'] : [term];
    const structures = termsToApply.map(t => ({
      school_id: auth.profile.school_id,
      grade,
      term: t,
      academic_year,
      amount,
      currency,
      description,
      fee_type,
      applicable_to
    }));

    const { data, error } = await supabaseAdmin
      .from('fee_structures')
      .insert(structures)
      .select();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/finance/invoices - List invoices (admin view)
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const auth = await getUser(req);
    if (!auth || auth.profile.role !== 'school_admin') return res.status(403).json({ error: 'Forbidden' });

    const { data, error } = await supabaseAdmin
      .from('student_invoices')
      .select(`
        *,
        fee_structures (grade, term, academic_year),
        profiles:student_id (full_name, email)
      `)
      .eq('school_id', auth.profile.school_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/finance/student/invoices - List invoices (student view)
router.get('/student/invoices', async (req: Request, res: Response) => {
  try {
    const auth = await getUser(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
      .from('student_invoices')
      .select(`
        *,
        fee_structures (grade, term, academic_year, description)
      `)
      .eq('student_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/finance/pay/initiate - Initiate Mobile Money Payment
router.post('/pay/initiate', async (req: Request, res: Response) => {
  try {
    const auth = await getUser(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    const { invoice_id, amount, provider, phone_number } = req.body;

    // 1. Validate invoice
    const { data: invoice, error: invError } = await supabaseAdmin
      .from('student_invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invError || !invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    // Check if fully paid
    if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice is already fully paid.' });

    // Calculate convenience fee to pass onto student
    const convenienceFee = calculateConvenienceFee(Number(amount), provider);
    const totalToPay = Number(amount) + convenienceFee;

    // 2. Initiate Payment via Provider
    let paymentResponse;
    if (provider.toUpperCase() === 'MTN') {
      paymentResponse = await initiateMTNMoMoPayment({
        amount: totalToPay,
        currency: invoice.currency,
        phoneNumber: phone_number,
        externalId: invoice.id
      });
    } else if (provider.toUpperCase() === 'AIRTEL') {
      paymentResponse = await initiateAirtelPayment({
        amount: totalToPay,
        currency: invoice.currency,
        phoneNumber: phone_number,
        reference: invoice.id
      });
    } else {
      return res.status(400).json({ error: 'Unsupported payment provider' });
    }

    if (!paymentResponse.success) {
      return res.status(500).json({ error: paymentResponse.error || 'Payment initiation failed' });
    }

    // 3. Record pending payment in DB
    const { data: feePayment, error: paymentError } = await supabaseAdmin
      .from('fee_payments')
      .insert({
        invoice_id: invoice.id,
        school_id: invoice.school_id,
        student_id: auth.user.id,
        amount: Number(amount),
        convenience_fee: convenienceFee,
        total_paid: totalToPay,
        currency: invoice.currency,
        payment_method: 'momo',
        provider: provider.toUpperCase(),
        provider_reference: paymentResponse.referenceId,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    res.json({
      success: true,
      message: paymentResponse.message,
      payment: feePayment
    });

  } catch (err: any) {
    console.error('Payment initiation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/finance/pay/webhook - Webhook for MTN/Airtel to call back
router.post('/pay/webhook', async (req: Request, res: Response) => {
  try {
    // In production, verify webhook signatures here
    const { referenceId, status, financialTransactionId } = req.body;

    // Update payment record
    const newStatus = status === 'SUCCESSFUL' ? 'successful' : 'failed';
    
    const { data: payment, error } = await supabaseAdmin
      .from('fee_payments')
      .update({ 
        status: newStatus, 
        receipt_number: financialTransactionId || null,
        paid_at: newStatus === 'successful' ? new Date().toISOString() : null
      })
      .eq('provider_reference', referenceId)
      .select()
      .single();

    if (error) throw error;

    // The database trigger 'trigger_update_invoice_status' will automatically
    // update the student_invoices amount_paid and status based on this successful payment.

    // If successful, also record in general school finance_records ledger
    if (newStatus === 'successful') {
      await supabaseAdmin.from('finance_records').insert({
        school_id: payment.school_id,
        category: 'School Fees',
        amount: payment.amount, // Record the base amount, not including convenience fee
        type: 'income',
        description: `Fee payment via ${payment.provider} (Ref: ${financialTransactionId})`
      });
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

export const financeRouter = router;
