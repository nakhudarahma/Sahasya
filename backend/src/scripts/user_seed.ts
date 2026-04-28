import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from one level up
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Admin key required for user creation

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUser() {
  const email = 'priya@gmail.com';
  const password = 'Password123!';
  const fullName = 'Priya Sharma';
  const phone = '+91 98765 43210';
  const initials = 'PS';

  console.log(`👤 Starting User Seeding for: ${email}...`);

  try {
    // 1. Check if user exists in auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let user = users.find(u => u.email === email);

    if (user) {
      console.log('🔄 User already exists in Auth. Updating profile...');
    } else {
      // 2. Create user in auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (createError) throw createError;
      user = newUser.user;
      console.log('✅ Created user in Auth.');
    }

    if (!user) throw new Error('Failed to retrieve user object.');

    // 3. Create or Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        phone,
        initials
      });

    if (profileError) throw profileError;
    console.log('✅ Created/Updated user profile in public.profiles.');

    // 4. Add some emergency contacts for the test user
    const { error: contactError } = await supabase
      .from('emergency_contacts')
      .upsert([
        { user_id: user.id, name: 'Mom', phone: '+91 91234 56789' },
        { user_id: user.id, name: 'Riya Mehta', phone: '+91 98765 44332' }
      ], { onConflict: 'user_id, name' });

    if (contactError) {
      console.warn('⚠️ Warning: Failed to seed emergency contacts (likely missing unique constraint or table logic):', contactError.message);
    } else {
      console.log('✅ Seeded default emergency contacts.');
    }

    console.log('\n🏁 TEST USER SEEDED SUCCESSFULLY!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ User Seeding failed:', error.message);
    process.exit(1);
  }
}

seedUser();
