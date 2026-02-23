import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Notification } from '../shared/api';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const adminEmail = 'admin@chongwe.edu.zm';
const adminPassword = 'password123';
const API_URL = 'http://localhost:8080/api/school';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNavbarEndpoints() {
  console.log('🚀 Starting Navbar Endpoints Test...');

  // 1. Login
  console.log('\n1. Logging in as School Admin...');
  const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (loginError || !session) {
    console.error('❌ Login failed:', loginError);
    process.exit(1);
  }
  console.log('✅ Login successful');
  const token = session.access_token;

  // 2. Create a test notification (via DB directly as we don't have a create endpoint for users yet)
  console.log('\n2. Creating test notification...');
  const { error: createError } = await supabase
    .from('notifications')
    .insert({
      user_id: session.user.id,
      title: 'Test Notification',
      message: 'This is a test notification from the test script',
      type: 'info',
      is_read: false
    });
  
  if (createError) {
    console.error('❌ Failed to create notification:', createError);
  } else {
    console.log('✅ Notification created');
  }

  // 3. Fetch Notifications
  console.log('\n3. Fetching notifications...');
  try {
    const response = await fetch(`${API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const notifications: Notification[] = await response.json();
    
    if (response.ok && Array.isArray(notifications)) {
      console.log(`✅ Fetched ${notifications.length} notifications`);
      if (notifications.length > 0) {
        console.log('Sample:', notifications[0]);
      }
    } else {
      console.error('❌ Failed to fetch notifications:', notifications);
    }

    // 4. Mark as Read
    if (notifications.length > 0) {
      const idToMark = notifications[0].id;
      console.log(`\n4. Marking notification ${idToMark} as read...`);
      const readResponse = await fetch(`${API_URL}/notifications/${idToMark}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (readResponse.ok) {
        console.log('✅ Marked as read');
      } else {
        console.error('❌ Failed to mark as read');
      }
    }

  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
  }

  // 5. Test Search
  console.log('\n5. Testing Search...');
  try {
    const query = 'stu'; // Assuming there are students with 'stu' or just 'a'
    const searchResponse = await fetch(`${API_URL}/search?q=a`, { // search for 'a' to get results
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const searchResults = await searchResponse.json();

    if (searchResponse.ok) {
      console.log('✅ Search results:', searchResults);
      console.log(`Found ${searchResults.students?.length || 0} students and ${searchResults.teachers?.length || 0} teachers`);
    } else {
      console.error('❌ Search failed:', searchResults);
    }
  } catch (error) {
    console.error('❌ Error searching:', error);
  }

  console.log('\n✨ Navbar Endpoints Test Complete!');
}

testNavbarEndpoints();
