import { Router, Request, Response } from 'express';
import { User, Student, Teacher } from '../../shared/api.js';

const router = Router();

// Mock User Data
const MOCK_USERS: User[] = [
  { id: 'USR001', name: 'John Doe', email: 'john@chongwe.edu.zm', role: 'school_admin', school: 'Chongwe Secondary', status: 'Active' } as any,
  { id: 'USR002', name: 'Jane Smith', email: 'jane@lusaka.edu.zm', role: 'school_admin', school: 'Lusaka International', status: 'Active' } as any,
  { id: 'USR003', name: 'Mike Johnson', email: 'mike@copperbelt.edu.zm', role: 'school_admin', school: 'Copperbelt High', status: 'Suspended' } as any,
  { id: 'USR004', name: 'Sarah Wilson', email: 'sarah@livingstone.edu.zm', role: 'school_admin', school: 'Livingstone Academy', status: 'Active' } as any,
  { id: 'USR005', name: 'David Brown', email: 'david@muchi.com', role: 'system_admin', school: 'MUCHI Central', status: 'Active' } as any,
];

// GET /api/users
router.get('/', (req: Request, res: Response<User[]>) => {
  res.json(MOCK_USERS);
});

// GET /api/users/:id
router.get('/:id', (req: Request, res: Response<User | { message: string }>) => {
  const user = MOCK_USERS.find(u => u.id === req.params.id);
  
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

export const userRouter = router;
