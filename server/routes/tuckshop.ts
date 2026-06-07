import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// Middleware to verify Tuckshop Access (Admin or Assigned Active Staff)
const requireTuckshopAccess = async (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ message: 'Unauthorized' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const ADMIN_ROLES = ['school_admin', 'bursar', 'accounts', 'system_admin'];
    const isAdmin = ADMIN_ROLES.includes(profile.role);

    let isStaff = false;
    if (!isAdmin && profile.school_id) {
      const { data: staffEntry } = await supabaseAdmin
        .from('tuckshop_staff')
        .select('id')
        .eq('school_id', profile.school_id)
        .eq('user_id', user.id)
        .eq('status', 'Active')
        .maybeSingle();
      isStaff = !!staffEntry;
    }

    if (!isAdmin && !isStaff) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    (req as any).schoolId = profile.school_id;
    (req as any).userId = user.id;
    (req as any).userRole = profile.role;
    (req as any).isTuckshopAdmin = isAdmin;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Middleware to restrict to school admin roles only
const requireTuckshopAdmin = (req: Request, res: Response, next: any) => {
  if (!(req as any).isTuckshopAdmin) {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};

// ----------------------------------------------------
// PRODUCT INVENTORY ROUTES
// ----------------------------------------------------

// GET /api/school/tuckshop/inventory
router.get('/inventory', requireTuckshopAccess, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  try {
    const { data, error } = await supabaseAdmin
      .from('tuckshop_products')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/tuckshop/inventory
router.post('/inventory', requireTuckshopAccess, requireTuckshopAdmin, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  const { name, sku, description, cost_price, selling_price, stock_quantity, reorder_level, category } = req.body;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('tuckshop_products')
      .insert({
        school_id: schoolId,
        name,
        sku,
        description,
        cost_price: Number(cost_price),
        selling_price: Number(selling_price),
        stock_quantity: Number(stock_quantity || 0),
        reorder_level: Number(reorder_level || 5),
        category
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/tuckshop/inventory/:id
router.put('/inventory/:id', requireTuckshopAccess, requireTuckshopAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const schoolId = (req as any).schoolId;
  const { name, sku, description, cost_price, selling_price, stock_quantity, reorder_level, category } = req.body;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('tuckshop_products')
      .update({
        name,
        sku,
        description,
        cost_price: Number(cost_price),
        selling_price: Number(selling_price),
        stock_quantity: Number(stock_quantity),
        reorder_level: Number(reorder_level),
        category,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/tuckshop/inventory/:id
router.delete('/inventory/:id', requireTuckshopAccess, requireTuckshopAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const schoolId = (req as any).schoolId;
  
  try {
    const { error } = await supabaseAdmin
      .from('tuckshop_products')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------
// SALES TRANSACTION ROUTES
// ----------------------------------------------------

// GET /api/school/tuckshop/sales
router.get('/sales', requireTuckshopAccess, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  try {
    const { data, error } = await supabaseAdmin
      .from('tuckshop_sales')
      .select('*, items:tuckshop_sale_items(*, product:tuckshop_products(name)), sold_by_profile:profiles!tuckshop_sales_sold_by_fkey(full_name), buyer_profile:profiles!tuckshop_sales_buyer_id_fkey(full_name, role)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/tuckshop/sales
router.post('/sales', requireTuckshopAccess, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  const soldBy = (req as any).userId;
  const { buyer_type, buyer_id, buyer_name, payment_method, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'No items in sales cart' });
  }

  try {
    // 1. Verify stock levels for all items before initiating sale
    for (const item of items) {
      const { data: product, error: prodError } = await supabaseAdmin
        .from('tuckshop_products')
        .select('name, stock_quantity')
        .eq('id', item.product_id)
        .eq('school_id', schoolId)
        .single();

      if (prodError || !product) {
        return res.status(400).json({ message: `Product with ID ${item.product_id} not found` });
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product: ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}` });
      }
    }

    // 2. Calculate Total Amount
    let calculatedTotal = 0;
    const itemsToInsert = [];

    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from('tuckshop_products')
        .select('selling_price')
        .eq('id', item.product_id)
        .single();
      
      const unitPrice = product?.selling_price || item.unit_price;
      const itemTotalPrice = Number(unitPrice) * Number(item.quantity);
      calculatedTotal += itemTotalPrice;

      itemsToInsert.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: Number(unitPrice),
        total_price: itemTotalPrice
      });
    }

    // 3. Create Sale Header
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('tuckshop_sales')
      .insert({
        school_id: schoolId,
        buyer_type,
        buyer_id: buyer_id || null,
        buyer_name: buyer_name || null,
        total_amount: calculatedTotal,
        payment_method,
        sold_by: soldBy
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // 4. Create Sale Items and Decrement stock quantity
    for (const item of itemsToInsert) {
      // Create Sale Item
      const { error: itemError } = await supabaseAdmin
        .from('tuckshop_sale_items')
        .insert({
          sale_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      
      if (itemError) throw itemError;

      // Decrement Inventory Stock
      const { error: stockError } = await supabaseAdmin.rpc('increment', {
        x: -Number(item.quantity),
        row_id: item.product_id
      }).catch(async () => {
        // Fallback if rpc is not present: manual decrement
        const { data: currentProduct } = await supabaseAdmin
          .from('tuckshop_products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();
        
        const newStock = Math.max(0, (currentProduct?.stock_quantity || 0) - item.quantity);
        return supabaseAdmin
          .from('tuckshop_products')
          .update({ stock_quantity: newStock })
          .eq('id', item.product_id);
      });
    }

    // 5. Automatic Ledger Sync - Log as income in finance_records
    const { error: finError } = await supabaseAdmin
      .from('finance_records')
      .insert({
        school_id: schoolId,
        category: 'Tuckshop Sales',
        amount: calculatedTotal,
        type: 'income',
        description: `Tuckshop Sales Revenue - Transaction ID: ${sale.id}`,
        date: new Date().toISOString().split('T')[0]
      });

    if (finError) {
      console.error('Failed to log tuckshop sale to general finance ledger:', finError);
    }

    res.status(201).json(sale);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------
// STAFF ASSIGNMENT ROUTES
// ----------------------------------------------------

// GET /api/school/tuckshop/staff
router.get('/staff', requireTuckshopAccess, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  try {
    const { data, error } = await supabaseAdmin
      .from('tuckshop_staff')
      .select('*, profile:profiles(full_name, role, email)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/school/tuckshop/staff
router.post('/staff', requireTuckshopAccess, requireTuckshopAdmin, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  const { user_id, role, status } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('tuckshop_staff')
      .insert({
        school_id: schoolId,
        user_id,
        role: role || 'Seller',
        status: status || 'Active'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/school/tuckshop/staff/:id
router.put('/staff/:id', requireTuckshopAccess, requireTuckshopAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const schoolId = (req as any).schoolId;
  const { role, status } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('tuckshop_staff')
      .update({
        role,
        status,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/school/tuckshop/staff/:id
router.delete('/staff/:id', requireTuckshopAccess, requireTuckshopAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const schoolId = (req as any).schoolId;

  try {
    const { error } = await supabaseAdmin
      .from('tuckshop_staff')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;
    res.json({ message: 'Staff assignment deleted' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------
// ANALYTICS & REPORTS ROUTES
// ----------------------------------------------------

// GET /api/school/tuckshop/analytics
router.get('/analytics', requireTuckshopAccess, async (req: Request, res: Response) => {
  const schoolId = (req as any).schoolId;
  try {
    // 1. Get total sales
    const { data: sales, error: salesErr } = await supabaseAdmin
      .from('tuckshop_sales')
      .select('id, total_amount, created_at')
      .eq('school_id', schoolId);

    if (salesErr) throw salesErr;

    // 2. Fetch sale items and products for cost margin calculations
    const { data: saleItems, error: itemsErr } = await supabaseAdmin
      .from('tuckshop_sale_items')
      .select('quantity, unit_price, product:tuckshop_products(cost_price, name)')
      .eq('sale_id', {
        // subquery filtering by school's sales ids
        in: sales.map(s => s.id)
      } as any);

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalSalesCount = sales.length;

    // Calculate total cost of items sold and product margins
    let totalCost = 0;
    const itemMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};

    if (saleItems) {
      saleItems.forEach(item => {
        const costPrice = Number((item.product as any)?.cost_price || 0);
        totalCost += costPrice * item.quantity;

        const prodName = (item.product as any)?.name || 'Unknown Item';
        if (!itemMap[prodName]) {
          itemMap[prodName] = { name: prodName, quantity: 0, revenue: 0 };
        }
        itemMap[prodName].quantity += item.quantity;
        itemMap[prodName].revenue += Number(item.unit_price) * item.quantity;
      });
    }

    const grossProfit = Math.max(0, totalRevenue - totalCost);

    // Sort to find top selling products
    const topProducts = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 3. Count products with low stock quantity
    const { data: products, error: prodErr } = await supabaseAdmin
      .from('tuckshop_products')
      .select('id, stock_quantity, reorder_level')
      .eq('school_id', schoolId);

    if (prodErr) throw prodErr;

    const lowStockCount = products.filter(p => p.stock_quantity <= p.reorder_level).length;

    // 4. Calculate Daily Sales Chart Data (last 7 days)
    const chartData: { [date: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartData[dateStr] = 0;
    }

    sales.forEach(sale => {
      const dateStr = new Date(sale.created_at).toISOString().split('T')[0];
      if (chartData[dateStr] !== undefined) {
        chartData[dateStr] += Number(sale.total_amount);
      }
    });

    const salesTimeline = Object.entries(chartData).map(([date, amount]) => ({
      date,
      amount
    }));

    res.json({
      totalRevenue,
      totalSalesCount,
      grossProfit,
      lowStockCount,
      topProducts,
      salesTimeline
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const tuckshopRouter = router;
export default router;
