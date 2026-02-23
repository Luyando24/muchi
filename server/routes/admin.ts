import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import * as os from 'os';
import * as crypto from 'crypto';

const router = Router();

// Middleware to verify System Admin
const requireSystemAdmin = async (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.error('requireSystemAdmin: No token provided');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  console.log('requireSystemAdmin: Validating token:', token.substring(0, 10) + '...');
  console.log('requireSystemAdmin: Token length:', token.length);

  // Get user from token
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error) {
    console.error('requireSystemAdmin: getUser error:', error);
    console.error('requireSystemAdmin: getUser error details:', JSON.stringify(error, null, 2));
  }

  if (error || !user) {
    console.error('requireSystemAdmin: Invalid token or user not found', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }

  // Check role in profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'system_admin') {
    console.error('requireSystemAdmin: Forbidden. User:', user.id, 'Role:', profile?.role, 'Error:', profileError);
    return res.status(403).json({ message: 'Forbidden: Requires System Admin privileges' });
  }

  // Attach user to request for downstream use
  (req as any).user = user;
  next();
};

// POST /api/admin/create-school
// Creates a new School and a School Admin user
router.post('/create-school', requireSystemAdmin, async (req: Request, res: Response) => {
  const { schoolName, schoolSlug, adminEmail, adminPassword, adminName, plan } = req.body;

  if (!schoolName || !schoolSlug || !adminEmail || !adminPassword) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Create School
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: schoolName,
        slug: schoolSlug,
        plan: plan || 'Standard'
      })
      .select()
      .single();

    if (schoolError) throw schoolError;

    // 2. Create School Admin User
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: 'school_admin',
        school_id: school.id
      }
    });

    if (userError) {
      // Rollback school creation if user creation fails (basic rollback)
      await supabaseAdmin.from('schools').delete().eq('id', school.id);
      throw userError;
    }

    res.status(201).json({
      message: 'School and Admin created successfully',
      school,
      admin: {
        id: user.user.id,
        email: user.user.email
      }
    });

  } catch (error: any) {
    console.error('Create School Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// GET /api/admin/users
// List all users with profiles and emails
router.get('/users', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    // Fetch all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, schools(name)')
      .order('created_at', { ascending: false });

    if (profileError) throw profileError;

    // Fetch all users (for email)
    // Note: For large user bases, this should be paginated or optimized
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) throw authError;

    const users = authData.users || [];

    // Map profiles to include email
    const usersWithEmail = profiles.map(profile => {
      const authUser = users.find((u: any) => u.id === profile.id);
      return {
        ...profile,
        email: authUser?.email || 'Unknown'
      };
    });

    res.json(usersWithEmail);
  } catch (error: any) {
    console.error('Fetch Users Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/users
// Create a new user (System Admin or School Admin)
router.post('/users', requireSystemAdmin, async (req: Request, res: Response) => {
  const { email, password, full_name, role, school_id } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        school_id: school_id === 'none' ? null : school_id
      }
    });

    if (error) throw error;

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error: any) {
    console.error('Create User Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// PUT /api/admin/users/:id
// Update a user (System Admin or School Admin)
router.put('/users/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { email, password, full_name, role, school_id } = req.body;

  try {
    const updateData: any = {
      email,
      user_metadata: {
        full_name,
        role,
        school_id: school_id === 'none' ? null : school_id
      }
    };

    if (password && password.length > 0) {
      updateData.password = password;
    }

    // 1. Update Auth User
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);

    if (authError) throw authError;

    // 2. Update Public Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        role,
        school_id: school_id === 'none' ? null : school_id,
        // email is often stored in profiles too for easier querying, update if it exists in schema
        // The schema might or might not have email. Based on UserManagement.tsx interfaces, it seems we expect it.
        // Let's check if we can update it. If not, it will ignore or error.
        // Inspecting earlier schema.sql, profiles has (id, full_name, role, school_id). Email is in auth.users.
        // However, in UserManagement.tsx, we merge them.
        // Let's safe update only known fields.
      })
      .eq('id', id);

    if (profileError) throw profileError;

    res.json({ message: 'User updated successfully', user });
  } catch (error: any) {
    console.error('Update User Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/admin/users/:id
// Delete a user
router.delete('/users/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// GET /api/admin/infrastructure
// Get infrastructure metrics
router.get('/infrastructure', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    // 1. System Metrics
    // Note: In Vercel serverless, these values are for the transient container.
    // They are not persistent server stats, but better than static mock.
    const cpus = os.cpus();
    const loadAvg = os.loadavg(); // [1, 5, 15] min
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    // Calculate CPU usage (rough estimate based on load avg / core count)
    // or just use load avg directly. Vercel/AWS Lambda behavior varies.
    // Let's use a simple mock calculation based on load avg if available, else random for demo feel
    // since loadavg on Windows/some environments returns [0,0,0]
    let cpuPercent = 0;
    if (loadAvg[0] > 0) {
      cpuPercent = Math.min(Math.round((loadAvg[0] / cpus.length) * 100), 100);
    } else {
      // Fallback for environments where loadavg is not supported or 0
      cpuPercent = Math.floor(Math.random() * 30) + 10; // 10-40%
    }

    const memPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    
    // Mock Disk/Network since we can't easily get them without libs
    const diskPercent = 68; // Mock
    const networkRate = `${Math.floor(Math.random() * 500) + 100} MB/s`;

    // 2. Nodes (Mock for now, as we only have one "server")
    const nodes = [
      {
        name: 'primary-worker-01',
        region: process.env.VERCEL_REGION || 'local',
        cpu: cpuPercent,
        memory: memPercent,
        disk: diskPercent,
        status: 'Operational'
      },
      {
        name: 'db-replica-01',
        region: 'us-east-1',
        cpu: Math.floor(Math.random() * 20) + 10,
        memory: Math.floor(Math.random() * 40) + 20,
        disk: 45,
        status: 'Operational'
      }
    ];

    res.json({
      metrics: {
        cpu: cpuPercent,
        memory: memPercent,
        disk: diskPercent,
        network: networkRate
      },
      nodes
    });
  } catch (error: any) {
    console.error('Infrastructure Metrics Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// In-memory state for services and alerts
let services = [
  { name: "Primary Database", status: "Operational", load: 45, latency: "12ms" },
  { name: "API Gateway", status: "Operational", load: 32, latency: "8ms" },
  { name: "Auth Service", status: "Operational", load: 28, latency: "15ms" },
  { name: "Storage Cluster", status: "Maintenance", load: 0, latency: "-" }
];

let alerts = [
  { id: '1', type: "Warning", message: "High memory usage on Node-04", time: "5 mins ago", source: "Infrastructure" },
  { id: '2', type: "Info", message: "Scheduled backup completed successfully", time: "1 hour ago", source: "Backup Service" },
  { id: '3', type: "Error", message: "Failed login attempts detected", time: "2 hours ago", source: "Security" },
  { id: '4', type: "Info", message: "New school tenant provisioned", time: "4 hours ago", source: "Provisioning" }
];

// GET /api/admin/dashboard
// Get aggregated dashboard stats
router.get('/dashboard', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    // 1. Database Counts
    const { count: schoolsCount, error: schoolsError } = await supabaseAdmin
      .from('schools')
      .select('*', { count: 'exact', head: true });

    if (schoolsError) throw schoolsError;

    const { count: usersCount, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // 2. System Metrics
    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const uptimeString = days > 0 ? `${days}d ${hours}h` : `${hours}h ${(uptimeSeconds % 3600 / 60).toFixed(0)}m`;
    
    const loadAvg = os.loadavg();
    const cpus = os.cpus();
    let systemLoad = 0;
    if (loadAvg[0] > 0) {
      systemLoad = Math.min(Math.round((loadAvg[0] / cpus.length) * 100), 100);
    } else {
      systemLoad = Math.floor(Math.random() * 30) + 10; // Fallback mock
    }

    res.json({
      stats: {
        totalSchools: schoolsCount || 0,
        activeUsers: usersCount || 0,
        serverUptime: uptimeString,
        systemLoad: systemLoad
      },
      services,
      alerts
    });
  } catch (error: any) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/services/:name/restart
router.post('/services/:name/restart', requireSystemAdmin, (req: Request, res: Response) => {
  const { name } = req.params;
  const service = services.find(s => s.name === name);
  
  if (!service) {
    return res.status(404).json({ message: 'Service not found' });
  }

  // Simulate restart
  service.status = 'Maintenance';
  service.load = 0;
  
  setTimeout(() => {
    service.status = 'Operational';
    service.load = Math.floor(Math.random() * 40) + 10;
  }, 5000); // Back online in 5s

  res.json({ message: `Service ${name} restart initiated`, service });
});

// DELETE /api/admin/alerts/:id
router.delete('/alerts/:id', requireSystemAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = alerts.length;
  alerts = alerts.filter(a => a.id !== id);
  
  if (alerts.length === initialLength) {
    return res.status(404).json({ message: 'Alert not found' });
  }

  res.json({ message: 'Alert dismissed' });
});

// --- NOTIFICATIONS ENDPOINTS ---

// GET /api/admin/notifications
router.get('/notifications', requireSystemAdmin, async (req: Request, res: Response) => {
  const user = (req as any).user;

  try {
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(notifications);
  } catch (error: any) {
    console.error('Get Admin Notifications Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/notifications/:id/read
router.put('/notifications/:id/read', requireSystemAdmin, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark Admin Notification Read Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// --- SEARCH ENDPOINT ---

// GET /api/admin/search
router.get('/search', requireSystemAdmin, async (req: Request, res: Response) => {
  const query = req.query.q as string;

  if (!query || query.length < 2) {
    return res.json({ schools: [], users: [] });
  }

  try {
    // Search Schools
    const { data: schools } = await supabaseAdmin
      .from('schools')
      .select('id, name, plan, status')
      .ilike('name', `%${query}%`)
      .limit(5);

    // Search Users
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    // We might want to fetch email for users from auth.users but it's slow for search.
    // Relying on profile data for now.

    res.json({
      schools: schools || [],
      users: profiles || []
    });
  } catch (error: any) {
    console.error('Admin Search Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/licenses
// Generate a software license for a school
router.post('/licenses', requireSystemAdmin, async (req: Request, res: Response) => {
  const { schoolId, plan, durationYears } = req.body;

  if (!schoolId || !durationYears) {
    return res.status(400).json({ message: 'Missing required fields: schoolId, durationYears' });
  }

  if (durationYears < 1) {
    return res.status(400).json({ message: 'Minimum subscription duration is 1 year' });
  }

  try {
    // Check if school exists
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ message: 'School not found' });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + durationYears);

    // Generate license key (simple UUID for now, could be more complex)
    const licenseKey = crypto.randomUUID();

    // Insert license
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('school_licenses')
      .insert({
        school_id: schoolId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        license_key: licenseKey,
        plan: plan || 'Standard'
      })
      .select()
      .single();

    if (licenseError) throw licenseError;

    res.status(201).json({
      message: 'License generated successfully',
      license
    });

  } catch (error: any) {
    console.error('Generate License Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/licenses
// List all licenses
router.get('/licenses', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data: licenses, error } = await supabaseAdmin
      .from('school_licenses')
      .select('*, schools(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(licenses);
  } catch (error: any) {
    console.error('List Licenses Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/licenses/:schoolId
// Get license history for a specific school
router.get('/licenses/:schoolId', requireSystemAdmin, async (req: Request, res: Response) => {
  const { schoolId } = req.params;
  try {
    const { data: licenses, error } = await supabaseAdmin
      .from('school_licenses')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(licenses);
  } catch (error: any) {
    console.error('Get School Licenses Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/licenses/:id
// Update license status or details
router.put('/licenses/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, end_date } = req.body;

  try {
    const updates: any = {};
    if (status) updates.status = status;
    if (end_date) updates.end_date = end_date;

    const { data: license, error } = await supabaseAdmin
      .from('school_licenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'License updated successfully', license });
  } catch (error: any) {
    console.error('Update License Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/settings
// Get system settings
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('system_settings')
      .select('*');

    if (error) throw error;

    // Convert array to object
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    res.json(settingsMap);
  } catch (error: any) {
    console.error('Get System Settings Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/settings
// Update system settings (requires system admin)
router.put('/settings', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    
    // Process updates
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: (req as any).user.id
    }));

    if (updates.length === 0) {
      return res.json({ message: 'No settings to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .upsert(updates)
      .select();

    if (error) throw error;

    res.json({ message: 'Settings updated successfully', data });
  } catch (error: any) {
    console.error('Update System Settings Error:', error);
    res.status(500).json({ message: error.message });
  }
});

export const adminRouter = router;
