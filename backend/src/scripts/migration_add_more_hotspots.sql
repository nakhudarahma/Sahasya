-- ============================================================================
-- SAHASYA — Expanded Safety Hotspots (Mumbai)
-- Run this in the Supabase SQL Editor to populate the Safety Map.
-- ============================================================================

INSERT INTO public.safety_hotspots (type, location, coordinates, radius, description, intensity)
VALUES
  (
    'SAFE', 
    'Bandra West', 
    '{"lat": 19.0601, "lng": 72.8250}', 
    800, 
    'Highly active residential & shopping district. Well-lit with constant foot traffic.', 
    0.9
  ),
  (
    'SAFE', 
    'Colaba Causeway', 
    '{"lat": 18.9150, "lng": 72.8258}', 
    500, 
    'Tourist hub with heavy police presence and 24/7 activity.', 
    0.85
  ),
  (
    'SAFE', 
    'Marine Drive', 
    '{"lat": 18.9430, "lng": 72.8230}', 
    1000, 
    'Popular promenade, well-lighted and regularly patrolled by Mumbai Police.', 
    0.95
  ),
  (
    'DANGER', 
    'Govandi', 
    '{"lat": 19.0550, "lng": 72.9150}', 
    1000, 
    'Reported high frequency of petty theft and harassment. Avoid solo travel at night.', 
    0.7
  ),
  (
    'DANGER', 
    'Mankhurd', 
    '{"lat": 19.0480, "lng": 72.9320}', 
    800, 
    'Industrial area with limited lighting. Use main roads only.', 
    0.75
  ),
  (
    'CAUTION', 
    'Andheri West Station East', 
    '{"lat": 19.1197, "lng": 72.8464}', 
    600, 
    'Extremely crowded transit hub. Prone to pickpocketing and mobile snatching.', 
    0.5
  ),
  (
    'CAUTION', 
    'Sion Circle', 
    '{"lat": 19.0390, "lng": 72.8619}', 
    500, 
    'Heavy traffic bottleneck with significant pedestrian congestion.', 
    0.4
  ),
  (
    'SAFE', 
    'Powai Hiranandani', 
    '{"lat": 19.1170, "lng": 72.9125}', 
    700, 
    'Upscale residential area, private security patrols, and well-lit parks.', 
    0.9
  ),
  (
    'CAUTION', 
    'Juhu Beach (North)', 
    '{"lat": 19.1050, "lng": 72.8240}', 
    900, 
    'Crowded tourist spot; exercise caution after 10 PM in secluded beach corners.', 
    0.6
  ),
  (
    'SAFE', 
    'Malad Mindspace', 
    '{"lat": 19.1860, "lng": 72.8350}', 
    600, 
    'Modern business park with active security and CCTV coverage.', 
    0.88
  ),
  (
    'DANGER', 
    'Jogeshwari Caves Surroundings', 
    '{"lat": 19.1360, "lng": 72.8590}', 
    500, 
    'Dimly lit residential pockets near hilly terrain. Multiple reports of suspicious activity.', 
    0.8
  ),
  (
    'SAFE', 
    'Worli Sea Face', 
    '{"lat": 19.0060, "lng": 72.8160}', 
    900, 
    'Residential and park area. Very safe for morning and evening walks.', 
    0.92
  );
