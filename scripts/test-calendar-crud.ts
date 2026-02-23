
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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_EMAIL = 'schooladmin@test.com';
const TEST_PASSWORD = 'password123';
const BASE_URL = 'http://localhost:3000/api';

async function testCalendarCRUD() {
  console.log('🚀 Starting Calendar CRUD Test...');

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

    // 2. Create a Calendar Event
    console.log('\n2. Creating a new event...');
    const newEvent = {
      title: 'Test Event ' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      type: 'Academic',
      location: 'Test Hall',
      description: 'Automated test event'
    };

    const createRes = await fetch(`${BASE_URL}/school/calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newEvent)
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(`Create failed: ${JSON.stringify(err)}`);
    }

    const createdEvent = await createRes.json();
    console.log('✅ Event created:', createdEvent.id);

    // 3. List Events
    console.log('\n3. Listing events...');
    const listRes = await fetch(`${BASE_URL}/school/calendar`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!listRes.ok) {
      const err = await listRes.json();
      throw new Error(`List failed: ${JSON.stringify(err)}`);
    }

    const events = await listRes.json();
    console.log(`✅ Found ${events.length} events`);
    
    const found = events.find((e: any) => e.id === createdEvent.id);
    if (!found) throw new Error('Created event not found in list');
    console.log('✅ Created event verified in list');

    // 4. Update Event
    console.log('\n4. Updating event...');
    const updatedData = {
      title: 'Updated Event Title',
      date: new Date().toISOString().split('T')[0],
      time: '11:00',
      type: 'Holiday',
      location: 'New Hall',
      description: 'Updated description'
    };

    const updateRes = await fetch(`${BASE_URL}/school/calendar/${createdEvent.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatedData)
    });

    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(`Update failed: ${JSON.stringify(err)}`);
    }

    const updatedEvent = await updateRes.json();
    if (updatedEvent.title !== 'Updated Event Title') throw new Error('Title update failed');
    console.log('✅ Event updated successfully');

    // 5. Delete Event
    console.log('\n5. Deleting event...');
    const deleteRes = await fetch(`${BASE_URL}/school/calendar/${createdEvent.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.json();
      throw new Error(`Delete failed: ${JSON.stringify(err)}`);
    }
    console.log('✅ Event deleted');

    // 5. Verify Deletion
    console.log('\n5. Verifying deletion...');
    const verifyRes = await fetch(`${BASE_URL}/school/calendar`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const updatedEvents = await verifyRes.json();
    const stillExists = updatedEvents.find((e: any) => e.id === createdEvent.id);
    
    if (stillExists) throw new Error('Event still exists after deletion');
    console.log('✅ Event successfully removed');

    console.log('\n✨ All Calendar CRUD tests passed!');

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

testCalendarCRUD();
