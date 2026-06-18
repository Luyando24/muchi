import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import * as os from 'os';
import * as crypto from 'crypto';
import { SmsService } from '../services/smsService.js';
import { WhatsAppService } from '../services/whatsappService.js';
import { notifySystemAdmins } from '../services/emailService.js';
import { checkIncompleteSchoolOnboardings } from '../services/onboardingReminderService.js';
import { sendSchoolUsageSubscriptionReminders } from '../services/schoolReminderService.js';

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

    // Notify system admins asynchronously
    (async () => {
      try {
        await notifySystemAdmins(
          `[MUCHI Admin] New School Account Created - ${school.name}`,
          `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
              <h2>New School Created (Admin Action)</h2>
              <p><strong>School Name:</strong> ${school.name}</p>
              <p><strong>URL Slug:</strong> ${school.slug}</p>
              <p><strong>Subscription Plan:</strong> ${school.plan || 'Standard'}</p>
              <p><strong>Admin Contact:</strong> ${adminName} (${adminEmail})</p>
              <p><strong>Created By:</strong> ${(req as any).user?.email || 'System Admin'}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
          `,
          `New School Created (Admin Action)\n\nSchool Name: ${school.name}\nURL Slug: ${school.slug}\nSubscription Plan: ${school.plan || 'Standard'}\nAdmin Contact: ${adminName} (${adminEmail})\nCreated By: ${(req as any).user?.email || 'System Admin'}\nTime: ${new Date().toLocaleString()}`
        );
      } catch (err) {
        console.error("Failed to notify system admins about school creation:", err);
      }
    })();

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

    const nowDate = new Date();
    let totalRevenue = 0;
    let mrr = 0;
    let activeSubscriptionsCount = 0;

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
        const planNameLower = String(license.plan || '').toLowerCase();
        if (planNameLower.includes('trial') || planNameLower.includes('free')) {
          return;
        }

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

        const isActive = license.status === 'active' && endDate > nowDate;
        if (isActive) {
          let monthlyContribution = planInfo.price;
          if (planInfo.durationUnit === 'months' && planInfo.durationValue > 0) {
            monthlyContribution = planInfo.price / planInfo.durationValue;
          } else if (planInfo.durationUnit === 'days' && planInfo.durationValue > 0) {
            monthlyContribution = (planInfo.price / planInfo.durationValue) * 30;
          }
          mrr += monthlyContribution;
          activeSubscriptionsCount++;
        }
      });
    }

    // 3. Fetch auth users in pages to calculate usage stats and online users
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

    // 4. Online Users Calculation (query actual active sessions in the last 15 minutes)
    let onlineUsers = 1; // Default to at least the current system admin
    try {
      // Use the real-time web traffic active users count
      const { getActiveUsersCount } = await import('../lib/activeUsers.js');
      const realtimeCount = getActiveUsersCount(15 * 60 * 1000);
      
      // Fallback to recent logins if our memory tracker hasn't caught enough yet (e.g. server restart)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const activeRecent = allUsers.filter(u => {
        if (!u.last_sign_in_at) return false;
        return new Date(u.last_sign_in_at) >= fifteenMinutesAgo;
      });
      
      // Use the maximum of realtime web traffic, recent logins, or 1
      onlineUsers = Math.max(1, realtimeCount, activeRecent.length);
    } catch (err) {
      console.error('Error calculating online users:', err);
      // Fallback to a realistic count if calculation fails
      onlineUsers = Math.max(1, Math.min(usersCount || 0, Math.floor((usersCount || 0) * 0.12)));
    }

    // 5. Fetch school profile counts from the view to prevent the 1000-row PostgREST limit on profiles table
    const { data: profileCounts, error: profileCountsError } = await supabaseAdmin
      .from('school_profile_counts')
      .select('*');

    const schoolStudentCount: Record<string, number> = {};
    const schoolTeacherCount: Record<string, number> = {};

    if (profileCounts) {
      profileCounts.forEach((row: any) => {
        schoolStudentCount[row.school_id] = row.student_count || 0;
        schoolTeacherCount[row.school_id] = row.teacher_count || 0;
      });
    }

    // 6. Fetch 5 most recent schools (with licenses)
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

    // Fetch classes, subjects, and latest email log for onboarding reminder
    const [classesRes, subjectsRes, lastEmailLogRes] = await Promise.all([
      supabaseAdmin.from('classes').select('id, school_id'),
      supabaseAdmin.from('subjects').select('id, school_id'),
      supabaseAdmin
        .from('email_logs')
        .select('sent_at, recipient, status')
        .eq('template_key', 'onboarding_reminder')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    const classes = classesRes.data || [];
    const subjects = subjectsRes.data || [];
    const lastEmailLog = lastEmailLogRes.data || null;

    const schoolClassesCount: Record<string, number> = {};
    const schoolSubjectsCount: Record<string, number> = {};

    classes.forEach((c: any) => {
      schoolClassesCount[c.school_id] = (schoolClassesCount[c.school_id] || 0) + 1;
    });
    subjects.forEach((sub: any) => {
      schoolSubjectsCount[sub.school_id] = (schoolSubjectsCount[sub.school_id] || 0) + 1;
    });

    // Fetch all schools to map stats
    const { data: allSchools, error: allSchoolsErr } = await supabaseAdmin
      .from('schools')
      .select(`
        id, name, slug, plan, onboarding_status, created_at,
        school_type, academic_year, current_term, email, phone,
        province, district, logo_url, headteacher_name, signature_url,
        ict_name, ict_email, ict_phone, boarding_status, gender_composition
      `);

    let inactiveSchools: any[] = [];
    let topPerformingSchools: any[] = [];
    let schoolsWithStats: any[] = [];

    if (allSchools) {
      schoolsWithStats = allSchools.map((s: any) => {
        // Calculate profile completion percentage (matching onboardingReminderService)
        const fields = [
          "name", "school_type", "academic_year", "current_term", "email", "phone",
          "province", "district", "logo_url", "headteacher_name", "signature_url",
          "ict_name", "ict_email", "ict_phone", "boarding_status", "gender_composition"
        ];
        let filledCount = 0;
        fields.forEach(key => {
          const value = s[key];
          if (value && typeof value === 'string' && value.trim() !== '') {
            filledCount++;
          }
        });
        const profileCompletion = fields.length > 0 ? Math.round((filledCount / fields.length) * 100) : 100;

        const classesCount = schoolClassesCount[s.id] || 0;
        const subjectsCount = schoolSubjectsCount[s.id] || 0;
        
        // Onboarding is incomplete if profile progress < 90% OR classes < 5 OR subjects < 5
        const isOnboardingIncomplete = profileCompletion < 90 || classesCount < 5 || subjectsCount < 5;

        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          plan: s.plan || 'Free',
          onboarding_status: s.onboarding_status || 'Pending',
          created_at: s.created_at,
          student_count: schoolStudentCount[s.id] || 0,
          teacher_count: schoolTeacherCount[s.id] || 0,
          sign_ins_7d: schoolSignIns7d[s.id] || 0,
          sign_ins_30d: schoolSignIns30d[s.id] || 0,
          profile_completion: profileCompletion,
          classes_count: classesCount,
          subjects_count: subjectsCount,
          is_onboarding_incomplete: isOnboardingIncomplete
        };
      });

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
      summary: {
        totalRevenue,
        mrr,
        activeSubscriptions: activeSubscriptionsCount,
        arpu: activeSubscriptionsCount > 0 ? Math.round(mrr / activeSubscriptionsCount) : 0,
        totalSchools: schoolsCount || 0
      },
      recentSchools: recentSchoolsWithCounts || [],
      activities: sortedActivities,
      inactiveSchools,
      topPerformingSchools,
      schoolsWithStats,
      lastOnboardingReminder: lastEmailLog ? {
        sent_at: lastEmailLog.sent_at,
        recipient: lastEmailLog.recipient,
        status: lastEmailLog.status
      } : null
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

// POST /api/admin/communication/test-sms
router.post('/communication/test-sms', requireSystemAdmin, async (req: Request, res: Response) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ message: 'Missing "to" or "message" parameter' });
  }

  try {
    const result = await SmsService.sendSms(to, message);
    if (!result.success) {
      return res.status(400).json({ message: 'Failed to send test SMS', error: result.error });
    }
    res.json({ message: 'Test SMS sent successfully', data: result.data });
  } catch (error: any) {
    console.error('Test SMS Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/communication/test-whatsapp
router.post('/communication/test-whatsapp', requireSystemAdmin, async (req: Request, res: Response) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ message: 'Missing "to" or "message" parameter' });
  }

  try {
    const result = await WhatsAppService.sendWhatsApp(to, message);
    if (!result.success) {
      return res.status(400).json({ message: 'Failed to send test WhatsApp', error: result.error });
    }
    res.json({ message: 'Test WhatsApp message sent successfully', data: result.data });
  } catch (error: any) {
    console.error('Test WhatsApp Error:', error);
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
      const planNameLower = String(license.plan || '').toLowerCase();
      const isTrial = planNameLower.includes('trial') || planNameLower.includes('free');

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

      const totalCost = isTrial ? 0 : (planInfo.price * numberOfCycles);
      if (!isTrial) {
        totalRevenue += totalCost;
      }

      const isActive = license.status === 'active' && endDate > now;
      if (isActive && !isTrial) {
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

// POST /api/admin/finances/ai-insights
// Generates pricing, conversion and marketing strategic advice using Groq AI
router.post('/finances/ai-insights', requireSystemAdmin, async (req: Request, res: Response) => {
  const { summary, funnel, marketingSpend, cac, ltv, ltvToCacRatio, plans, schools } = req.body;

  const promptContent = `
    Analyze the following EdTech SaaS metrics for the MUCHI Platform:
    
    1. Financial Summary:
       - Lifetime Revenue: ZMW ${summary?.totalRevenue || 0}
       - Monthly Recurring Revenue (MRR): ZMW ${summary?.mrr || 0}
       - Average Revenue Per School (ARPU): ZMW ${summary?.arpu || 0}
       - Active Subscriptions: ${summary?.activeSubscriptions || 0}
       - Total Registered Schools: ${summary?.totalSchools || 0}
       
    2. CRM Leads Funnel:
       - New Leads: ${funnel?.New || 0}
       - Contacted: ${funnel?.Contacted || 0}
       - Demo Scheduled: ${funnel?.['Demo Scheduled'] || 0}
       - Negotiation: ${funnel?.Negotiation || 0}
       - Converted (Closed Won): ${funnel?.['Closed Won'] || 0}
       - Lost (Closed Lost): ${funnel?.['Closed Lost'] || 0}
       
    3. Unit Economics & Marketing Spend:
       - Total Marketing Spend (from Ledger): ZMW ${marketingSpend || 0}
       - Customer Acquisition Cost (CAC): ZMW ${cac || 0}
       - Estimated Customer Lifetime Value (LTV): ZMW ${ltv || 0}
       - LTV:CAC Ratio: ${ltvToCacRatio || 0}x
       
    4. Plan Distribution:
       ${JSON.stringify(plans || [])}
       
    5. Registered Schools Capacity, Onboarding & User Activity Details:
       ${JSON.stringify(schools || [])}

    6. Platform Fixed Monthly Operating Expenses:
       - Vercel Hosting: $20 (ZMW 520)
       - Supabase Database: $25 (ZMW 650)
       - AI Subscription: $25 (ZMW 650)
       - Internet Connection: ZMW 500
       - Bank Maintenance Fee: ZMW 100
       - Salaries: ZMW 0
       - Total Fixed Overheads: ZMW 2,420 monthly (assuming 1 USD = 26 ZMW conversion rate).
       
    Please generate a professional, highly strategic SaaS growth and revenue expansion report in markdown format. 
    Your analysis and recommendations must be strictly focused on **maximizing revenue generation, up-selling, and adopting/retaining accounts**:
    - **Fixed Operating Expenses & Break-Even Analysis:** Compare the current MRR with the total fixed overheads (ZMW 2,420/month) and variable spends. Provide recommendations on how many schools are needed to break even, and suggest strategies to reach profitability.
    - **Pricing Optimization & Up-selling:** Are we underpricing? How can we package tiers better? (Suggest termly/yearly pricing strategies, and student capacity scaling). Point out any specific schools from the capacity details list that should be upgraded to Premium (Standard plan limit is 500 students, Premium is 1000) to capture expansion revenue.
    - **Expansion Revenue (Upsell Add-ons):** Identify highly active schools (high logins and student count) that are prime candidates for pitching add-on modules (e.g., Tuckshop Management, Feeding Program modules) to increase overall ARPU.
    - **Churn Prevention (Revenue Protection):** Identify paying schools with high student counts but 0 or low user activity (7-day logins) that present high churn risk, and suggest intervention.
    - **Onboarding Speed-to-Revenue:** Highlight schools whose setup progress is stalled (low profile checklist completion, few class uploads) and provide strategies to onboard them faster to realize contract value.
    - **Marketing & Funnel Strategy:** How can we optimize the sales funnel? If CAC is high or LTV:CAC is low, how do we fix it? If we have organic growth (CAC = 0), how should we start scaling marketing?
    
    Use bold headers, lists, and bullet points. Make it actionable, direct, and concise. No conversational fluff or introductions.
  `;

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_groq_api_key_here') {
    // Generate simulated response
    const winRate = funnel ? Math.round(((funnel['Closed Won'] || 0) / ((Object.values(funnel) as number[]).reduce((a: number, b: number) => a + b, 0) || 1)) * 100) : 0;
    const totalLeads = funnel ? (Object.values(funnel) as number[]).reduce((a: number, b: number) => a + b, 0) : 0;
    
    const mrr = summary?.mrr || 0;
    const netProfit = mrr - 2420;
    const schoolsNeeded = Math.ceil(2420 / (summary?.arpu || 500));

    let capacityAlerts = "";
    let expansionAlerts = "";
    let churnAlerts = "";
    let onboardingAlerts = "";

    if (schools && Array.isArray(schools)) {
      const standardLimit = 500;
      const premiumLimit = 1000;
      
      // 1. Capacity Up-sell alerts
      const schoolsNearingCapacity = schools.filter((s: any) => {
        const planName = String(s.plan || '').toLowerCase();
        const students = Number(s.students || 0);
        if (planName === 'standard' || planName === 'free') {
          return students >= standardLimit * 0.8;
        } else if (planName === 'premium') {
          return students >= premiumLimit * 0.8;
        }
        return false;
      });

      if (schoolsNearingCapacity.length > 0) {
        capacityAlerts = `\n  • **Immediate Up-sell & Tier Upgrades:**\n` + 
          schoolsNearingCapacity.map((s: any) => {
            const planName = String(s.plan || '');
            const limit = planName.toLowerCase() === 'standard' ? standardLimit : premiumLimit;
            return `    - **${s.name}** has **${s.students}** students on the **${planName}** plan (${Math.round((s.students/limit)*100)}% limit). Up-sell to Premium immediately.`;
          }).join('\n');
      }

      // 2. Expansion revenue alerts
      const highUsageSchools = schools.filter((s: any) => {
        const active30d = Number(s.active30d || 0);
        const planName = String(s.plan || '').toLowerCase();
        return active30d > 30 && planName !== 'free';
      });

      if (highUsageSchools.length > 0) {
        expansionAlerts = `\n  • **Expansion Revenue Opportunities (Pitch Add-on Modules):**\n` +
          highUsageSchools.map((s: any) => {
            return `    - **${s.name}** has high adopter activity (**${s.active30d}** active users/30d). Target them to purchase the **Tuckshop Management** or **Feeding Program** add-on modules to drive expansion ARPU.`;
          }).join('\n');
      }

      // 3. Churn alerts
      const churnRiskSchools = schools.filter((s: any) => {
        const active7d = Number(s.active7d || 0);
        const students = Number(s.students || 0);
        const planName = String(s.plan || '').toLowerCase();
        return active7d === 0 && students > 0 && planName !== 'free';
      });

      if (churnRiskSchools.length > 0) {
        churnAlerts = `\n  • **Subscription Churn Risk Alerts (Revenue Protection):**\n` +
          churnRiskSchools.map((s: any) => {
            return `    - **${s.name}** is on the paying **${s.plan}** plan with **${s.students}** students, but has **0** active users in the last 7 days. High churn risk! Initiate immediate customer success intervention.`;
          }).join('\n');
      }

      // 4. Onboarding adoption alerts
      const stuckOnboarding = schools.filter((s: any) => {
        const status = String(s.onboarding_status || '').toLowerCase();
        const progress = Number(s.profile_completion || 0);
        const classes = Number(s.classes_count || 0);
        return (status === 'pending' || status === 'onboarding' || progress < 90 || classes < 5);
      });

      if (stuckOnboarding.length > 0) {
        onboardingAlerts = `\n  • **Onboarding Adoptions (Time-to-Revenue):**\n` +
          stuckOnboarding.map((s: any) => {
            return `    - **${s.name}** setup progress is stalled (**${s.profile_completion || 0}%** profile, **${s.classes_count || 0}** class uploads). Action: Support team should contact their ICT lead to finalize setup and unlock contract value.`;
          }).join('\n');
      }
    }

    const simulatedResponse = `### ⚠️ Groq AI API Key Not Configured
To enable live, dynamic AI analytics powered by Llama 3 on Groq, please set your \`GROQ_API_KEY\` in your \`.env\` file.

Below is an automated, revenue-focused business intelligence analysis based on your current metrics, school onboarding progress, and user logins:

---

### 1. Funnel & Sales Pipeline Assessment
* **Pipeline Health:** Total of **${totalLeads}** leads recorded in the CRM.
* **Lead Conversion (Win Rate):** **${winRate}%** of prospects successfully converted to paying customers.
* **Strategic Revenue Insights:**
  ${winRate < 15 
    ? `• **Funnel Bottleneck:** Your win rate of **${winRate}%** is below the SaaS target of 15-20%. This represents lost revenue. Consider doing standard follow-up surveys for lost leads to identify objections (e.g., pricing vs. usability) and address friction in school demonstrations.` 
    : `• **Strong Funnel Conversion:** Your win rate of **${winRate}%** is excellent. This shows high product-market fit. Focus marketing efforts on filling the top of the funnel to scale conversions.`
  }
  • **Leads Volume:** With **${funnel?.New || 0}** new leads and **${funnel?.Contacted || 0}** contacted, accelerate sales outreach to shorten the sales cycle and generate faster subscription bookings.

### 2. Marketing Efficiency & Unit Economics (CAC / LTV)
* **Customer Acquisition Cost (CAC):** ZMW ${cac ? Number(cac).toFixed(2) : '0.00'}
* **Customer Lifetime Value (LTV):** ZMW ${ltv ? Number(ltv).toFixed(2) : '0.00'}
* **LTV:CAC Efficiency Ratio:** **${ltvToCacRatio ? Number(ltvToCacRatio).toFixed(1) : '0.0'}x**
* **Strategic Revenue Guidance:**
  ${cac === 0 
    ? `• **Pure Organic Growth:** Your CAC is currently ZMW 0.00. While highly cost-efficient, relying solely on organic sign-ups limits scale. You should allocate a trial budget (e.g., ZMW 2,000/month) to paid channels (local search ads, Facebook campaigns targeting private school directors) to see if you can accelerate high-value sales bookings.`
    : ltvToCacRatio && ltvToCacRatio < 3 
      ? `• **Inefficient Unit Economics (Ratio < 3x):** You are spending ZMW ${Number(cac).toFixed(2)} to acquire a school, which is too high relative to its lifetime value. Focus on increasing subscription prices, reducing churn, and targeting higher-value private schools rather than smaller primary schools.`
      : `• **Highly Scalable Unit Economics (Ratio: ${ltvToCacRatio ? Number(ltvToCacRatio).toFixed(1) : '0.0'}x):** Your customer lifetime value is significantly higher than acquisition costs. You have a green light to scale up marketing spend on high-performing channels to accelerate market capture.`
  }

### 3. Fixed Operating Expenses & Break-Even Analysis
* **Fixed Monthly Overhead:** **ZMW 2,420.00**
  - Vercel Hosting: ZMW 520 ($20.00)
  - Supabase Database: ZMW 650 ($25.00)
  - AI Subscription: ZMW 650 ($25.00)
  - Internet Connection: ZMW 500
  - Bank Maintenance Fee: ZMW 100
  - Salaries: ZMW 0.00 (None allocated yet)
* **Operating Position:** ${netProfit >= 0 ? `🟢 **ZMW ${netProfit.toFixed(2)} Profit**` : `🔴 **ZMW ${Math.abs(netProfit).toFixed(2)} Deficit (Burn)**`}
* **Break-Even Target:** You need at least **${schoolsNeeded}** active paying schools (at ARPU ZMW ${summary?.arpu || 500}) to cover fixed overheads. Migrating accounts to Termly or Yearly billing is highly recommended to secure upfront cash flow.

### 4. Monetization, Up-sell & Expansion Action Plan
* **Average Revenue Per School (ARPU):** ZMW ${summary?.arpu ? Number(summary.arpu).toFixed(2) : '0.00'}
* **Plan Popularity:** Your active tiers distribution shows where revenue is concentrated.
* **Pricing & Up-sell Action Plan:**
  1. **Upfront Billing:** Migrate schools from monthly billing to **Termly** (3 cycles per year) or **Yearly** billing. Offer a 10-15% discount for yearly plans. This locks in revenue, reduces churn, and provides upfront cash flow to cover your CAC.
  2. **Student Capacity Limits:** Strictly enforce plan student limits.${capacityAlerts || '\n  • No schools are currently approaching plan capacity limits.'}
  3. **Module Expansion:** Pitch tuckshop or feeding program add-ons to active accounts.${expansionAlerts || '\n  • No schools currently meet the active usage criteria for module expansion pitches.'}
  4. **Revenue Protection (Churn Mitigation):** Follow up with silent paying schools to prevent cancellations.${churnAlerts || '\n  • No paying schools are currently flagged as inactive.'}
  5. **Adopt-to-Revenue Onboarding:** Support stuck schools to realize setup completions.${onboardingAlerts || '\n  • No schools are currently stuck in the onboarding process.'}
`;
    return res.json({ insights: simulatedResponse, model: 'simulated' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a senior SaaS business intelligence analyst and strategic growth consultant specialized in EdTech platforms. Analyze the provided conversion, pricing, onboarding, and marketing metrics and output a detailed, professional report with executive strategic recommendations. Keep it concise, action-oriented, and write in Markdown. Do not include introductory conversational fluff. Suggest pricing and marketing strategy changes focused heavily on up-selling, module expansion, churn mitigation, and overall revenue generation.'
          },
          {
            role: 'user',
            content: promptContent
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const insights = result.choices?.[0]?.message?.content || 'No insights returned.';
    res.json({ insights, model: 'llama-3.3-70b-versatile' });
  } catch (error: any) {
    console.error('Error fetching Groq insights:', error);
    res.status(500).json({ message: 'Failed to generate AI insights: ' + error.message });
  }
});

// POST /api/admin/finances/ai-chat
// Conversational business analytics advisor powered by Groq AI
router.post('/finances/ai-chat', requireSystemAdmin, async (req: Request, res: Response) => {
  const { messages, model, context } = req.body;
  const selectedModel = model || 'llama-3.3-70b-versatile';

  // 1. Fetch active subscription plans from database
  let plansList = [
    { name: 'Free Trial', price: 0, billing_cycle: 'custom', description: 'All features valid for 2 months' },
    { name: 'Starter', price: 1000, billing_cycle: 'termly', description: 'Valid for 1 term' },
    { name: 'Pro (2 terms)', price: 2000, billing_cycle: 'custom', description: 'Valid for 2 terms' },
    { name: 'Premium', price: 3000, billing_cycle: 'yearly', description: 'Valid for 1 year (3 terms)' }
  ];

  try {
    const { data: dbPlans } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (dbPlans && dbPlans.length > 0) {
      plansList = dbPlans.map((p: any) => ({
        name: p.name,
        price: Number(p.price) || 0,
        billing_cycle: p.billing_cycle || 'custom',
        description: p.description || ''
      }));
    }
  } catch (err) {
    console.error('[AI Chat] Failed to fetch subscription plans from database:', err);
  }

  const pricingPlansStr = plansList.map(p => 
    `- **${p.name}**: ${p.description || ''} | Price: ZMW ${p.price.toLocaleString()} | Cycle: ${p.billing_cycle}`
  ).join('\n');

  const systemInstructions = `
    You are the MUCHI Platform Business Advisor Chat Assistant. You are a senior SaaS business consultant helping system administrators optimize their EdTech platform for revenue generation, school adoption, and pricing tiers.
    
    Platform Parameters:
    - Active users are teachers and students adopting the system.
    
    Active Pricing Plans (from Database):
    ${pricingPlansStr}
    
    Platform Fixed Monthly Operating Expenses:
    - Vercel Hosting: $20 (ZMW 520)
    - Supabase Database: $25 (ZMW 650)
    - AI Subscription: $25 (ZMW 650)
    - Internet: ZMW 500
    - Bank Account Fee: ZMW 100
    - Salaries: ZMW 0 (none yet)
    - TOTAL FIXED OVERHEADS: ZMW 2,420 monthly (assuming 1 USD = 26 ZMW conversion rate).
    
    Live Business Statistics:
    - Lifetime Revenue: ZMW ${context?.summary?.totalRevenue || 0}
    - MRR (Monthly Recurring Revenue): ZMW ${context?.summary?.mrr || 0}
    - ARPU (Average Revenue per School): ZMW ${context?.summary?.arpu || 0}
    - Active Subscriptions: ${context?.summary?.activeSubscriptions || 0}
    - Total Marketing Spend: ZMW ${context?.marketingSpend || 0}
    - Customer Acquisition Cost (CAC): ZMW ${context?.cac || 0}
    - Customer Lifetime Value (LTV): ZMW ${context?.ltv || 0}
    - LTV:CAC Ratio: ${context?.ltvToCacRatio || 0}x
    - Leads in Funnel: ${JSON.stringify(context?.funnel || {})}
    
    Registered Schools & Setup Progress:
    ${JSON.stringify(context?.schools || [])}
    
    Your objectives are to:
    1. Focus heavily on **maximizing revenue generation** and adopting/retaining accounts.
    2. Suggest **up-selling opportunities** (identify schools on Free Trial or lower tiers and recommend moving them to higher-value plans like Starter, Pro, or Premium).
    3. Identify **expansion revenue opportunities** (recommend highly active schools, e.g. >30 logins/30d, to pitch premium add-on modules like Tuckshop Management or Feeding Program modules to increase ARPU).
    4. Warn of **churn risks** (flag paying schools with 0 recent logins in the last 7 days and suggest customer success outreach to protect recurring revenue).
    5. Audit **onboarding progress** (point out schools stuck with incomplete setup, e.g. <90% profile progress or <5 class uploads, and give tips to onboard them faster to start realizing contract value).
    6. Advise on **pricing plans & billing models** (recommending migrating from monthly to term-based or year-based invoicing to lock in cash and offset our fixed expenses).
    
    Respond in markdown. Keep your responses conversational, concise, professional, and action-oriented. Feel free to draft direct email/pitch templates for administrators.
  `;

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_groq_api_key_here') {
    // Generate intelligent simulated response based on user message content
    const lastUserMsg = messages && messages.length > 0 
      ? messages[messages.length - 1].content.toLowerCase() 
      : '';

    let responseText = '';

    if (lastUserMsg.includes('burn') || lastUserMsg.includes('expense') || lastUserMsg.includes('cost') || lastUserMsg.includes('break-even') || lastUserMsg.includes('break even') || lastUserMsg.includes('vercel') || lastUserMsg.includes('supabase') || lastUserMsg.includes('internet')) {
      const mrr = context?.summary?.mrr || 0;
      const netProfit = mrr - 2420;
      const avgPrice = plansList.reduce((sum, p) => sum + p.price, 0) / plansList.length;
      const schoolsNeeded = Math.ceil(2420 / (context?.summary?.arpu || avgPrice || 1000));
      
      responseText = `### 💰 Monthly Operating Expenses & Break-Even Analysis

Here is a detailed breakdown of your current fixed operating expenses:
* **Vercel Hosting:** ZMW 520 ($20.00)
* **Supabase Database:** ZMW 650 ($25.00)
* **AI Subscription:** ZMW 650 ($25.00)
* **Internet Connection:** ZMW 500
* **Bank Maintenance Fee:** ZMW 100
* **Salaries:** ZMW 0.00 (None allocated yet)
* **TOTAL FIXED OVERHEADS:** **ZMW 2,420.00 / month** (at ZMW 26 / USD rate)

**Current Status:**
* **MRR:** ZMW ${mrr.toFixed(2)}
* **Net Operating Position:** ${netProfit >= 0 ? `🟢 **ZMW ${netProfit.toFixed(2)} Profit**` : `🔴 **ZMW ${Math.abs(netProfit).toFixed(2)} Deficit (Burn)**`}

**Path to Profitability:**
1. **Break-Even Target:** At an Average Revenue Per School (ARPU) of **ZMW ${context?.summary?.arpu || avgPrice || 1000}**, you need at least **${schoolsNeeded}** active paying schools to cover your fixed costs.
2. **Billing Invoicing:** We recommend moving schools to **Termly** or **Yearly** plans. This provides immediate cash flow to cover hosting/database overheads upfront.
3. **Variable Travel Expenses:** Minimize physical travel by shifting demos and ICT setup training to virtual sessions to reduce travel burn.`;
    } else if (lastUserMsg.includes('upsell') || lastUserMsg.includes('up-sell') || lastUserMsg.includes('upgrade') || lastUserMsg.includes('capacity') || lastUserMsg.includes('limit') || lastUserMsg.includes('standard') || lastUserMsg.includes('premium') || lastUserMsg.includes('starter') || lastUserMsg.includes('pro') || lastUserMsg.includes('free') || lastUserMsg.includes('trial')) {
      const schools = context?.schools || [];
      const trialOrStarterSchools = schools.filter((s: any) => {
        const planName = String(s.plan || '').toLowerCase();
        return planName.includes('free') || planName.includes('trial') || planName.includes('starter');
      });

      let recommendationsList = '';
      if (trialOrStarterSchools.length > 0) {
        recommendationsList = trialOrStarterSchools.map((s: any) => {
          const currentPlan = s.plan || 'Free Trial';
          const nextPlan = currentPlan.toLowerCase().includes('free') ? 'Starter (ZMW 1,000/term)' : 'Premium (ZMW 3,000/year)';
          return `* **${s.name}** (Current Plan: *${currentPlan}*): **${s.students}** registered students. Recommend upgrading them to **${nextPlan}**.`;
        }).join('\n');
      } else {
        recommendationsList = `* No schools are currently on Free Trial or Starter plans. All active clients are on Pro or Premium tiers!`;
      }

      responseText = `### 📈 Up-selling & Subscription Upgrades Strategy
      
To maximize platform revenue, we should actively migrate schools from free trials and starter plans to higher value tiers:

**Current Database Pricing Plans:**
${pricingPlansStr}

**Upgrade Recommendations & Target Candidates:**
${recommendationsList}

**Suggested Actions:**
1. **Target Trial Expiry:** Reach out to schools on *Free Trial* nearing the 2-month expiry. Focus on *${trialOrStarterSchools[0]?.name || 'Zamara Christian Academy'}* and pitch the *Starter* or *Premium* plan.
2. **Value-Based Pitch Email Template:**
   \`\`\`
   Subject: Upgrade to MUCHI Premium - Transitioning from Free Trial
   
   Dear School Administrator,
   
   We hope you have enjoyed your MUCHI free trial over the last few weeks.
   
   To maintain access to teacher gradebooks and student report card generation for the next term, we recommend upgrading to our Starter Plan (ZMW 1,000/term) or our Premium Plan (ZMW 3,000/year, which offers full-year coverage).
   
   Please let us know if we can assist you with setting up your termly invoice.
   \`\`\`
`;
    } else if (lastUserMsg.includes('expansion') || lastUserMsg.includes('module') || lastUserMsg.includes('tuckshop') || lastUserMsg.includes('feeding') || lastUserMsg.includes('active')) {
      responseText = `### ➕ Expansion Revenue (Premium Add-ons)

Highly active schools that are fully adopted represent major opportunities for expansion revenue. We can cross-sell them modular add-ons:
1. **Tuckshop Module:** A point-of-sale and inventory management module for school tuckshops.
2. **Feeding Program Module:** An inventory/menu management module for boarding schools.

**Target Candidates:**
* Look for schools with **>30 logins** in the last 30 days (fully adopted).
* Pitch these add-ons for an additional **ZMW 150 - 250 / month** on top of their base subscription.

**Suggested Pitch Action:**
Identify the school admin or treasurer of your most active schools. Send them a screen demo of the tuckshop inventory system. Highlight how it eliminates cash handling losses and reports exact daily sales.`;
    } else if (lastUserMsg.includes('churn') || lastUserMsg.includes('risk') || lastUserMsg.includes('inactive') || lastUserMsg.includes('login')) {
      const schools = context?.schools || [];
      const inactivePaying = schools.filter((s: any) => Number(s.active7d || 0) === 0 && String(s.plan || '').toLowerCase() !== 'free');

      responseText = `### 🚨 Subscription Churn Risks & Revenue Protection

We must actively protect existing MRR by checking school logins:
${inactivePaying.length > 0 
  ? `Here are paying schools with **0 active users** in the last 7 days:
${inactivePaying.map((s: any) => `* **${s.name}** (${s.plan} Plan, **${s.students}** students) - 0 active users.`).join('\n')}

**Retention Recommendations:**
1. **Customer Success Call:** Call their Headteacher or ICT contact immediately. Ask if they need refresher training or if they encountered problems starting the term.
2. **Adopt Audit:** Check if their profile settings checklist is finalized. If not, adoption is stalled at the entry point.`
  : `* **No Churn Risks Flagged:** All paying schools have recorded user activity in the last 7 days! Keep up the adoption monitoring.`
}`;
    } else {
      const userQuestion = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
      responseText = `### 🤖 Business Growth Advisor Insights
       
Thank you for your question: *"${userQuestion}"*. 

As your growth advisor, I have analyzed your SaaS platform parameters:
* **Active Subscriptions:** ${context?.summary?.activeSubscriptions || 0} paying schools.
* **Monthly Fixed Costs:** ZMW 2,420 (including Vercel hosting, Supabase DB, AI APIs, internet, and bank fees).
* **Current MRR:** ZMW ${(context?.summary?.mrr || 0).toFixed(2)}.

**Active Platform Subscription Tiers:**
${pricingPlansStr}

**Actionable growth recommendations for MUCHI:**
1. **Enforce Tier Migration:** Transition schools currently on *Free Trial* to *Starter* or *Premium* plans.
2. **Modular Expansion:** Cross-sell POS Tuckshop and Feeding modules to adopted schools to boost ARPU.
3. **Upfront Invoicing:** Lock in cash flows using Termly or Annual upfront invoices.

Let me know if you would like me to draft an email template, look into capacity metrics, or outline a customer success plan for any specific school!`;
    }

    return res.json({ insights: responseText, model: 'simulated' });
  }

  try {
    const messagesToSend = [
      { role: 'system', content: systemInstructions },
      ...messages
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messagesToSend,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const insights = result.choices?.[0]?.message?.content || 'No advisor response returned.';
    res.json({ insights, model: selectedModel });
  } catch (error: any) {
    console.error('Error fetching Groq advisor chat:', error);
    res.status(500).json({ message: 'Failed to chat with AI advisor: ' + error.message });
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
    if (!config) return res.json({ host: '', port: 587, secure: false, username: '', password: '', from_name: 'MUCHI', from_email: '', is_active: false, notification_emails: '' });
    // Mask password
    res.json({ ...config, password: config.password ? '••••••••' : '' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/email/smtp — Save SMTP config
router.put('/email/smtp', requireSystemAdmin, async (req: Request, res: Response) => {
  const { host, port, secure, username, password, from_name, from_email, is_active, notification_emails } = req.body;
  try {
    // Build update object — only update password if a real value provided (not masked placeholder)
    const updateData: any = { 
      host, 
      port: Number(port), 
      secure: Boolean(secure), 
      username, 
      from_name, 
      from_email, 
      is_active: Boolean(is_active), 
      notification_emails: notification_emails || '',
      updated_at: new Date().toISOString() 
    };
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
    } else if (rule.trigger_event.includes('school_usage_subscription_reminder')) {
      await sendSchoolUsageSubscriptionReminders(rule.id);
      return res.json({ message: 'School usage & subscription reminders triggered successfully.' });
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
// GET /api/admin/cron/onboarding-reminders — Cron job to trigger bi-weekly notifications
router.get('/cron/onboarding-reminders', async (req: Request, res: Response) => {
  // Security check: Verify Vercel Cron Secret in production
  const authHeader = req.headers.authorization;
  if (process.env.VERCEL && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized: Invalid cron secret' });
  }

  try {
    console.log('[Cron] Onboarding reminders cron triggered');
    await checkIncompleteSchoolOnboardings();
    res.json({ success: true, message: 'Onboarding reminder check executed successfully.' });
  } catch (error: any) {
    console.error('[Cron] Onboarding reminders cron failed:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/cron/school-reminders — Cron job to trigger weekly usage & subscription notifications
router.get('/cron/school-reminders', async (req: Request, res: Response) => {
  // Security check: Verify Vercel Cron Secret in production
  const authHeader = req.headers.authorization;
  if (process.env.VERCEL && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized: Invalid cron secret' });
  }

  try {
    console.log('[Cron] Weekly school usage & subscription reminders cron triggered');
    await sendSchoolUsageSubscriptionReminders();
    res.json({ success: true, message: 'Weekly school usage & subscription reminders executed successfully.' });
  } catch (error: any) {
    console.error('[Cron] Weekly school usage & subscription reminders cron failed:', error);
    res.status(500).json({ message: error.message });
  }
});

export const adminRouter = router;
