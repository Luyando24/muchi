import { Router, Request, Response } from 'express';
import { School } from '../../shared/api.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// GET /api/schools/metadata/types
router.get('/metadata/types', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('school_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching school types:', error);
    res.status(500).json([]);
  }
});

// GET /api/schools/metadata/categories
router.get('/metadata/categories', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('school_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json([]);
  }
});

// GET /api/schools/metadata/countries
router.get('/metadata/countries', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    // Move 'Zambia' to the top of the list
    const sortedData = data?.sort((a, b) => {
      if (a.name === 'Zambia') return -1;
      if (b.name === 'Zambia') return 1;
      return a.name.localeCompare(b.name);
    });
    res.json(sortedData || []);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json([]);
  }
});

// GET /api/schools/metadata/plans
router.get('/metadata/plans', async (req: Request, res: Response) => {
  const { country_id } = req.query;
  try {
    let query = supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true);

    if (country_id) {
      // Filter for plans that are either GLOBAL (country_ids is empty or null)
      // OR specifically include the requested country_id
      query = query.or(`country_ids.is.null,country_ids.cs.{"${country_id}"}`);
    }

    const { data, error } = await query.order('price', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json([]);
  }
});

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

function toSchoolNameProperCase(str: string): string {
  if (!str) return '';
  const lowercaseWords = ["and", "or", "but", "a", "an", "the", "in", "on", "of", "for", "with", "to", "at", "by", "from"];
  const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index > 0 && lowercaseWords.includes(word)) {
        return word;
      }
      if (romanNumerals.includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// GET /api/schools/top-onboarded
router.get('/top-onboarded', async (req: Request, res: Response) => {
  try {
    const [schoolsRes, countsRes] = await Promise.all([
      supabaseAdmin
        .from('schools')
        .select('id, name, district, province, country, onboarding_status')
        .eq('status', 'Active'),
      supabaseAdmin
        .from('school_profile_counts')
        .select('*')
    ]);

    if (schoolsRes.error) throw schoolsRes.error;
    if (countsRes.error) throw countsRes.error;

    const schoolTeacherCounts: Record<string, number> = {};
    const schoolStudentCounts: Record<string, number> = {};

    if (countsRes.data) {
      countsRes.data.forEach((row: any) => {
        schoolTeacherCounts[row.school_id] = row.teacher_count || 0;
        schoolStudentCounts[row.school_id] = row.student_count || 0;
      });
    }

    const schoolsWithCounts = (schoolsRes.data || []).map((s: any) => ({
      ...s,
      teacher_count: schoolTeacherCounts[s.id] || 0,
      student_count: schoolStudentCounts[s.id] || 0
    }));
    
    // Process and filter onboarded schools
    const onboarded = schoolsWithCounts.filter((s: any) => {
      const tc = s.teacher_count;
      const sc = s.student_count;
      return s.onboarding_status === 'Active & Onboarded' || (tc > 20 && sc > 500);
    });
    
    // Shuffle
    const shuffled = onboarded.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2).map((s: any) => {
      let initials = 'SC';
      if (s.name) {
        const parts = s.name.split(' ').filter(Boolean);
        initials = parts.length > 1 
          ? (parts[0][0] + parts[1][0]).toUpperCase() 
          : s.name.substring(0, 2).toUpperCase();
      }
      return {
        name: toSchoolNameProperCase(s.name),
        location: s.district || s.province || s.country || 'Zambia',
        initials
      };
    });
    
    // fallback if not enough
    if (selected.length < 2) {
       if (!selected.find(s => s.name === 'St. Augustine Academy')) {
         selected.push({ name: 'St. Augustine Academy', location: 'Lusaka', initials: 'SA' });
       }
       if (selected.length < 2 && !selected.find(s => s.name === "Green Leaf Int'l")) {
         selected.push({ name: "Green Leaf Int'l", location: 'Ndola', initials: 'GL' });
       }
    }
    
    res.json(selected.slice(0, 2));
  } catch (error) {
    console.error('Error fetching top onboarded schools:', error);
    res.json([
      { name: 'St. Augustine Academy', location: 'Lusaka', initials: 'SA' }, 
      { name: "Green Leaf Int'l", location: 'Ndola', initials: 'GL' }
    ]);
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
    province,
    district,
    phone,
    website,
    contactEmail,
    adminName, 
    adminEmail, 
    adminPassword,
    location_type, // 'Urban' | 'Rural'
    licenseCode // Optional pre-paid activation code
  } = req.body;

  if (!schoolName || !schoolSlug || !adminEmail || !adminPassword || !adminName) {
    return res.status(400).json({ message: 'Missing required fields for registration' });
  }

  try {
    // 1. Validate License Code if provided
    let planToUse = req.body.plan || 'Standard';
    let validatedCodeId = null;

    if (licenseCode) {
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('license_codes')
        .select('*')
        .eq('code', licenseCode.toUpperCase())
        .eq('is_used', false)
        .maybeSingle();

      if (codeError || !codeData) {
        return res.status(400).json({ message: 'Invalid or already used license code.' });
      }
      
      planToUse = codeData.plan_name;
      validatedCodeId = codeData.id;
    }

    // 2. Check if school slug already exists
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
        province: province,
        district: district,
        phone: phone,
        website: website,
        contact_email: contactEmail || adminEmail,
        plan: planToUse,
        category: req.body.category,
        country: req.body.country || 'Zambia',
        location_type: location_type || 'Urban',
        status: 'Pending' // Requires System Admin Approval
      })
      .select()
      .single();

    if (schoolError) throw schoolError;

    // 4. Mark license code as used if valid
    if (validatedCodeId) {
      await supabaseAdmin
        .from('license_codes')
        .update({
          is_used: true,
          redeemed_at: new Date().toISOString(),
          school_id: school.id
        })
        .eq('id', validatedCodeId);
    }

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

    // --- MANUAL PROFILE CREATION (Fallback for trigger failures) ---
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: adminName,
        email: adminEmail,
        role: 'school_admin',
        school_id: school.id
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn('[Registration] Manual profile creation fallback failed:', profileError.message);
    }
    // ---------------------------------------------------------------

    // NOTE: We no longer create a trial license here.
    // License assignment will be handled by the System Admin upon approval.

    res.status(201).json({
      message: 'Registration submitted successfully! Your school is currently pending approval by a system administrator.',
      schoolId: school.id
    });

  } catch (error: any) {
    console.error('School Self-Registration Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

export const schoolRouter = router;
