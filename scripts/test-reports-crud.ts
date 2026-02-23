
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_EMAIL = 'schooladmin@test.com';
const TEST_PASSWORD = 'password123';
const BASE_URL = 'http://localhost:3000/api';

async function testReportsCRUD() {
  console.log('🚀 Starting Reports CRUD Test...');

  try {
    // 1. Login as School Admin
    console.log('\n1. Logging in as School Admin...');
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (loginError || !session) {
      throw new Error(`Login failed: ${loginError?.message}`);
    }
    console.log('✅ Login successful');
    const token = session.access_token;

    // 2. Create a Report
    console.log('\n2. Creating a new report...');
    const newReport = {
      title: 'Test Report ' + Date.now(),
      type: 'Academic',
      description: 'Automated test report generation'
    };

    const createRes = await fetch(`${BASE_URL}/school/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newReport)
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(`Create failed: ${JSON.stringify(err)}`);
    }

    const createdReport = await createRes.json();
    console.log('✅ Report created:', createdReport.id);

    // 3. List Reports
    console.log('\n3. Listing reports...');
    const listRes = await fetch(`${BASE_URL}/school/reports`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!listRes.ok) {
      const err = await listRes.json();
      throw new Error(`List failed: ${JSON.stringify(err)}`);
    }

    const reports = await listRes.json();
    console.log(`✅ Found ${reports.length} reports`);
    
    const found = reports.find((r: any) => r.id === createdReport.id);
    if (!found) throw new Error('Created report not found in list');
    console.log('✅ Created report verified in list');

    // 4. Delete Report
    console.log('\n4. Deleting report...');
    const deleteRes = await fetch(`${BASE_URL}/school/reports/${createdReport.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.json();
      throw new Error(`Delete failed: ${JSON.stringify(err)}`);
    }
    console.log('✅ Report deleted');

    // 5. Verify Deletion
    console.log('\n5. Verifying deletion...');
    const verifyRes = await fetch(`${BASE_URL}/school/reports`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const updatedReports = await verifyRes.json();
    const stillExists = updatedReports.find((r: any) => r.id === createdReport.id);
    
    if (stillExists) throw new Error('Report still exists after deletion');
    console.log('✅ Report successfully removed');

    console.log('\n✨ All Reports CRUD tests passed!');

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

testReportsCRUD();
