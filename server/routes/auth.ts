import { Router, Request, Response } from 'express';
import { LoginRequest, LoginResponse, User } from '../../shared/api.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// Mock User Data
const MOCK_USERS: User[] = [
  {
    id: 'SYS001',
    name: 'Alex Mwape',
    email: 'sysadmin@muchi.com',
    role: 'system_admin',
    avatar: '/images/sysadmin-avatar.jpg'
  },
  {
    id: 'SCH001',
    name: 'Sarah Johnson',
    email: 'admin@chongwe.edu.zm',
    role: 'school_admin',
    school: 'Chongwe Secondary',
    avatar: '/images/schooladmin-avatar.jpg'
  },
  {
    id: 'TCH001',
    name: 'Mr. Banda',
    email: 'banda@chongwe.edu.zm',
    role: 'teacher',
    school: 'Chongwe Secondary',
    avatar: '/images/teacher-avatar.jpg'
  },
  {
    id: 'STD001',
    name: 'Joyce Lungu',
    email: 'joyce@chongwe.edu.zm',
    role: 'student',
    school: 'Chongwe Secondary',
    avatar: '/images/student-avatar.jpg'
  }
];

// POST /api/auth/resolve-identifier
// Resolves an input identifier (email, staff_number, student_number, username, phone) to the actual Supabase Auth email
router.post('/resolve-identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      return res.status(400).json({ error: 'Identifier is required', found: false });
    }

    const cleanIdentifier = identifier.trim();

    // 1. Search in profiles by email, staff_number, student_number, or username
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, staff_number, student_number, username')
      .or(`email.ilike.${cleanIdentifier},staff_number.ilike.${cleanIdentifier},student_number.ilike.${cleanIdentifier},username.ilike.${cleanIdentifier}`)
      .limit(1);

    if (!profileError && profiles && profiles.length > 0) {
      const matchedProfile = profiles[0];
      // Fetch the Auth user to get the true auth email (even if it's a generated staff email or changed email)
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(matchedProfile.id);
      if (authUser?.user?.email) {
        return res.json({ email: authUser.user.email, found: true });
      }
      if (matchedProfile.email) {
        return res.json({ email: matchedProfile.email, found: true });
      }
    }

    // 2. Check if auth.users has this email directly
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(cleanIdentifier)) {
      return res.json({ email: cleanIdentifier, found: false });
    }

    return res.json({ email: null, found: false });
  } catch (err: any) {
    console.error('Error in /api/auth/resolve-identifier:', err);
    return res.status(500).json({ error: 'Internal server error', found: false });
  }
});

// POST /api/auth/login
router.post('/login', (req: Request<{}, {}, LoginRequest>, res: Response<LoginResponse | { message: string }>) => {
  const { email } = req.body;
  
  const user = MOCK_USERS.find(u => u.email === email);

  if (user) {
    res.json({
      token: 'mock-jwt-token-12345',
      user
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// GET /api/auth/me (Verify Token)
router.get('/me', (req: Request, res: Response<User | { message: string }>) => {
  // In a real app, we would verify the token from headers
  const token = req.headers.authorization;
  
  if (token === 'Bearer mock-jwt-token-12345') {
    res.json(MOCK_USERS[0]); // Return default user for demo
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

export const authRouter = router;
