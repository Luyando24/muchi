import { useState, useEffect } from 'react';

// Interfaces matching the backend
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

// API base URL
const API_BASE = '/api';

// Custom hook for subscriptions
export const useSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/subscriptions`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      const data = await response.json();
      setSubscriptions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (subscriptionData: {
    schoolId: string;
    planId: string;
    billingCycle?: string;
    usersCount?: number;
    startDate?: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }
      
      await fetchSubscriptions(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create subscription');
    }
  };

  const updateSubscription = async (id: string, updates: {
    planId?: string;
    billingCycle?: string;
    status?: string;
    endDate?: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE}/subscriptions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }
      
      await fetchSubscriptions(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update subscription');
    }
  };

  const cancelSubscription = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/subscriptions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      await fetchSubscriptions(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return {
    subscriptions,
    loading,
    error,
    refetch: fetchSubscriptions,
    createSubscription,
    updateSubscription,
    cancelSubscription,
  };
};

// Custom hook for plans
export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/plans`);
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      const data = await response.json();
      setPlans(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
  };
};

// Custom hook for payment methods
export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/payment-methods`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      const data = await response.json();
      setPaymentMethods(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (paymentMethodData: {
    schoolId: string;
    type: 'card' | 'bank';
    provider: string;
    last4: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
  }) => {
    try {
      const response = await fetch(`${API_BASE}/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentMethodData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add payment method');
      }
      
      await fetchPaymentMethods(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add payment method');
    }
  };

  const setDefaultPaymentMethod = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/payment-methods/${id}/default`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }
      
      await fetchPaymentMethods(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to set default payment method');
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/payment-methods/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }
      
      await fetchPaymentMethods(); // Refresh the list
      return await response.json();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete payment method');
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  return {
    paymentMethods,
    loading,
    error,
    refetch: fetchPaymentMethods,
    addPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
  };
};

// Custom hook for billing history
export const useBillingHistory = () => {
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/billing-history`);
      if (!response.ok) {
        throw new Error('Failed to fetch billing history');
      }
      const data = await response.json();
      setBillingHistory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  return {
    billingHistory,
    loading,
    error,
    refetch: fetchBillingHistory,
  };
};