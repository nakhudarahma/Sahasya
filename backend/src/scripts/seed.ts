import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from one level up
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DATASETS = {
  hotspots: [
    // --- MUMBAI (Expanded) ---
    { label: 'Dharavi', type: 'danger', lat: 19.0437, lng: 72.8527, radius: 60, description: 'High density, multiple incidents reported.', risk_level: 5, peak_time: 'Night' },
    { label: 'Kurla West', type: 'danger', lat: 19.0722, lng: 72.9005, radius: 55, description: 'Limited lighting near station back exits.', risk_level: 4, peak_time: 'Late Night' },
    { label: 'Bandra Reclamation', type: 'caution', lat: 19.0450, lng: 72.8220, radius: 45, description: 'Secluded areas near the promenade.', risk_level: 3, peak_time: 'Evening' },
    { label: 'Saki Naka', type: 'caution', lat: 19.0760, lng: 72.8777, radius: 50, description: 'Heavy traffic and crowded intersections.', risk_level: 2, peak_time: 'Evening' },
    { label: 'BKC Business District', type: 'safe', lat: 19.0596, lng: 72.8656, radius: 70, description: 'Highly guarded corporate area.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Marine Drive', type: 'safe', lat: 18.9431, lng: 72.8230, radius: 65, description: 'Constant police patrolling and high visibility.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Powai Lake Side', type: 'safe', lat: 19.1250, lng: 72.9100, radius: 50, description: 'Active community presence and well-lit.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Malad Marve Road', type: 'caution', lat: 19.1800, lng: 72.8200, radius: 55, description: 'Isolated stretches near the coast.', risk_level: 3, peak_time: 'Night' },
    { label: 'Vikroli East', type: 'caution', lat: 19.1100, lng: 72.9300, radius: 40, description: 'Poor lighting reported in industrial zones.', risk_level: 3, peak_time: 'Late Night' },
    { label: 'Colaba Causeway', type: 'safe', lat: 18.9200, lng: 72.8300, radius: 50, description: 'Tourist hub with active security.', risk_level: 1, peak_time: 'Day' },

    // --- DELHI (Expanded) ---
    { label: 'Connaught Place', type: 'safe', lat: 28.6315, lng: 77.2167, radius: 70, description: 'High security presence and CCTV coverage.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Chandni Chowk', type: 'caution', lat: 28.6562, lng: 77.2300, radius: 45, description: 'Narrow lanes, exercise caution late night.', risk_level: 3, peak_time: 'Late Night' },
    { label: 'Dwarka Sec 10', type: 'danger', lat: 28.5800, lng: 77.0500, radius: 50, description: 'Poorly lit stretches and subways.', risk_level: 5, peak_time: 'Night' },
    { label: 'Hauz Khas Village', type: 'caution', lat: 28.5494, lng: 77.2001, radius: 40, description: 'Crowded lanes, watch for harassers.', risk_level: 2, peak_time: 'Evening' },
    { label: 'South Ex Part II', type: 'safe', lat: 28.5600, lng: 77.2200, radius: 55, description: 'Premium shopping district, well lit.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Rohini Sector 15', type: 'danger', lat: 28.7200, lng: 77.1200, radius: 60, description: 'Frequent incidents reported near bus stands.', risk_level: 4, peak_time: 'Night' },
    { label: 'Greater Kailash', type: 'safe', lat: 28.5480, lng: 77.2320, radius: 60, description: 'Safe residential area with guards.', risk_level: 1, peak_time: 'All Day' },
    { label: 'North Campus', type: 'caution', lat: 28.6900, lng: 77.2100, radius: 45, description: 'University area, busy but isolated at night.', risk_level: 2, peak_time: 'Late Night' },

    // --- LUCKNOW (Expanded) ---
    { label: 'Hazratganj', type: 'safe', lat: 26.8500, lng: 80.9499, radius: 65, description: 'Pride of Lucknow, very well lit and safe.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Gomti Nagar Extension', type: 'safe', lat: 26.8496, lng: 81.0072, radius: 60, description: 'New residential hub with active security.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Charbagh Stn Area', type: 'danger', lat: 26.8322, lng: 80.9200, radius: 50, description: 'High incidence of petty crime and harassment.', risk_level: 5, peak_time: 'Night' },
    { label: 'Aminabad Market', type: 'caution', lat: 26.8465, lng: 80.9234, radius: 40, description: 'Extremely crowded, exercise caution.', risk_level: 3, peak_time: 'Day' },
    { label: 'Janpath', type: 'safe', lat: 26.8520, lng: 80.9520, radius: 45, description: 'Shopping area, safe for women.', risk_level: 1, peak_time: 'Evening' },
    { label: 'Aliganj Sector H', type: 'caution', lat: 26.8900, lng: 80.9400, radius: 40, description: 'Residential streets are quiet at night.', risk_level: 2, peak_time: 'Late Night' },

    // --- BANGALORE (New) ---
    { label: 'Indiranagar 100ft Rd', type: 'safe', lat: 12.9719, lng: 77.6412, radius: 55, description: 'Very active nightlife and well-policed.', risk_level: 1, peak_time: 'All Day' },
    { label: 'MG Road Metro Station', type: 'safe', lat: 12.9750, lng: 77.6070, radius: 60, description: 'Central hub, very high visibility.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Silk Board Jn', type: 'caution', lat: 12.9170, lng: 77.6230, radius: 50, description: 'Heavy traffic, busy and safe due to crowd.', risk_level: 2, peak_time: 'Evening' },
    { label: 'Koramangala 5th Block', type: 'safe', lat: 12.9350, lng: 77.6140, radius: 55, description: 'Youth hub, safe and active.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Outer Ring Rd (Bellandur)', type: 'caution', lat: 12.9280, lng: 77.6780, radius: 55, description: 'Isolated flyover sections late at night.', risk_level: 3, peak_time: 'Night' },

    // --- PUNE (New) ---
    { label: 'Koregaon Park Rd', type: 'safe', lat: 18.5360, lng: 73.8930, radius: 60, description: 'Active nightlife, generally very safe.', risk_level: 1, peak_time: 'All Day' },
    { label: 'Hinjewadi IT Phase 1', type: 'safe', lat: 18.5900, lng: 73.7400, radius: 65, description: 'Tech park area with constant patrols.', risk_level: 1, peak_time: 'Late Night' },
    { label: 'Pune Station Area', type: 'danger', lat: 18.5280, lng: 73.8730, radius: 50, description: 'High incidence of harassment reported.', risk_level: 4, peak_time: 'Night' },
    { label: 'Viman Nagar', type: 'safe', lat: 18.5600, lng: 73.9100, radius: 55, description: 'Friendly residential and student hub.', risk_level: 1, peak_time: 'All Day' }
  ],
  help_centers: [
    { name: 'Mumbai Central Police Station', category: 'police', address: 'Mumbai Central', lat: 18.9696, lng: 72.8193, phone: '022-23070101' },
    { name: 'Khar Police Station', category: 'police', address: 'Linking Rd, Mumbai', lat: 19.0664, lng: 72.8338, phone: '022-26462440' },
    { name: 'AIIMS Delhi Emergency', category: 'hospital', address: 'Ansari Nagar, Delhi', lat: 28.5672, lng: 77.2100, phone: '011-26588500' },
    { name: 'Safdarjung Hospital', category: 'hospital', address: 'Ansari Nagar, Delhi', lat: 28.5663, lng: 77.2086, phone: '011-26707310' },
    { name: 'Lucknow Trauma Center', category: 'hospital', address: 'Chowk, Lucknow', lat: 26.8661, lng: 80.9191, phone: '0522-2257242' },
    { name: 'Hazratganj Women Power Line', category: 'police', address: 'Lucknow', lat: 26.8500, lng: 80.9499, phone: '1090' },
    { name: 'Bangalore Manipal Emergency', category: 'hospital', address: 'Old Airport Rd', lat: 12.9610, lng: 77.6470, phone: '080-25024444' },
    { name: 'Indiranagar Police Station', category: 'police', address: 'Indiranagar, Bangalore', lat: 12.9780, lng: 77.6410, phone: '080-22942512' },
    { name: 'Ruby Hall Clinic', category: 'hospital', address: 'Pune', lat: 18.5300, lng: 73.8760, phone: '020-66455100' },
    { name: 'Shivaji Nagar Police Stn', category: 'police', address: 'Pune', lat: 18.5310, lng: 73.8540, phone: '020-25508200' },
  ],
  stats: [
    { title: 'Safe Streets', value: '45%', description: 'Women feel safe walking alone at night in Lucknow.', category: 'City-Specific', source: 'Sahasya Analytics' },
    { title: 'Lighting Impact', value: '60%', description: 'Areas with poor street lighting correlate with 60% higher risk.', category: 'Risk Analytics', source: 'Sahasya Research' },
    { title: 'Emergency Response', value: '8.2 min', description: 'Average police response time in tech hubs like BKC or Hinjewadi.', category: 'National', source: 'Police Records' },
    { title: 'Public Awareness', value: '1.2M', description: 'Women reached through digital safety campaigns in 2025.', category: 'Impact', source: 'NGO Partnership' },
    { title: 'Harassment Reporting', value: '1 in 10', description: 'Only 10% of street harassment cases are formally reported.', category: 'National', source: 'NGO Study' },
    { title: 'Check-in Adoption', value: '85%', description: 'Users report feeling 85% more confident using automated check-ins.', category: 'App Usage', source: 'User Survey' },
  ]
};

