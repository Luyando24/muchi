import { Router, Request, Response } from 'express';
import { School } from '../../shared/api';
import { supabaseAdmin } from '../lib/supabase';

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

export const schoolRouter = router;
