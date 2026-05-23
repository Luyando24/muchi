import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLogins() {
  let allUsers = [];
  let page = 1;
  let hasMore = true;

  console.log("Fetching auth users...");
  while (hasMore) {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      console.error(error);
      break;
    }

    if (!users || users.length === 0) {
      hasMore = false;
    } else {
      allUsers.push(...users);
      console.log(`Fetched page ${page}: ${users.length} users (Total: ${allUsers.length})`);
      if (users.length < 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  console.log("Total auth users found:", allUsers.length);

  // Group sign ins by school
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const schoolSignIns7d = {};
  const schoolSignIns30d = {};

  allUsers.forEach(u => {
    const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null;
    const schoolId = u.user_metadata?.school_id;

    if (!schoolId) return;

    if (lastSignIn) {
      if (lastSignIn >= sevenDaysAgo) {
        schoolSignIns7d[schoolId] = (schoolSignIns7d[schoolId] || 0) + 1;
      }
      if (lastSignIn >= thirtyDaysAgo) {
        schoolSignIns30d[schoolId] = (schoolSignIns30d[schoolId] || 0) + 1;
      }
    }
  });

  console.log("School sign-ins in last 7 days:", schoolSignIns7d);
  console.log("School sign-ins in last 30 days:", schoolSignIns30d);
}

checkLogins();
