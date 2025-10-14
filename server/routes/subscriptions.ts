import { RequestHandler } from 'express';
import { query } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

// Interfaces matching the frontend
export interface Subscription {
  id: string;
  schoolName: string;
  planType: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'trial' | 'expired';
  users: number;
  revenue: number;
  nextBillingDate: string;
  startDate: string;
  endDate: string;
  features: string[];
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  maxUsers: number;
  popular?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  schoolName: string;
}

export interface BillingRecord {
  id: string;
  schoolName: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'failed';
  invoiceNumber: string;
  planType: string;
}

// Get all subscriptions
export const handleGetSubscriptions: RequestHandler = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        s.id,
        sch.name as school_name,
        sp.name as plan_name,
        s.status,
        s.users_count,
        CASE 
          WHEN s.billing_cycle = 'monthly' THEN sp.price
          ELSE sp.yearly_price
        END as revenue,
        s.next_billing_date,
        s.start_date,
        s.end_date,
        sp.features
      FROM subscriptions s
      JOIN schools sch ON s.school_id = sch.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      ORDER BY s.created_at DESC
    `);

    const subscriptions: Subscription[] = result.rows.map(row => ({
      id: row.id,
      schoolName: row.school_name,
      planType: row.plan_name.toLowerCase() as 'basic' | 'premium' | 'enterprise',
      status: row.status,
      users: row.users_count,
      revenue: parseFloat(row.revenue),
      nextBillingDate: row.next_billing_date,
      startDate: row.start_date,
      endDate: row.end_date,
      features: row.features || []
    }));

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};

// Get all subscription plans
export const handleGetPlans: RequestHandler = async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, price, yearly_price, features, max_users, is_popular
      FROM subscription_plans
      WHERE is_active = true
      ORDER BY price ASC
    `);

    const plans: Plan[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      yearlyPrice: parseFloat(row.yearly_price),
      features: row.features || [],
      maxUsers: row.max_users,
      popular: row.is_popular
    }));

    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// Get payment methods
export const handleGetPaymentMethods: RequestHandler = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        pm.id,
        pm.type,
        pm.last4,
        pm.provider as brand,
        pm.expiry_month,
        pm.expiry_year,
        pm.is_default,
        s.name as school_name
      FROM payment_methods pm
      JOIN schools s ON pm.school_id = s.id
      WHERE pm.is_active = true
      ORDER BY pm.is_default DESC, pm.created_at DESC
    `);

    const paymentMethods: PaymentMethod[] = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      last4: row.last4,
      brand: row.brand || 'Unknown',
      expiryMonth: row.expiry_month || 12,
      expiryYear: row.expiry_year || 2025,
      isDefault: row.is_default,
      schoolName: row.school_name
    }));

    res.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
};

// Get billing history
export const handleGetBillingHistory: RequestHandler = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        br.id,
        s.name as school_name,
        br.amount,
        br.billing_date as date,
        br.status,
        br.invoice_number,
        br.plan_type
      FROM billing_records br
      JOIN schools s ON br.school_id = s.id
      ORDER BY br.billing_date DESC
      LIMIT 100
    `);

    const billingHistory: BillingRecord[] = result.rows.map(row => ({
      id: row.id,
      schoolName: row.school_name,
      amount: parseFloat(row.amount),
      date: row.date,
      status: row.status,
      invoiceNumber: row.invoice_number,
      planType: row.plan_type
    }));

    res.json(billingHistory);
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
};

// Create new subscription
export const handleCreateSubscription: RequestHandler = async (req, res) => {
  try {
    const { schoolId, planId, billingCycle, usersCount, startDate } = req.body;

    if (!schoolId || !planId) {
      return res.status(400).json({ error: 'School ID and Plan ID are required' });
    }

    // Calculate end date (1 year from start date)
    const start = new Date(startDate || new Date());
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);

    // Calculate next billing date
    const nextBilling = new Date(start);
    if (billingCycle === 'yearly') {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    } else {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }

    const subscriptionId = uuidv4();

    await query(`
      INSERT INTO subscriptions (
        id, school_id, plan_id, status, billing_cycle, users_count,
        start_date, end_date, next_billing_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      subscriptionId,
      schoolId,
      planId,
      'active',
      billingCycle || 'monthly',
      usersCount || 1,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      nextBilling.toISOString().split('T')[0]
    ]);

    res.json({ id: subscriptionId, message: 'Subscription created successfully' });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

// Update subscription (upgrade/downgrade)
export const handleUpdateSubscription: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, billingCycle, status, endDate } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (planId) {
      updates.push(`plan_id = $${paramCount++}`);
      values.push(planId);
    }

    if (billingCycle) {
      updates.push(`billing_cycle = $${paramCount++}`);
      values.push(billingCycle);
    }

    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (endDate) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(endDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await query(`
      UPDATE subscriptions 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    res.json({ message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

// Cancel subscription
export const handleCancelSubscription: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await query(`
      UPDATE subscriptions 
      SET status = 'cancelled', updated_at = $1
      WHERE id = $2
    `, [new Date().toISOString(), id]);

    // Log the change
    await query(`
      INSERT INTO subscription_changes (
        subscription_id, change_type, new_status, effective_date
      ) VALUES ($1, $2, $3, $4)
    `, [id, 'cancelled', 'cancelled', new Date().toISOString().split('T')[0]]);

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// Add payment method
export const handleAddPaymentMethod: RequestHandler = async (req, res) => {
  try {
    const { schoolId, type, provider, last4, expiryMonth, expiryYear, isDefault } = req.body;

    if (!schoolId || !type || !last4) {
      return res.status(400).json({ error: 'School ID, type, and last4 are required' });
    }

    // If this is set as default, unset other default methods for this school
    if (isDefault) {
      await query(`
        UPDATE payment_methods 
        SET is_default = false 
        WHERE school_id = $1
      `, [schoolId]);
    }

    const paymentMethodId = uuidv4();

    await query(`
      INSERT INTO payment_methods (
        id, school_id, type, provider, last4, expiry_month, expiry_year, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      paymentMethodId,
      schoolId,
      type,
      provider,
      last4,
      expiryMonth,
      expiryYear,
      isDefault || false
    ]);

    res.json({ id: paymentMethodId, message: 'Payment method added successfully' });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
};

// Set default payment method
export const handleSetDefaultPaymentMethod: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the school_id for this payment method
    const result = await query('SELECT school_id FROM payment_methods WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const schoolId = result.rows[0].school_id;

    // Unset all default methods for this school
    await query(`
      UPDATE payment_methods 
      SET is_default = false 
      WHERE school_id = $1
    `, [schoolId]);

    // Set this method as default
    await query(`
      UPDATE payment_methods 
      SET is_default = true 
      WHERE id = $1
    `, [id]);

    res.json({ message: 'Default payment method updated successfully' });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
};

// Delete payment method
export const handleDeletePaymentMethod: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    await query(`
      UPDATE payment_methods 
      SET is_active = false 
      WHERE id = $1
    `, [id]);

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
};