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

    // --- MANUAL PROFILE CREATION (Fallback for trigger failures) ---
    if (user && user.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.user.id,
          full_name,
          email,
          role,
          secondary_role: (secondary_role && secondary_role !== 'none') ? secondary_role : (role === 'school_admin' ? 'teacher' : null),
          school_id: school_id === 'none' ? null : school_id
        }, { onConflict: 'id' });

      if (profileError) {
        console.warn('[Admin Create User] Manual profile creation failed:', profileError.message);
      }
    }
    // ---------------------------------------------------------------

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
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email,
      password: (password && password.length > 0) ? password : undefined,
      user_metadata: {
        full_name,
        role,
        secondary_role: (secondary_role && secondary_role !== 'none') ? secondary_role : (role === 'school_admin' ? 'teacher' : null),
        school_id: school_id === 'none' ? null : school_id
      }
    });

    if (authError) throw authError;

    // 2. Update Public Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        email,
        role,
        secondary_role: (secondary_role && secondary_role !== 'none') ? secondary_role : (role === 'school_admin' ? 'teacher' : null),
        school_id: school_id === 'none' ? null : school_id,
      })
      .eq('id', id);




    if (profileError) throw profileError;

    res.json({ message: 'User updated successfully', user: user.user });
  } catch (error: any) {
    console.error('Update User Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/users/purge-non-system
// DANGEROUS: Purges all users from the system EXCEPT system_admins
router.post('/users/purge-non-system', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    // 1. Fetch all profiles that are NOT system admins
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .neq('role', 'system_admin');

    if (profileError) throw profileError;

    if (!profiles || profiles.length === 0) {
      return res.json({ message: 'No non-system users found to purge.', deletedCount: 0 });
    }

    console.log(`[Purge] Found ${profiles.length} non-system users to delete.`);

    let deletedCount = 0;
    const errors: string[] = [];

    // 2. Delete each user from Supabase Auth
    // Auth deletion will trigger profile deletion if the trigger is set up correctly,
    // but we'll also do a bulk profile delete later just in case.
    for (const profile of profiles) {
      try {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
        if (authError) {
          console.error(`[Purge] Failed to delete auth user ${profile.id} (${profile.full_name}):`, authError.message);
          errors.push(`Auth Error (${profile.full_name}): ${authError.message}`);
        } else {
          deletedCount++;
        }
      } catch (innerError: any) {
        console.error(`[Purge] Exception deleting user ${profile.id}:`, innerError);
        errors.push(`Exception (${profile.full_name}): ${innerError.message}`);
      }
    }

    // 3. Explicitly purge any remaining profiles that are not system admins
    // (This handles users who might not have an Auth record or if triggers failed)
    const { error: dbPurgeError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .neq('role', 'system_admin');

    if (dbPurgeError) {
      console.error('[Purge] DB Purge Error:', dbPurgeError);
      errors.push(`DB Purge Error: ${dbPurgeError.message}`);
    }

    res.json({
      message: `System purge completed. Successfully removed ${deletedCount} users.`,
      deletedCount,
      totalFound: profiles.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Purge Users Error:', error);
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

    // 2. Business Finance Metrics from Licenses
    const [licensesRes, plansRes] = await Promise.all([
      supabaseAdmin.from('school_licenses').select('*'),
      supabaseAdmin.from('subscription_plans').select('*')
    ]);

    let totalRevenue = 0;

    if (!licensesRes.error && !plansRes.error && licensesRes.data && plansRes.data) {
      const licenses = licensesRes.data;
      const plans = plansRes.data;

      const getPlanInfo = (planName: string) => {
        const found = plans.find(p => 
          p.name.toLowerCase() === planName.toLowerCase() ||
          p.name.toLowerCase().includes(planName.toLowerCase()) ||
          planName.toLowerCase().includes(p.name.toLowerCase())
        );
        return found 
          ? { 
              price: Number(found.price), 
              currency: found.currency || 'ZMW',
              durationValue: Number(found.duration_value) || 1,
              durationUnit: found.duration_unit || 'months'
            } 
          : { 
              price: 500, 
              currency: 'ZMW',
              durationValue: 1,
              durationUnit: 'months'
            };
      };

      licenses.forEach((license: any) => {
        const planInfo = getPlanInfo(license.plan);
        const startDate = new Date(license.start_date);
        const endDate = new Date(license.end_date);
        
        let numberOfCycles = 1;
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        
        if (planInfo.durationUnit === 'days') {
          const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
          numberOfCycles = diffDays / planInfo.durationValue;
        } else {
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const durationMonths = Math.max(1, Math.round(diffDays / 30));
          numberOfCycles = durationMonths / planInfo.durationValue;
        }

        if (numberOfCycles < 0.1) {
          numberOfCycles = 1;
        }

        const totalCost = planInfo.price * numberOfCycles;
        totalRevenue += totalCost;
      });
    }

    // 3. Online Users Calculation (query actual active sessions in the last 15 minutes)
    let onlineUsers = 1; // Default to at least the current system admin
    try {
      const { data: usersData, error: usersDataError } = await supabaseAdmin.auth.admin.listUsers();
      if (!usersDataError && usersData?.users) {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const activeRecent = usersData.users.filter(u => {
          if (!u.last_sign_in_at) return false;
          return new Date(u.last_sign_in_at) >= fifteenMinutesAgo;
        });
        // We set the online count to the maximum of 1 or the count of recent logins
        onlineUsers = Math.max(1, activeRecent.length);
      }
    } catch (err) {
      console.error('Error fetching online users from auth admin:', err);
      // Fallback to a realistic count if listUsers fails (e.g. key permissions)
      onlineUsers = Math.max(1, Math.min(usersCount || 0, Math.floor((usersCount || 0) * 0.12)));
    }

    // 4. Fetch all profiles to count students/teachers per school in memory
    const { data: allProfiles, error: allProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('school_id, role')
      .in('role', ['student', 'teacher']);

    const schoolStudentCount: Record<string, number> = {};
    const schoolTeacherCount: Record<string, number> = {};

    if (allProfiles) {
      allProfiles.forEach((p: any) => {
        if (!p.school_id) return;
        if (p.role === 'student') {
          schoolStudentCount[p.school_id] = (schoolStudentCount[p.school_id] || 0) + 1;
        } else if (p.role === 'teacher') {
          schoolTeacherCount[p.school_id] = (schoolTeacherCount[p.school_id] || 0) + 1;
        }
      });
    }

    // 5. Fetch 5 most recent schools (with licenses)
    const { data: recentSchools, error: recentSchoolsError } = await supabaseAdmin
      .from('schools')
      .select('id, name, slug, created_at, school_licenses(status, plan)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentSchoolsError) {
      console.error('Error fetching recent schools:', recentSchoolsError);
    }

    let recentSchoolsWithCounts: any[] = [];
    if (recentSchools) {
      recentSchoolsWithCounts = recentSchools.map((school: any) => ({
        ...school,
        student_count: schoolStudentCount[school.id] || 0,
        teacher_count: schoolTeacherCount[school.id] || 0
      }));
    }

    // 6. Fetch auth users in pages to calculate usage stats
    let allUsers: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data: userDataObj, error: userDataErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000
      });

      if (userDataErr) {
        console.error('Error listing auth users:', userDataErr);
        break;
      }

      const usersList = userDataObj?.users || [];
      if (usersList.length === 0) {
        hasMore = false;
      } else {
        allUsers.push(...usersList);
        if (usersList.length < 1000) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const schoolSignIns7d: Record<string, number> = {};
    const schoolSignIns30d: Record<string, number> = {};

    allUsers.forEach((u: any) => {
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null;
      const schoolId = u.user_metadata?.school_id;

      if (!schoolId) return;

      if (lastSignIn) {
        if (lastSignIn >= sevenDaysAgo) {
          schoolSignIns7d[schoolId] = (schoolSignIns7d[schoolId] || 0) + 1;
        }
        if (lastSignIn >= thirtyDaysAgo) {
          schoolSignIns30d[schoolId] = (schoolSignIns30d[schoolId] || 0) + 1;
        }
      }
    });

    // Fetch all schools to map stats
    const { data: allSchools, error: allSchoolsErr } = await supabaseAdmin
      .from('schools')
      .select('id, name, slug, created_at');

    let inactiveSchools: any[] = [];
    let topPerformingSchools: any[] = [];

    if (allSchools) {
      const schoolsWithStats = allSchools.map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        created_at: s.created_at,
        student_count: schoolStudentCount[s.id] || 0,
        teacher_count: schoolTeacherCount[s.id] || 0,
        sign_ins_7d: schoolSignIns7d[s.id] || 0,
        sign_ins_30d: schoolSignIns30d[s.id] || 0
      }));

      // Inactive schools: no user signed in in past 7 days OR less than 20 users signed in in past 30 days
      inactiveSchools = schoolsWithStats
        .filter((s: any) => s.sign_ins_7d === 0 || s.sign_ins_30d < 20)
        .sort((a: any, b: any) => a.sign_ins_30d - b.sign_ins_30d) // sort by usage ascending
        .slice(0, 30);

      // Top performing schools: sorted by 30 days usage descending
      topPerformingSchools = [...schoolsWithStats]
        .sort((a: any, b: any) => b.sign_ins_30d - a.sign_ins_30d)
        .slice(0, 30);
    }

    // 7. Construct activities list from various tables
    const [schoolsDataRes, licensesDataRes, transactionsDataRes] = await Promise.all([
      supabaseAdmin.from('schools').select('id, name, created_at').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('school_licenses').select('id, plan, license_key, created_at, schools(name)').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('business_transactions').select('id, type, category, amount, currency, description, created_at').order('created_at', { ascending: false }).limit(10)
    ]);

    const activitiesList: any[] = [];

    if (!schoolsDataRes.error && schoolsDataRes.data) {
      schoolsDataRes.data.forEach((school: any) => {
        activitiesList.push({
          id: `school-${school.id}`,
          type: 'Success',
          message: `New school tenant provisioned: ${school.name}`,
          time: school.created_at,
          source: 'Provisioning'
        });
      });
    }

    if (!licensesDataRes.error && licensesDataRes.data) {
      licensesDataRes.data.forEach((lic: any) => {
        const schoolName = lic.schools?.name || 'School';
        activitiesList.push({
          id: `lic-${lic.id}`,
          type: 'Info',
          message: `License key generated for ${schoolName} (Plan: ${lic.plan})`,
          time: lic.created_at,
          source: 'Licensing'
        });
      });
    }

    if (!transactionsDataRes.error && transactionsDataRes.data) {
      transactionsDataRes.data.forEach((tx: any) => {
        activitiesList.push({
          id: `tx-${tx.id}`,
          type: tx.type === 'income' ? 'Success' : 'Warning',
          message: `${tx.type === 'income' ? 'Income' : 'Expense'} recorded: ${tx.category} - ${tx.amount} ${tx.currency} (${tx.description || ''})`,
          time: tx.created_at,
          source: 'Finance'
        });
      });
    }

    // Sort by time descending
    activitiesList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const sortedActivities = activitiesList.slice(0, 10);

    res.json({
      stats: {
        totalSchools: schoolsCount || 0,
        activeUsers: usersCount || 0,
        totalRevenue,
        onlineUsers
      },
      recentSchools: recentSchoolsWithCounts || [],
      activities: sortedActivities,
      inactiveSchools,
      topPerformingSchools
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
  const { schoolId, plan, durationYears, durationMonths, durationDays } = req.body;

  if (!schoolId || (!durationYears && !durationMonths && !durationDays)) {
    return res.status(400).json({ message: 'Missing required fields: schoolId, and one of durationYears, durationMonths, or durationDays' });
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
    if (durationDays) {
      endDate.setDate(endDate.getDate() + parseInt(String(durationDays)));
    } else if (durationMonths) {
      endDate.setMonth(endDate.getMonth() + parseInt(String(durationMonths)));
    } else if (durationYears) {
      endDate.setFullYear(endDate.getFullYear() + parseInt(String(durationYears)));
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

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

    // Update school's plan in schools table to match
    const { error: schoolUpdateError } = await supabaseAdmin
      .from('schools')
      .update({ plan: plan || 'Standard' })
      .eq('id', schoolId);

    if (schoolUpdateError) {
      console.error('Error updating school plan during license generation:', schoolUpdateError);
    }

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

// DELETE /api/admin/licenses/:id
// Delete a license
router.delete('/licenses/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('school_licenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'License deleted successfully' });
  } catch (error: any) {
    console.error('Delete License Error:', error);
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

// --- METADATA CONFIGURATION ENDPOINTS ---

// GET /api/admin/configurations/categories
router.get('/configurations/categories', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('school_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // If table doesn't exist yet, return empty array gracefully
      if (error.code === '42P01' || error.message?.includes('relation "school_categories" does not exist')) {
        return res.json([]);
      }
      throw error;
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/configurations/types
router.get('/configurations/types', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('school_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation "school_types" does not exist')) {
        return res.json([]);
      }
      throw error;
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/configurations/types
router.post('/configurations/types', requireSystemAdmin, async (req: Request, res: Response) => {
  const { name, description } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('school_types')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/configurations/types/:id
router.put('/configurations/types/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('school_types')
      .update({ name, description, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/configurations/types/:id
router.delete('/configurations/types/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('school_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/configurations/categories
router.post('/configurations/categories', requireSystemAdmin, async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('school_categories')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/configurations/categories/:id
router.put('/configurations/categories/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('school_categories')
      .update({ name, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/configurations/categories/:id
router.delete('/configurations/categories/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('school_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/configurations/countries
router.get('/configurations/countries', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // If table doesn't exist yet, return empty array gracefully
      if (error.code === '42P01' || error.message?.includes('relation "countries" does not exist')) {
        return res.json([]);
      }
      throw error;
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/configurations/countries
router.post('/configurations/countries', requireSystemAdmin, async (req: Request, res: Response) => {
  const { name, code } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('countries')
      .insert({ name, code })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/configurations/countries/:id
router.put('/configurations/countries/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('countries')
      .update({ name, code, updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
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

// Subscription Plans Configuration
// GET /api/admin/configurations/plans
router.get('/configurations/plans', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation "subscription_plans" does not exist')) {
        return res.json([]);
      }
      throw error;
    };
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/configurations/plans
router.post('/configurations/plans', requireSystemAdmin, async (req: Request, res: Response) => {
    const { 
      name, description, price, currency, billing_cycle, is_active, country_ids,
      min_students, max_students, duration_value, duration_unit
    } = req.body;
    try {
      const { data, error } = await supabaseAdmin
        .from('subscription_plans')
        .insert({ 
          name, description, price, currency, billing_cycle, is_active, country_ids,
          min_students: min_students ? parseInt(String(min_students)) : 0,
          max_students: max_students ? parseInt(String(max_students)) : null,
          duration_value: duration_value ? parseInt(String(duration_value)) : 1,
          duration_unit: duration_unit || 'months'
        })
        .select()
        .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/configurations/plans/:id
router.put('/configurations/plans/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
    const { 
      name, description, price, currency, billing_cycle, is_active, country_ids,
      min_students, max_students, duration_value, duration_unit
    } = req.body;
    try {
      const { data, error } = await supabaseAdmin
        .from('subscription_plans')
        .update({ 
          name, description, price, currency, billing_cycle, is_active, country_ids, 
          min_students: min_students ? parseInt(String(min_students)) : 0,
          max_students: (max_students === null || max_students === '') ? null : parseInt(String(max_students)),
          duration_value: duration_value ? parseInt(String(duration_value)) : 1,
          duration_unit: duration_unit || 'months',
          updated_at: new Date() 
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/configurations/plans/:id
router.delete('/configurations/plans/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/configurations/codes
router.get('/configurations/codes', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('license_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Gracefully handle missing table
      if (error.code === '42P01' || error.message?.includes('relation "license_codes" does not exist')) {
        return res.json([]);
      }
      console.error('Fetch License Codes Error:', error);
      throw error;
    }
    res.json(data);
  } catch (error: any) {
    console.error('GET /configurations/codes 500 Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/configurations/codes
// Generates a new random license code
router.post('/configurations/codes', requireSystemAdmin, async (req: Request, res: Response) => {
  const { plan_name, duration_months, description } = req.body;
  
  // Generate random code in format MUCHI-XXXX-XXXX
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const genPart = () => Array.from({length: 4}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  const code = `MUCHI-${genPart()}-${genPart()}`;

  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.authorization?.split(' ')[1] || '');
    
    const { data, error } = await supabaseAdmin
      .from('license_codes')
      .insert({ 
        code, 
        plan_name, 
        duration_months, 
        description,
        created_by: user?.id 
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/configurations/codes/:id
router.delete('/configurations/codes/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('license_codes')
      .delete()
      .eq('id', id)
      .eq('is_used', false); // Only allow deleting unused codes

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/finances/stats
// Returns platform-wide financial metrics and subscriptions list
router.get('/finances/stats', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    // Fetch all licenses, plans and schools
    const [licensesRes, plansRes, schoolsRes] = await Promise.all([
      supabaseAdmin.from('school_licenses').select('*, schools(name, slug)'),
      supabaseAdmin.from('subscription_plans').select('*'),
      supabaseAdmin.from('schools').select('id, name, created_at')
    ]);

    if (licensesRes.error) throw licensesRes.error;
    if (plansRes.error) throw plansRes.error;
    if (schoolsRes.error) throw schoolsRes.error;

    const licenses = licensesRes.data || [];
    const plans = plansRes.data || [];
    const schools = schoolsRes.data || [];

    // Helper to find price and duration details for a plan
    const getPlanInfo = (planName: string) => {
      const found = plans.find(p => 
        p.name.toLowerCase() === planName.toLowerCase() ||
        p.name.toLowerCase().includes(planName.toLowerCase()) ||
        planName.toLowerCase().includes(p.name.toLowerCase())
      );
      return found 
        ? { 
            price: Number(found.price), 
            currency: found.currency || 'ZMW',
            durationValue: Number(found.duration_value) || 1,
            durationUnit: found.duration_unit || 'months'
          } 
        : { 
            price: 500, 
            currency: 'ZMW',
            durationValue: 1,
            durationUnit: 'months'
          };
    };

    let totalRevenue = 0;
    let mrr = 0;
    let activeSubscriptionsCount = 0;

    // Calculate revenue metrics
    const now = new Date();
    const processedLicenses = licenses.map((license: any) => {
      const planInfo = getPlanInfo(license.plan);
      const startDate = new Date(license.start_date);
      const endDate = new Date(license.end_date);
      
      // Calculate duration cycles based on plan duration value/unit
      let numberOfCycles = 1;
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      
      if (planInfo.durationUnit === 'days') {
        const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
        numberOfCycles = diffDays / planInfo.durationValue;
      } else {
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const durationMonths = Math.max(1, Math.round(diffDays / 30));
        numberOfCycles = durationMonths / planInfo.durationValue;
      }

      if (numberOfCycles < 0.1) {
        numberOfCycles = 1;
      }

      const totalCost = planInfo.price * numberOfCycles;
      totalRevenue += totalCost;

      const isActive = license.status === 'active' && endDate > now;
      if (isActive) {
        // Normalize MRR to monthly value
        let monthlyContribution = planInfo.price;
        if (planInfo.durationUnit === 'months' && planInfo.durationValue > 0) {
          monthlyContribution = planInfo.price / planInfo.durationValue;
        } else if (planInfo.durationUnit === 'days' && planInfo.durationValue > 0) {
          monthlyContribution = (planInfo.price / planInfo.durationValue) * 30;
        }
        mrr += monthlyContribution;
        activeSubscriptionsCount++;
      }

      return {
        id: license.id,
        schoolName: license.schools?.name || 'Unknown School',
        schoolSlug: license.schools?.slug || '',
        plan: license.plan,
        status: isActive ? 'active' : (license.status === 'active' ? 'expired' : license.status),
        startDate: license.start_date,
        endDate: license.end_date,
        price: planInfo.price,
        totalCost,
        currency: planInfo.currency,
        licenseKey: license.license_key
      };
    });

    // Calculate plan distribution
    const planDistributionMap: Record<string, number> = {};
    processedLicenses.forEach((l: any) => {
      if (l.status === 'active') {
        planDistributionMap[l.plan] = (planDistributionMap[l.plan] || 0) + 1;
      }
    });
    const planDistribution = Object.entries(planDistributionMap).map(([name, value]) => ({
      name,
      value
    }));

    // Calculate monthly sales trend (last 6 months)
    const monthlySalesTrend: Record<string, number> = {};
    const monthNames = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlySalesTrend[monthStr] = 0;
      monthNames.push(monthStr);
    }

    processedLicenses.forEach((l: any) => {
      const startDate = new Date(l.startDate);
      const monthStr = startDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (monthStr in monthlySalesTrend) {
        monthlySalesTrend[monthStr] += l.totalCost;
      }
    });

    const revenueTrends = monthNames.map(month => ({
      month,
      revenue: monthlySalesTrend[month]
    }));

    res.json({
      summary: {
        totalRevenue,
        mrr,
        activeSubscriptions: activeSubscriptionsCount,
        arpu: activeSubscriptionsCount > 0 ? Math.round(mrr / activeSubscriptionsCount) : 0,
        totalSchools: schools.length
      },
      licenses: processedLicenses,
      planDistribution,
      revenueTrends
    });

  } catch (error: any) {
    console.error('Finances Stats Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// GET /api/admin/finances/transactions
// Get platform-wide operational business transactions (expenses and custom incomes)
router.get('/finances/transactions', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('business_transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Get Business Transactions Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/finances/transactions
// Record a new operational business transaction
router.post('/finances/transactions', requireSystemAdmin, async (req: Request, res: Response) => {
  const { type, category, amount, currency, description, date } = req.body;
  const user = (req as any).user;

  if (!type || !category || !amount) {
    return res.status(400).json({ message: 'Type, category and amount are required.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('business_transactions')
      .insert({
        type,
        category,
        amount: Number(amount),
        currency: currency || 'ZMW',
        description: description || '',
        date: date || new Date().toISOString().split('T')[0],
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Business Transaction Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/admin/finances/transactions/:id
// Remove an operational business transaction
router.delete('/finances/transactions/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('business_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete Business Transaction Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});


// ==========================================
// School Project Management & CRM Endpoints
// ==========================================

// GET /api/admin/schools/:id/project-details
// Fetch detailed onboarding, payment, tasks, contacts, contact logs, and usage stats
router.get('/schools/:id/project-details', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // 1. Fetch school details
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('*, school_licenses(*)')
      .eq('id', id)
      .single();

    if (schoolError) throw schoolError;

    // 2. Fetch tasks
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('school_tasks')
      .select('*')
      .eq('school_id', id)
      .order('created_at', { ascending: false });

    if (tasksError) throw tasksError;

    // 3. Fetch contacts
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('school_contacts')
      .select('*')
      .eq('school_id', id)
      .order('name', { ascending: true });

    if (contactsError) throw contactsError;

    // 4. Fetch contact logs
    const { data: contactLogs, error: contactLogsError } = await supabaseAdmin
      .from('school_contact_logs')
      .select(`
        *,
        contacted_by_profile:profiles!school_contact_logs_contacted_by_fkey(id, full_name),
        school_contacts!school_contact_logs_contacted_with_fkey(id, name)
      `)
      .eq('school_id', id)
      .order('contacted_at', { ascending: false });

    if (contactLogsError) throw contactLogsError;

    // 5. Gather usage statistics
    const [studentRes, teacherRes, classRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', id)
        .eq('role', 'student'),
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', id)
        .eq('role', 'teacher'),
      supabaseAdmin
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', id)
    ]);

    // Active users in 7d and 30d (by matching auth users to school profiles)
    let active7d = 0;
    let active30d = 0;

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('school_id', id);

    if (!profilesError && profiles && profiles.length > 0) {
      const schoolUserIds = new Set(profiles.map(p => p.id));
      
      // Page through all auth users to find matching sign-ins
      let allUsers: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data: userDataObj, error: userDataErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000
        });

        if (userDataErr) {
          console.error('Error fetching auth users inside project-details:', userDataErr);
          break;
        }

        const usersList = userDataObj?.users || [];
        if (usersList.length === 0) {
          hasMore = false;
        } else {
          allUsers.push(...usersList);
          if (usersList.length < 1000) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      allUsers.forEach((u: any) => {
        if (schoolUserIds.has(u.id)) {
          const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null;
          if (lastSignIn) {
            if (lastSignIn >= sevenDaysAgo) active7d++;
            if (lastSignIn >= thirtyDaysAgo) active30d++;
          }
        }
      });
    }

    res.json({
      school,
      tasks: tasks || [],
      contacts: contacts || [],
      contactLogs: contactLogs || [],
      stats: {
        studentCount: studentRes.count || 0,
        teacherCount: teacherRes.count || 0,
        classCount: classRes.count || 0,
        active7d,
        active30d
      }
    });
  } catch (error: any) {
    console.error('Fetch School Project Details Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// PUT /api/admin/schools/:id/project-details
// Update onboarding status and admin notes
router.put('/schools/:id/project-details', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { onboarding_status, admin_notes } = req.body;

  try {
    const { data: school, error } = await supabaseAdmin
      .from('schools')
      .update({
        onboarding_status: onboarding_status !== undefined ? onboarding_status : undefined,
        admin_notes: admin_notes !== undefined ? admin_notes : undefined
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(school);
  } catch (error: any) {
    console.error('Update School Project Details Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/schools/:id/tasks
// Create a new task/reminder for a school
router.post('/schools/:id/tasks', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, category, due_date } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  try {
    const { data: task, error } = await supabaseAdmin
      .from('school_tasks')
      .insert({
        school_id: id,
        title,
        description: description || '',
        category: category || 'general',
        due_date: due_date || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(task);
  } catch (error: any) {
    console.error('Create School Task Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// PUT /api/admin/schools/:id/tasks/:taskId
// Update a school task
router.put('/schools/:id/tasks/:taskId', requireSystemAdmin, async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { title, description, status, category, due_date } = req.body;

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }
  }
  if (category !== undefined) updates.category = category;
  if (due_date !== undefined) updates.due_date = due_date;

  try {
    const { data: task, error } = await supabaseAdmin
      .from('school_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    res.json(task);
  } catch (error: any) {
    console.error('Update School Task Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/admin/schools/:id/tasks/:taskId
// Delete a school task
router.delete('/schools/:id/tasks/:taskId', requireSystemAdmin, async (req: Request, res: Response) => {
  const { taskId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('school_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete School Task Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/schools/:id/contacts
// Create a new school contact
router.post('/schools/:id/contacts', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, phone, email } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Contact name is required.' });
  }

  try {
    const { data: contact, error } = await supabaseAdmin
      .from('school_contacts')
      .insert({
        school_id: id,
        name,
        role: role || '',
        phone: phone || '',
        email: email || ''
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(contact);
  } catch (error: any) {
    console.error('Create School Contact Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// PUT /api/admin/schools/:id/contacts/:contactId
// Update a school contact
router.put('/schools/:id/contacts/:contactId', requireSystemAdmin, async (req: Request, res: Response) => {
  const { contactId } = req.params;
  const { name, role, phone, email } = req.body;

  try {
    const { data: contact, error } = await supabaseAdmin
      .from('school_contacts')
      .update({
        name: name !== undefined ? name : undefined,
        role: role !== undefined ? role : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined
      })
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    res.json(contact);
  } catch (error: any) {
    console.error('Update School Contact Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/admin/schools/:id/contacts/:contactId
// Delete a school contact
router.delete('/schools/:id/contacts/:contactId', requireSystemAdmin, async (req: Request, res: Response) => {
  const { contactId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('school_contacts')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete School Contact Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/schools/:id/contact-logs
// Log a school contact interaction
router.post('/schools/:id/contact-logs', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { contacted_at, contacted_by, contacted_with, channel, summary, status_outcome, next_step } = req.body;
  const authUser = (req as any).user;

  if (!channel || !summary) {
    return res.status(400).json({ message: 'Channel and summary are required.' });
  }

  try {
    // 1. Insert interaction
    const { data: newLog, error: insertError } = await supabaseAdmin
      .from('school_contact_logs')
      .insert({
        school_id: id,
        contacted_at: contacted_at || new Date().toISOString(),
        contacted_by: contacted_by || authUser.id,
        contacted_with: contacted_with || null,
        channel,
        summary,
        status_outcome: status_outcome || '',
        next_step: next_step || ''
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Fetch full log with relationships so client updates nicely
    const { data: fullLog, error: fetchError } = await supabaseAdmin
      .from('school_contact_logs')
      .select(`
        *,
        contacted_by_profile:profiles!school_contact_logs_contacted_by_fkey(id, full_name),
        school_contacts!school_contact_logs_contacted_with_fkey(id, name)
      `)
      .eq('id', newLog.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(fullLog);
  } catch (error: any) {
    console.error('Log School Contact Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/admin/schools/:id/contact-logs/:logId
// Delete a school contact log
router.delete('/schools/:id/contact-logs/:logId', requireSystemAdmin, async (req: Request, res: Response) => {
  const { logId } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('school_contact_logs')
      .delete()
      .eq('id', logId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete School Contact Log Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// ==========================================
// Prospects CRM Management Endpoints
// ==========================================

// GET /api/admin/prospects
router.get('/prospects', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('List Prospects Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/admin/prospects
router.post('/prospects', requireSystemAdmin, async (req: Request, res: Response) => {
  const { school_name, contact_name, email, phone, address, status, notes } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('prospects')
      .insert({
        school_name,
        contact_name,
        email,
        phone,
        address,
        status: status || 'New',
        notes
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create Prospect Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// PUT /api/admin/prospects/:id
router.put('/prospects/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { school_name, contact_name, email, phone, address, status, notes } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('prospects')
      .update({
        school_name,
        contact_name,
        email,
        phone,
        address,
        status,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Update Prospect Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/admin/prospects/:id
router.delete('/prospects/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete Prospect Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SYSTEM ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
import {
  getSmtpConfig,
  testSmtpConnection,
  sendEmail,
  sendTemplatedEmail,
  renderTemplate,
} from '../services/emailService.js';

// ─── SMTP Config ──────────────────────────────────────────────────────────────

// GET /api/admin/email/smtp — Fetch SMTP config (password masked)
router.get('/email/smtp', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const config = await getSmtpConfig();
    if (!config) return res.json({ host: '', port: 587, secure: false, username: '', password: '', from_name: 'MUCHI', from_email: '', is_active: false });
    // Mask password
    res.json({ ...config, password: config.password ? '••••••••' : '' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/email/smtp — Save SMTP config
router.put('/email/smtp', requireSystemAdmin, async (req: Request, res: Response) => {
  const { host, port, secure, username, password, from_name, from_email, is_active } = req.body;
  try {
    // Build update object — only update password if a real value provided (not masked placeholder)
    const updateData: any = { host, port: Number(port), secure: Boolean(secure), username, from_name, from_email, is_active: Boolean(is_active), updated_at: new Date().toISOString() };
    if (password && password !== '••••••••') {
      updateData.password = password;
    }

    const { data: existing } = await supabaseAdmin.from('email_smtp_config').select('id').limit(1).single();

    let result;
    if (existing) {
      result = await supabaseAdmin.from('email_smtp_config').update(updateData).eq('id', existing.id).select().single();
    } else {
      result = await supabaseAdmin.from('email_smtp_config').insert({ ...updateData, password: password || '' }).select().single();
    }

    if (result.error) throw result.error;
    res.json({ message: 'SMTP configuration saved successfully', data: { ...result.data, password: '••••••••' } });
  } catch (error: any) {
    console.error('Save SMTP Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/email/smtp/test — Send a test email
router.post('/email/smtp/test', requireSystemAdmin, async (req: Request, res: Response) => {
  const { target_email } = req.body;
  if (!target_email) return res.status(400).json({ message: 'target_email is required' });
  try {
    const result = await testSmtpConnection(target_email);
    if (!result.success) return res.status(400).json({ message: result.error });
    res.json({ message: `Test email sent successfully to ${target_email}`, messageId: result.messageId });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Email Templates ──────────────────────────────────────────────────────────

// GET /api/admin/email/templates — List all templates
router.get('/email/templates', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { audience } = req.query;
    let query = supabaseAdmin.from('email_templates').select('*').order('audience').order('name');
    if (audience && audience !== 'all') query = query.eq('audience', audience as string);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/email/templates/:id — Get single template
router.get('/email/templates/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin.from('email_templates').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/email/templates — Create new template
router.post('/email/templates', requireSystemAdmin, async (req: Request, res: Response) => {
  const { key, name, audience, subject, html_body, text_body, variables, is_active } = req.body;
  if (!key || !name || !audience) return res.status(400).json({ message: 'key, name, and audience are required' });
  try {
    const { data, error } = await supabaseAdmin.from('email_templates').insert({ key, name, audience, subject: subject || '', html_body: html_body || '', text_body: text_body || '', variables: variables || [], is_active: is_active !== false }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/email/templates/:id — Update template
router.put('/email/templates/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { name, audience, subject, html_body, text_body, variables, is_active } = req.body;
  try {
    const { data, error } = await supabaseAdmin.from('email_templates').update({ name, audience, subject, html_body, text_body, variables, is_active, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/email/templates/:id — Delete template
router.delete('/email/templates/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from('email_templates').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/email/templates/:id/preview — Render template preview with sample data
router.post('/email/templates/:id/preview', requireSystemAdmin, async (req: Request, res: Response) => {
  const { variables } = req.body;
  try {
    const { data: template, error } = await supabaseAdmin.from('email_templates').select('*').eq('id', req.params.id).single();
    if (error || !template) return res.status(404).json({ message: 'Template not found' });

    // Build sample variable values from the template's variable definitions
    const templateVars = template.variables as { name: string; example: string }[];
    const sampleData: Record<string, string> = {};
    if (templateVars && Array.isArray(templateVars)) {
      templateVars.forEach((v: any) => { sampleData[v.name] = v.example || `[${v.name}]`; });
    }
    // Merge with any custom variables from body
    const mergedVars = { ...sampleData, ...(variables || {}) };

    res.json({
      subject: renderTemplate(template.subject, mergedVars),
      html: renderTemplate(template.html_body, mergedVars),
      text: renderTemplate(template.text_body, mergedVars),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/email/send — Send email manually (with template or raw)
router.post('/email/send', requireSystemAdmin, async (req: Request, res: Response) => {
  const { to, template_key, variables, subject, html, text } = req.body;
  if (!to) return res.status(400).json({ message: 'to is required' });
  try {
    let result;
    if (template_key) {
      result = await sendTemplatedEmail({ to, templateKey: template_key, variables: variables || {} });
    } else {
      if (!subject || !html) return res.status(400).json({ message: 'subject and html are required for raw emails' });
      result = await sendEmail({ to, subject, html, text });
    }
    if (!result.success) return res.status(400).json({ message: result.error });
    res.json({ message: 'Email sent successfully', messageId: result.messageId });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Automation Rules ─────────────────────────────────────────────────────────

// GET /api/admin/email/rules — List automation rules
router.get('/email/rules', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_automation_rules')
      .select('*, email_templates(id, key, name, audience)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/email/rules — Create automation rule
router.post('/email/rules', requireSystemAdmin, async (req: Request, res: Response) => {
  const { name, trigger_event, audience, template_id, delay_hours, conditions, is_active, frequency } = req.body;
  if (!name || !trigger_event || !audience) return res.status(400).json({ message: 'name, trigger_event, and audience are required' });
  try {
    const { data, error } = await supabaseAdmin.from('email_automation_rules').insert({ name, trigger_event, audience, template_id: template_id || null, delay_hours: Number(delay_hours) || 0, conditions: conditions || {}, is_active: is_active !== false, frequency: frequency || 'once' }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/email/rules/:id — Update automation rule
router.put('/email/rules/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { name, trigger_event, audience, template_id, delay_hours, conditions, is_active, frequency } = req.body;
  try {
    const { data, error } = await supabaseAdmin.from('email_automation_rules').update({ name, trigger_event, audience, template_id: template_id || null, delay_hours: Number(delay_hours) || 0, conditions: conditions || {}, is_active, frequency: frequency || 'once', updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/admin/email/rules/:id/toggle — Toggle active status
router.patch('/email/rules/:id/toggle', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data: existing } = await supabaseAdmin.from('email_automation_rules').select('is_active').eq('id', req.params.id).single();
    const { data, error } = await supabaseAdmin.from('email_automation_rules').update({ is_active: !existing?.is_active, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/email/rules/:id — Delete automation rule
router.delete('/email/rules/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from('email_automation_rules').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/email/rules/:id/trigger — Trigger automation rule manually using automated logic
router.post('/email/rules/:id/trigger', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const { data: rule, error } = await supabaseAdmin
      .from('email_automation_rules')
      .select('*, email_templates(*)')
      .eq('id', req.params.id)
      .single();
      
    if (error || !rule) return res.status(404).json({ message: 'Rule not found' });
    if (!rule.email_templates) return res.status(400).json({ message: 'No template attached' });

    let targets: { email: string, variables: Record<string, string> }[] = [];

    // Simple automated logic evaluator based on event
    if (rule.trigger_event.includes('school_setup_incomplete')) {
      const { data: schools } = await supabaseAdmin.from('schools').select('*');
      const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('role', 'school_admin');
      
      schools?.forEach(school => {
        // Simplified setup logic check
        if (school.status === 'pending_setup' || !school.setup_completed_at) {
          const admins = profiles?.filter(p => p.school_id === school.id);
          const daysSince = Math.floor((Date.now() - new Date(school.created_at).getTime()) / (1000 * 60 * 60 * 24));
          
          const baseVariables = {
            school_name: school.name,
            days_since_registration: String(daysSince),
            setup_percentage: '45',
            remaining_steps: 'Add classes, Import students',
            admin_portal_url: 'https://app.muchiapp.com/admin',
            support_email: 'info@muchiapp.com'
          };

          admins?.forEach(admin => {
            if (admin.email) {
              targets.push({
                email: admin.email,
                variables: { ...baseVariables, admin_name: admin.full_name || 'Admin' }
              });
            }
          });

          // Also include IT support contact if available
          if (school.ict_email) {
            targets.push({
              email: school.ict_email,
              variables: { ...baseVariables, admin_name: school.ict_name || 'IT Support' }
            });
          }
        }
      });
    } else {
      // For now, if the logic isn't written for the specific event, just pretend we found no targets.
      // Or we can return an error.
      return res.status(400).json({ message: `Automated logic for trigger event '${rule.trigger_event}' is not implemented yet.` });
    }

    if (targets.length === 0) {
      return res.json({ message: 'No recipients matched the rule criteria.' });
    }

    let sent = 0;
    for (const target of targets) {
      try {
        await sendTemplatedEmail({
          to: target.email,
          templateKey: rule.email_templates.key,
          variables: target.variables,
          ruleId: rule.id
        });
        sent++;
      } catch (e) {
        console.error('Failed to send rule email:', e);
      }
    }

    await supabaseAdmin.from('email_automation_rules').update({ last_run_at: new Date().toISOString() }).eq('id', rule.id);

    res.json({ message: `Rule triggered! Sent emails to ${sent} recipient(s).` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ─── Email Logs ───────────────────────────────────────────────────────────────

// GET /api/admin/email/logs — Fetch email activity logs
router.get('/email/logs', requireSystemAdmin, async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const status = req.query.status as string;
  try {
    let query = supabaseAdmin.from('email_logs').select('*').order('sent_at', { ascending: false }).limit(limit);
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const adminRouter = router;
