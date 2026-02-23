import { Router, Request, Response } from 'express';
import { LoginRequest, LoginResponse, User } from '../../shared/api';

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
