import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testDashboard() {
  try {
    console.log("1. Fetching counts...");
    const { count: schoolsCount, error: schoolsError } = await supabaseAdmin
      .from('schools')
      .select('*', { count: 'exact', head: true });
    if (schoolsError) console.error("schoolsError:", schoolsError);
    console.log("Schools count:", schoolsCount);

    const { count: usersCount, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (usersError) console.error("usersError:", usersError);
    console.log("Users count:", usersCount);

    console.log("2. Fetching recent schools...");
    const { data: recentSchools, error: recentSchoolsError } = await supabaseAdmin
      .from('schools')
      .select('id, name, slug, created_at, school_licenses(status, plan)')
      .order('created_at', { ascending: false })
      .limit(5);
    if (recentSchoolsError) {
      console.error("recentSchoolsError:", recentSchoolsError);
    } else {
      console.log("Recent schools fetched:", recentSchools.length);
      console.log("First recent school:", JSON.stringify(recentSchools[0], null, 2));
    }

    console.log("3. Fetching platform activity feeds...");
    const [schoolsDataRes, licensesDataRes, transactionsDataRes] = await Promise.all([
      supabaseAdmin.from('schools').select('id, name, created_at').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('school_licenses').select('id, plan, license_key, created_at, schools(name)').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('business_transactions').select('id, type, category, amount, currency, description, created_at').order('created_at', { ascending: false }).limit(10)
    ]);

    if (schoolsDataRes.error) console.error("schoolsDataRes error:", schoolsDataRes.error);
    if (licensesDataRes.error) console.error("licensesDataRes error:", licensesDataRes.error);
    if (transactionsDataRes.error) console.error("transactionsDataRes error:", transactionsDataRes.error);

    const activitiesList = [];

    if (schoolsDataRes.data) {
      schoolsDataRes.data.forEach((school) => {
        activitiesList.push({
          id: `school-${school.id}`,
          type: 'Success',
          message: `New school tenant provisioned: ${school.name}`,
          time: school.created_at,
          source: 'Provisioning'
        });
      });
    }

    if (licensesDataRes.data) {
      licensesDataRes.data.forEach((lic) => {
        const schoolName = lic.schools?.name || 'School';
        activitiesList.push({
          id: `lic-${lic.id}`,
          type: 'Info',
          message: `License key generated for ${schoolName} (Plan: ${lic.plan})`,
          time: lic.created_at,
          source: 'Licensing'
        });
      });
    }

    if (transactionsDataRes.data) {
      transactionsDataRes.data.forEach((tx) => {
        activitiesList.push({
          id: `tx-${tx.id}`,
          type: tx.type === 'income' ? 'Success' : 'Warning',
          message: `${tx.type === 'income' ? 'Income' : 'Expense'} recorded: ${tx.category} - ${tx.amount} ${tx.currency} (${tx.description || ''})`,
          time: tx.created_at,
          source: 'Finance'
        });
      });
    }

    activitiesList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const sortedActivities = activitiesList.slice(0, 10);
    console.log("Activities fetched count:", sortedActivities.length);
    if (sortedActivities.length > 0) {
      console.log("First activity:", sortedActivities[0]);
    }

  } catch (error) {
    console.error("Catch error:", error);
  }
}

testDashboard();
