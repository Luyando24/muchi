import { Router, Request, Response } from 'express';
import { School } from '../../shared/api.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// GET /api/schools
router.get('/', async (req: Request, res: Response<School[]>) => {
  try {
    const { data: schools, error } = await supabaseAdmin
      .from('schools')
      .select('*')
      .eq('status', 'Active'); // Only active schools for public list

    if (error) throw error;

    res.json(schools || []);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json([]);
  }
});

// GET /api/schools/:id
router.get('/:id', async (req: Request, res: Response<School | { message: string }>) => {
  try {
    const { data: school, error } = await supabaseAdmin
      .from('schools')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST /api/schools/register
// Public endpoint for a school to self-register
router.post('/register', async (req: Request, res: Response) => {
  const { 
    schoolName, 
    schoolSlug, 
    schoolType,
    address,
    contactEmail,
    adminName, 
    adminEmail, 
    adminPassword 
  } = req.body;

  if (!schoolName || !schoolSlug || !adminEmail || !adminPassword || !adminName) {
    return res.status(400).json({ message: 'Missing required fields for registration' });
  }

  try {
    // 1. Check if school slug or email already exists
    const { data: existingSchool } = await supabaseAdmin
      .from('schools')
      .select('id')
      .eq('slug', schoolSlug)
      .maybeSingle();

    if (existingSchool) {
      return res.status(400).json({ message: 'A school with this URL slug already exists.' });
    }

    // 2. Create the School record
    const { data: school, error: schoolError } = await supabaseAdmin
      .from('schools')
      .insert({
        name: schoolName,
        slug: schoolSlug,
        school_type: schoolType || 'Secondary',
        address: address,
        contact_email: contactEmail || adminEmail,
        status: 'Pending' // Self-registered schools might need approval
      })
      .select()
      .single();

    if (schoolError) throw schoolError;

    // 3. Create the School Admin User in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: 'school_admin',
        school_id: school.id
      }
    });

    if (authError) {
      // Rollback school creation if user creation fails
      await supabaseAdmin.from('schools').delete().eq('id', school.id);
      return res.status(400).json({ message: authError.message });
    }

    // Note: The public.profiles record is handled by the DB trigger on_auth_user_created

    // 4. Create an initial "Standard" license for the school
    const { error: licenseError } = await supabaseAdmin
      .from('school_licenses')
      .insert({
        school_id: school.id,
        plan: 'Standard',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 day trial
      });

    if (licenseError) {
      console.error('Trial license creation failed:', licenseError);
      // We don't fail the whole registration for this, but log it
    }

    res.status(201).json({
      message: 'School registration successful! You can now log in to your admin portal.',
      schoolId: school.id
    });

  } catch (error: any) {
    console.error('School Self-Registration Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

export const schoolRouter = router;