async function seed() {
  console.log('🌱 Starting Advanced Database Seed...');

  try {
    // 1. Clear Hotspots
    await supabase.from('safety_hotspots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Cleared old hotspots');

    // 2. Clear Help Centers
    await supabase.from('help_centers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Cleared old help centers');

    // 3. Clear Stats
    await supabase.from('safety_stats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Cleared old safety stats');

    // 4. Insert Hotspots
    const { data: hData, error: hErr } = await supabase.from('safety_hotspots').insert(
      DATASETS.hotspots.map(h => ({ ...h, verified: true, upvotes: Math.floor(Math.random() * 100) }))
    ).select();
    if (hErr) throw hErr;
    console.log(`✨ Seeded ${hData.length} Safety Hotspots (Mumbai, Delhi, Lucknow)`);

    // 5. Insert Help Centers
    const { data: cData, error: cErr } = await supabase.from('help_centers').insert(DATASETS.help_centers).select();
    if (cErr) throw cErr;
    console.log(`✨ Seeded ${cData.length} Help Centers`);

    // 6. Insert Stats
    const { data: sData, error: sErr } = await supabase.from('safety_stats').insert(DATASETS.stats).select();
    if (sErr) throw sErr;
    console.log(`✨ Seeded ${sData.length} Safety Statistics`);

    console.log('\n🏁 ALL DATASETS SEEDED SUCCESSFULLY!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
