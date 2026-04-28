import { supabase } from '../config/supabase.config';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function simulateSOS() {
  console.log('🧪 Starting SOS Simulation...');
  
  // 1. Get a test user
  const { data: user } = await supabase.from('profiles').select('id, full_name').limit(1).single();
  if (!user) {
    console.error('❌ No users found in database to test with!');
    return;
  }
  const userId = user.id;
  console.log(`👤 Testing with user: ${user.full_name} (${userId})`);

  try {
    // 2. Try to create Tracking Session
    console.log('🛰️ Step 1: Creating Tracking Session...');
    const { data: session, error: sessionError } = await supabase
      .from('tracking_sessions')
      .insert({
        user_id: userId,
        destination: 'SOS TEST',
        share_link: 'http://localhost:5173/track/test',
        is_active: true,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Tracking Session Error:', sessionError);
    } else {
      console.log('✅ Tracking Session created!');
    }

    // 3. Try to create Incident
    console.log('🚨 Step 2: Creating Incident record...');
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .insert({
        user_id: userId,
        type: 'SOS Triggered (TEST)',
        location: 'Simulation Lab',
        duration_seconds: 0,
        summary: 'Testing SOS save logic from simulation script',
      })
      .select()
      .single();

    if (incidentError) {
      console.error('❌ Incident Creation Error:', incidentError);
    } else {
      console.log('✅ Incident record created!');
    }

    // 4. Try to create Timeline
    if (incident) {
      console.log('📅 Step 3: Creating Timeline entry...');
      const { error: timelineError } = await supabase
        .from('incident_timeline')
        .insert({
          incident_id: incident.id,
          time: '00:00',
          event: 'SOS Triggered (TEST)',
          sort_order: 0,
        });

      if (timelineError) {
        console.error('❌ Timeline Error:', timelineError);
      } else {
        console.log('✅ Timeline entry created!');
      }
    }

    console.log('\n🏁 Simulation Finished.');
    if (!sessionError && !incidentError) {
      console.log('🌟 SUCCESS: All database operations for SOS are working correctly!');
    } else {
      console.log('🚨 FAIL: Some database operations failed. See errors above.');
    }

  } catch (err) {
    console.error('💥 Crash during simulation:', err);
  }
}

simulateSOS();
