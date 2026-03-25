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
        secondary_role: 'teacher',
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

// DELETE /api/admin/schools/:id
// Deletes a school and cascades to all associated data, including Auth users
router.delete('/schools/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const schoolId = req.params.id;

  if (!schoolId) {
    return res.status(400).json({ message: 'School ID is required' });
  }

  try {
    // 1. Fetch all users associated with the school
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId);

    if (profilesError) throw profilesError;

    // 2. Loop through and delete from Supabase Auth
    // The `profiles` rows will be implicitly deleted if ON DELETE CASCADE were on the trigger,
    // but the critical part is removing the Auth user so they aren't orphaned and can sign up again.
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
      }
    }

    // 3. Delete the school (Database cascades handle the rest of the tables)
    const { error: deleteError } = await supabaseAdmin
      .from('schools')
      .delete()
      .eq('id', schoolId);

    if (deleteError) throw deleteError;

    res.json({ message: 'School and all associated data deleted successfully' });
  } catch (error: any) {
    console.error('Delete School Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/admin/schools/:schoolId/teachers/permanent
// Permanently deletes ALL teachers in a school (Auth + Profiles)
router.delete('/schools/:schoolId/teachers/permanent', requireSystemAdmin, async (req: Request, res: Response) => {
  const { schoolId } = req.params;

  if (!schoolId) {
    return res.status(400).json({ message: 'School ID is required' });
  }

  try {
    // 1. Fetch all teacher IDs for this school
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId)
      .eq('role', 'teacher');

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return res.json({ message: 'No teachers found to delete for this school' });
    }

    // 2. Delete from Supabase Auth
    // This is permanent and handles profile deletion if triggers are set,
    // otherwise we also delete from profiles table explicitly below.
    let deletedCount = 0;
    for (const profile of profiles) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
      if (authError) {
        console.error(`Failed to delete auth user ${profile.id}:`, authError.message);
      } else {
        deletedCount++;
      }
    }

    // 3. Explicitly delete from profiles table just in case (e.g. orphans or missing triggers)
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('school_id', schoolId)
      .eq('role', 'teacher');

    if (dbError) throw dbError;

    res.json({ 
      message: `Successfully deleted ${deletedCount} teachers permanently from school ${schoolId}`,
      totalAttempted: profiles.length
    });

  } catch (error: any) {
    console.error('Permanent Teacher Deletion Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// GET /api/admin/schools/:schoolId/teachers
// List all teachers in a specific school with emails
router.get('/schools/:schoolId/teachers', requireSystemAdmin, async (req: Request, res: Response) => {
  const { schoolId } = req.params;
  
  try {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, employment_status, staff_number, created_at, email')
      .eq('school_id', schoolId)
      .eq('role', 'teacher');

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return res.json([]);
    }

    // Get emails from auth as a fallback only if profile.email is missing
    const profilesMissingEmail = profiles.filter(p => !p.email);
    let authUsers: any[] = [];
    
    if (profilesMissingEmail.length > 0) {
      // Increase limit to 1000 for listUsers as a simple way to handle larger datasets for now
      const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (!authError) {
        authUsers = users;
      }
    }

    const teachersWithEmails = profiles.map(profile => {
      // Use email from profile if available, otherwise fallback to Auth
      let email = profile.email;
      if (!email && authUsers.length > 0) {
        const authUser = authUsers.find(u => u.id === profile.id);
        email = authUser?.email;
      }
      
      return {
        ...profile,
        email
      };
    });

    res.json(teachersWithEmails);
  } catch (error: any) {
    console.error('Fetch School Teachers Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/schools/:schoolId/teachers/bulk-delete-permanent
// Selective permanent deletion of teachers
router.post('/schools/:schoolId/teachers/bulk-delete-permanent', requireSystemAdmin, async (req: Request, res: Response) => {
  const { schoolId } = req.params;
  const { teacherIds } = req.body;

  if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
    return res.status(400).json({ message: 'Teacher IDs are required' });
  }

  try {
    let deletedCount = 0;
    const errors: string[] = [];

    for (const id of teacherIds) {
      try {
        // Verify the teacher belongs to the school
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('school_id')
          .eq('id', id)
          .eq('role', 'teacher')
          .single();

        if (profile && profile.school_id === schoolId) {
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
          if (authError) {
            console.error(`Failed to delete auth user ${id}:`, authError.message);
            errors.push(`Failed to delete auth user ${id}: ${authError.message}`);
          } else {
            deletedCount++;
          }
          
          // Also delete profile explicitly (cascade might handle it, but being explicit)
          await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', id);
        } else {
          errors.push(`Teacher ${id} not found in school ${schoolId}`);
        }
      } catch (innerError: any) {
        console.error(`Error deleting teacher ${id}:`, innerError);
        errors.push(`Error deleting teacher ${id}: ${innerError.message}`);
      }
    }

    res.json({ 
      message: `Successfully deleted ${deletedCount} teachers permanently`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Selective Teacher Deletion Error:', error);
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
  const { email, password, full_name, role, secondary_role, school_id } = req.body;

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
        secondary_role: (secondary_role && secondary_role !== 'none') ? secondary_role : (role === 'school_admin' ? 'teacher' : null),
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
  const { email, password, full_name, role, secondary_role, school_id } = req.body;

  try {
    const updateData: any = {
      email,
      user_metadata: {
        full_name,
        role,
        secondary_role,
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
        secondary_role: (secondary_role && secondary_role !== 'none') ? secondary_role : (role === 'school_admin' ? 'teacher' : null),
        school_id: school_id === 'none' ? null : school_id,
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

// --- DATA MAINTENANCE ENDPOINTS ---

// Helpers for the fix-class-enrollments endpoint
function normalizeClassName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/^(Grade|Form|Class|Level|Year)\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function findBestClassMatch(
  input: string,
  classes: { id: string; name: string }[]
): { id: string; name: string } | null {
  if (!input || !classes.length) return null;
  const trimmed = input.trim();

  const exact = classes.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  const normInput = normalizeClassName(trimmed);
  if (!normInput) return null;
  const norm = classes.find(c => normalizeClassName(c.name) === normInput);
  if (norm) return norm;

  return classes.find(c => {
    const nc = normalizeClassName(c.name);
    return nc.includes(normInput) || normInput.includes(nc);
  }) || null;
}

// POST /api/admin/system/fix-class-enrollments
// Scans all students and fuzzy-matches them to classes, fixing missing/wrong enrollments
router.post('/system/fix-class-enrollments', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data: schools, error: schoolsErr } = await supabaseAdmin
      .from('schools')
      .select('id, name, academic_year');

    if (schoolsErr) throw schoolsErr;
    if (!schools || schools.length === 0) return res.json({ fixedCount: 0, message: "No schools found" });

    let totalFixed = 0;

    for (const school of schools) {
      const academicYear = school.academic_year || new Date().getFullYear().toString();

      const { data: classes } = await supabaseAdmin
        .from('classes')
        .select('id, name')
        .eq('school_id', school.id);
      
      if (!classes || classes.length === 0) continue;

      const { data: students } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, grade')
        .eq('school_id', school.id)
        .eq('role', 'student')
        .not('grade', 'is', null);

      if (!students || students.length === 0) continue;

      for (const student of students) {
        const match = findBestClassMatch(student.grade, classes);
        if (!match) continue;

        const { data: existing } = await supabaseAdmin
          .from('enrollments')
          .select('id, class_id')
          .eq('student_id', student.id)
          .eq('academic_year', academicYear)
          .maybeSingle();

        const needsEnrollmentFix = !existing || existing.class_id !== match.id;
        const needsGradeTextFix = student.grade !== match.name;

        if (needsEnrollmentFix) {
          if (existing) {
            await supabaseAdmin
              .from('enrollments')
              .update({ class_id: match.id, status: 'Active' })
              .eq('id', existing.id);
          } else {
            await supabaseAdmin
              .from('enrollments')
              .insert({ student_id: student.id, class_id: match.id, school_id: school.id, academic_year: academicYear, status: 'Active' });
          }
          totalFixed++;
        }

        if (needsGradeTextFix) {
          await supabaseAdmin
            .from('profiles')
            .update({ grade: match.name })
            .eq('id', student.id);
          if (!needsEnrollmentFix) {
            totalFixed++;
          }
        }
      }
    }

    res.json({ message: `Successfully repaired ${totalFixed} student records`, fixedCount: totalFixed });
  } catch (error: any) {
    console.error('System Fix Enrollments Error:', error);
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

// POST /api/admin/users/:id/reset-password
// Reset a user's password (System Admin only)
router.post('/users/:id/reset-password', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: password
    });

    if (error) throw error;

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

export const adminRouter = router;
