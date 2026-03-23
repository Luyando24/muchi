
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// Middleware to verify School Admin and get school_id
const requireSchoolAdmin = async (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ message: 'Unauthorized' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'school_admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  (req as any).schoolId = profile.school_id;
  (req as any).userId = user.id;
  next();
};

// GET /api/school/feeding-program/inventory
router.get('/inventory', requireSchoolAdmin, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_inventory')
      .select('*')
      .eq('school_id', schoolId);
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/feeding-program/deliveries
router.get('/deliveries', requireSchoolAdmin, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_deliveries')
      .select('*, received_by:profiles(full_name)')
      .eq('school_id', schoolId)
      .order('delivery_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/feeding-program/deliveries/:id/receive
router.post('/deliveries/:id/receive', requireSchoolAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_deliveries')
      .update({ status: 'Received', received_by: userId })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/feeding-program/procurements
router.get('/procurements', requireSchoolAdmin, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_procurements')
      .select('*, requested_by:profiles(full_name), approved_by:profiles(full_name)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/feeding-program/procurements
router.post('/procurements', requireSchoolAdmin, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  const userId = (req as any).userId;
  const { item_name, quantity, unit, estimated_cost } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_procurements')
      .insert({
        school_id: schoolId,
        item_name,
        quantity,
        unit,
        estimated_cost,
        requested_by: userId,
        status: 'Pending'
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/school/feeding-program/meals
router.get('/meals', requireSchoolAdmin, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_meals')
      .select('*')
      .eq('school_id', schoolId)
      .order('date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/feeding-program/meals
router.post('/meals', requireSchoolAdmin, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  const userId = (req as any).userId;
  const { date, meal_type, beneficiaries_count, items_used } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('feeding_program_meals')
      .insert({
        school_id: schoolId,
        date,
        meal_type,
        beneficiaries_count,
        items_used,
        recorded_by: userId
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const feedingProgramRouter = router;
