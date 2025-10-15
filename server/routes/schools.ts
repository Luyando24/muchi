import { RequestHandler } from 'express';
import { query, hashPassword } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

// Get all schools
export const handleListSchools: RequestHandler = async (req, res) => {
  try {
    // Get schools with subscription information
    const schoolsResult = await query(`
      SELECT 
        s.id, 
        s.name, 
        s.code, 
        s.email,
        s.address, 
        s.district, 
        s.province, 
        s.phone,
        s.website,
        s.school_type,
        s.status,
        s.principal_name,
        s.principal_email,
        s.principal_phone,
        s.created_at,
        s.updated_at,
        sub.status as subscription_status,
        sp.name as subscription_plan,
        sub.billing_cycle,
        sub.users_count,
        sub.start_date as subscription_start_date,
        sub.end_date as subscription_end_date,
        sub.next_billing_date
      FROM schools s
      LEFT JOIN subscriptions sub ON s.id = sub.school_id AND sub.status IN ('active', 'trial')
      LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
      ORDER BY s.created_at DESC
    `);
    
    // Get user counts for each school
    const userCountsResult = await query(`
      SELECT 
        school_id, 
        COUNT(DISTINCT id) as user_count
      FROM staff_users
      WHERE school_id IS NOT NULL
      GROUP BY school_id
    `);
    
    // Get student counts for each school
    const studentCountsResult = await query(`
      SELECT 
        COUNT(*) as student_count
      FROM students
    `);
    
    // Create a map for quick lookup
    const userCountMap = {};
    userCountsResult.rows.forEach(row => {
      userCountMap[row.school_id] = parseInt(row.user_count);
    });
    
    // Get total student count (since students table doesn't have school_id)
    const totalStudentCount = studentCountsResult.rows[0] ? parseInt(studentCountsResult.rows[0].student_count) : 0;
    
    // Combine the data
    const schools = schoolsResult.rows.map(school => ({
      id: school.id,
      name: school.name,
      code: school.code,
      email: school.email || '',
      phone: school.phone || '',
      address: school.address || '',
      district: school.district || '',
      province: school.province || '',
      website: school.website || '',
      schoolType: school.school_type || 'primary',
      status: school.status || 'active',
      subscriptionPlan: school.subscription_plan ? school.subscription_plan.toLowerCase() : 'none',
      subscriptionStatus: school.subscription_status || 'none',
      billingCycle: school.billing_cycle || null,
      subscriptionStartDate: school.subscription_start_date || null,
      subscriptionEndDate: school.subscription_end_date || null,
      nextBillingDate: school.next_billing_date || null,
      userCount: userCountMap[school.id] || 0,
      studentCount: Math.floor(totalStudentCount / schoolsResult.rows.length) || 0, // Distribute students evenly for demo
      teacherCount: 0, // Add teacher count if you have a way to identify teachers
      principalName: school.principal_name || '',
      principalEmail: school.principal_email || '',
      principalPhone: school.principal_phone || '',
      createdAt: school.created_at,
      lastActivity: school.updated_at,
    }));

    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};

// Create a new school
export const handleCreateSchool: RequestHandler = async (req, res) => {
  try {
    const { 
      name, 
      code, 
      email,
      address, 
      district, 
      province, 
      phone,
      website,
      schoolType,
      password,
      principalName,
      principalEmail,
      principalPhone
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'School name is required' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'School email and password are required' });
    }

    // Check if email already exists
    const existingUserResult = await query(
      'SELECT id FROM staff_users WHERE email = $1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const schoolId = uuidv4();
    
    // Create school
    await query(`
      INSERT INTO schools (id, name, code, email, address, district, province, phone, website, school_type, status, principal_name, principal_email, principal_phone, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    `, [schoolId, name, code || name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000), 
        email || '', address || '', district || '', province || '', phone || '', website || '', 
        schoolType || 'primary', 'active', principalName || '', principalEmail || '', principalPhone || '']);

    // Create school admin user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await query(
      `INSERT INTO staff_users (id, school_id, email, password_hash, role, first_name, last_name, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, schoolId, email, passwordHash, "admin", principalName || "School", "Administrator", principalPhone || "", true]
    );

    res.status(201).json({ 
      id: schoolId,
      name,
      code: code || name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000),
      email: email || '',
      address: address || '',
      district: district || '',
      province: province || '',
      phone: phone || '',
      website: website || '',
      schoolType: schoolType || 'primary',
      status: 'active',
      subscriptionPlan: 'basic',
      userCount: 1, // The admin user we just created
      studentCount: 0,
      teacherCount: 0,
      principalName: principalName || '',
      principalEmail: principalEmail || '',
      principalPhone: principalPhone || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
};

// Get a single school by ID
export const handleGetSchool: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'School ID is required' });
    }

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
        s.updated_at
      FROM schools s
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    const school = result.rows[0];
    res.json({
      id: school.id,
      name: school.name,
      code: school.code,
      email: '', // Add email column to schools table if needed
      phone: school.phone || '',
      address: school.address || '',
      district: school.district || '',
      province: school.province || '',
      schoolType: 'primary', // Default value, update if you have this in your schema
      status: 'active', // Default value, update if you have this in your schema
      subscriptionPlan: 'basic',
      userCount: 0,
      studentCount: 0,
      teacherCount: 0,
      createdAt: school.created_at,
      lastActivity: school.updated_at,
    });
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
};

// Update a school
export const handleUpdateSchool: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      code, 
      address, 
      district, 
      province, 
      phone 
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'School ID is required' });
    }

    await query(`
      UPDATE schools
      SET name = $1, code = $2, address = $3, district = $4, province = $5, phone = $6, updated_at = NOW()
      WHERE id = $7
    `, [name, code, address || '', district || '', province || '', phone || '', id]);

    res.json({ 
      id,
      name,
      code,
      address: address || '',
      district: district || '',
      province: province || '',
      phone: phone || '',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating school:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
};

// Delete a school
export const handleDeleteSchool: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'School ID is required' });
    }

    await query(`DELETE FROM schools WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
};