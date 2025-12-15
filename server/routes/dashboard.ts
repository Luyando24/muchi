import { RequestHandler } from 'express';
import { query } from '../lib/db.js';

export interface DashboardStats {
  totalSchools: number;
  activeSubscriptions: number;
  totalUsers: number;
  monthlyGrowth: {
    schools: number;
    subscriptions: number;
    users: number;
  };
}

export interface SchoolWithSubscription {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  subscriptionType: 'basic' | 'standard' | 'premium';
  userCount: number;
  createdAt: string;
  phone?: string;
  address?: string;
  district?: string;
  province?: string;
}

export interface SubscriptionData {
  id: string;
  schoolName: string;
  plan: 'basic' | 'standard' | 'premium';
  status: 'active' | 'trial' | 'expired';
  startDate: string;
  endDate: string;
  userCount: number;
  monthlyRevenue: number;
}

export const handleGetDashboardStats: RequestHandler = async (req, res) => {
  try {
    // Get total schools count
    const schoolsResult = await query('SELECT COUNT(*) as count FROM schools');
    const totalSchools = parseInt(schoolsResult.rows[0].count);

    // Get total users count from staff_users table
    const usersResult = await query('SELECT COUNT(*) as count FROM staff_users WHERE is_active = true');
    const totalUsers = parseInt(usersResult.rows[0].count) || 0;

    // For now, we'll calculate active subscriptions as total schools (all schools are considered active)
    // In a real implementation, you'd have a separate subscriptions table
    const activeSubscriptions = totalSchools;

    // Calculate monthly growth (schools created in the last month vs previous month)
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 2, 1);

    const currentMonthSchools = await query(
      'SELECT COUNT(*) as count FROM schools WHERE created_at >= $1',
      [lastMonth.toISOString()]
    );
    
    const previousMonthSchools = await query(
      'SELECT COUNT(*) as count FROM schools WHERE created_at >= $1 AND created_at < $2',
      [twoMonthsAgo.toISOString(), lastMonth.toISOString()]
    );

    const currentMonthCount = parseInt(currentMonthSchools.rows[0].count);
    const previousMonthCount = parseInt(previousMonthSchools.rows[0].count);
    const schoolsGrowth = previousMonthCount > 0 ? currentMonthCount - previousMonthCount : currentMonthCount;

    const stats: DashboardStats = {
      totalSchools,
      activeSubscriptions,
      totalUsers,
      monthlyGrowth: {
        schools: schoolsGrowth,
        subscriptions: schoolsGrowth, // Assuming 1:1 relationship for now
        users: schoolsGrowth * 15 // Estimate based on average users per school
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

export const handleGetSchoolsWithSubscriptions: RequestHandler = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        s.id,
        s.name,
        s.code,
        s.address,
        s.district,
        s.province,
        s.phone,
        s.created_at,
        s.updated_at,
        COUNT(su.id) as user_count
      FROM schools s
      LEFT JOIN staff_users su ON s.id = su.school_id AND su.is_active = true
      GROUP BY s.id, s.name, s.code, s.address, s.district, s.province, s.phone, s.created_at, s.updated_at
      ORDER BY s.created_at DESC
    `);

    const schools: SchoolWithSubscription[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: '', // Email not stored in schools table, would need to get from admin user
      subscriptionStatus: 'active' as const,
      subscriptionType: 'basic' as const,
      userCount: parseInt(row.user_count) || 0,
      createdAt: row.created_at,
      phone: row.phone || '',
      address: row.address || '',
      district: row.district || '',
      province: row.province || ''
    }));

    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools with subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch schools data' });
  }
};

export const handleGetSubscriptions: RequestHandler = async (req, res) => {
  try {
    // For now, we'll generate subscription data based on schools
    // In a real implementation, you'd have a separate subscriptions table
    const result = await query(`
      SELECT 
        s.id,
        s.name,
        s.created_at,
        COUNT(su.id) as user_count
      FROM schools s
      LEFT JOIN staff_users su ON s.id = su.school_id AND su.is_active = true
      GROUP BY s.id, s.name, s.created_at
      ORDER BY s.created_at DESC
    `);

    const subscriptions: SubscriptionData[] = result.rows.map(row => ({
      id: row.id,
      schoolName: row.name,
      plan: 'basic' as const,
      status: 'active' as const,
      startDate: row.created_at,
      endDate: new Date(new Date(row.created_at).getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year from start
      userCount: parseInt(row.user_count) || 0,
      monthlyRevenue: 99 // Fixed monthly revenue for basic plan
    }));

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions data' });
  }
};