
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// Middleware to verify System Admin (Government Official)
const requireSystemAdmin = async (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ message: 'Unauthorized' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'system_admin') {
    return res.status(403).json({ message: 'Forbidden: Requires System Admin privileges' });
  }

  next();
};

// GET /api/government/feeding-program/stats
router.get('/stats', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    // Aggregated stats across the country
    const { data: inventory, error: invError } = await supabaseAdmin
      .from('feeding_program_inventory')
      .select('item_name, quantity, unit');
    
    const { data: meals, error: mealError } = await supabaseAdmin
      .from('feeding_program_meals')
      .select('beneficiaries_count');

    const { count: pendingProcurements, error: procError } = await supabaseAdmin
      .from('feeding_program_procurements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending');

    if (invError || mealError || procError) throw invError || mealError || procError;

    const stats = {
      totalBeneficiaries: meals?.reduce((acc, curr) => acc + curr.beneficiaries_count, 0) || 0,
      stockSummary: inventory?.reduce((acc: any, curr) => {
        if (!acc[curr.item_name]) acc[curr.item_name] = 0;
        acc[curr.item_name] += Number(curr.quantity);
        return acc;
      }, {}),
      pendingProcurements: pendingProcurements || 0
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/feeding-program/schools
router.get('/schools', requireSystemAdmin, async (req: Request, res: Response) => {
  const { province, district } = req.query;
  try {
    let query = supabaseAdmin
      .from('schools')
      .select('id, name, province, district');
    
    if (province) query = query.eq('province', province);
    if (district) query = query.eq('district', district);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/government/feeding-program/school/:id
router.get('/school/:id', requireSystemAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { data: inventory } = await supabaseAdmin
      .from('feeding_program_inventory')
      .select('*')
      .eq('school_id', id);
    
    const { data: deliveries } = await supabaseAdmin
      .from('feeding_program_deliveries')
      .select('*')
      .eq('school_id', id)
      .order('delivery_date', { ascending: false });

    const { data: meals } = await supabaseAdmin
      .from('feeding_program_meals')
      .select('*')
      .eq('school_id', id)
      .order('date', { ascending: false });

    res.json({ inventory, deliveries, meals });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const governmentPortalRouter = router;
