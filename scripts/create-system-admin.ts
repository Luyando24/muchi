import { supabaseAdmin } from '../server/lib/supabase';

async function createSystemAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@muchi.com';
  const password = process.env.ADMIN_PASSWORD || 'MuchiAdmin123!';
  const fullName = 'System Administrator';

  console.log(`Creating System Admin: ${email}`);

  try {
    // 1. Create or Update User in Auth
    // Note: createUser will fail if user exists, so we might need to handle that or use listUsers to check first.
    // However, for simplicity in a script, we'll try to create, and if it fails (likely exists), we'll try to update password/metadata.
    
    // First, check if user exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) throw listError;
    
    const existingUser = users.find(u => u.email === email);
    let userId;

    if (existingUser) {
      console.log('User already exists. Updating password and metadata...');
      const { data: user, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: password,
          user_metadata: {
            full_name: fullName,
            role: 'system_admin'
          },
          email_confirm: true
        }
      );
      if (updateError) throw updateError;
      userId = existingUser.id;
      console.log('User updated successfully.');
    } else {
      console.log('Creating new user...');
      const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'system_admin'
        }
      });

      if (createError) {
        console.error('Full Error Details:', JSON.stringify(createError, null, 2));
        throw new Error(`Database error creating new user: ${createError.message}`);
      }

      userId = user.user.id;
      console.log('User created successfully:', userId);
    }

    // 2. Ensure Profile Entry Exists with Correct Role
    // The trigger might handle insertion, but we want to be explicit about the role here to be safe.
    // Especially if the trigger logic is basic or if we are updating an existing user.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        role: 'system_admin',
        full_name: fullName,
        school_id: null // System Admin has no school
      });

    if (profileError) throw profileError;

    console.log('Profile updated successfully.');
    console.log('-----------------------------------');
    console.log('System Admin Credentials:');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------');

  } catch (error: any) {
    console.error('Error creating system admin:', error.message);
    process.exit(1);
  }
}

createSystemAdmin();
