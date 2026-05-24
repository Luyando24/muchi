import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  try {
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

    console.log("Licenses retrieved:", licenses.length);
    console.log("Plans retrieved:", plans.length);
    console.log("Schools retrieved:", schools.length);

    const getPlanInfo = (planName) => {
      if (!planName) return { price: 500, currency: 'ZMW' };
      const found = plans.find(p => 
        p.name.toLowerCase() === planName.toLowerCase() ||
        p.name.toLowerCase().includes(planName.toLowerCase()) ||
        planName.toLowerCase().includes(p.name.toLowerCase())
      );
      return found ? { price: Number(found.price), currency: found.currency || 'ZMW' } : { price: 500, currency: 'ZMW' };
    };

    let totalRevenue = 0;
    let mrr = 0;
    let activeSubscriptionsCount = 0;

    const now = new Date();
    const processedLicenses = licenses.map((license, idx) => {
      console.log(`Processing license ${idx}:`, {
        id: license.id,
        plan: license.plan,
        status: license.status,
        start_date: license.start_date,
        end_date: license.end_date
      });
      const planInfo = getPlanInfo(license.plan);
      console.log(`  Plan info resolved:`, planInfo);
      const startDate = new Date(license.start_date);
      const endDate = new Date(license.end_date);
      
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const durationMonths = Math.max(1, Math.round(diffDays / 30));
      
      const totalCost = planInfo.price * durationMonths;
      totalRevenue += totalCost;

      const isActive = license.status === 'active' && endDate > now;
      if (isActive) {
        mrr += planInfo.price;
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

    const planDistributionMap = {};
    processedLicenses.forEach((l) => {
      if (l.status === 'active') {
        planDistributionMap[l.plan] = (planDistributionMap[l.plan] || 0) + 1;
      }
    });

    console.log("Calculated metrics successfully!");
    console.log("Summary:", {
      totalRevenue,
      mrr,
      activeSubscriptionsCount,
      arpu: activeSubscriptionsCount > 0 ? Math.round(mrr / activeSubscriptionsCount) : 0,
      totalSchools: schools.length
    });
  } catch (err) {
    console.error("Test execution caught error:", err);
  }
}
test();
