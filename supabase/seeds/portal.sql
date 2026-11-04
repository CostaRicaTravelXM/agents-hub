-- TravelXM Agent Portal · package catalogue and reviews.
-- Runs on `supabase db reset` (config.toml [db.seed]); safe to re-run by hand:
--   docker exec -i supabase_db_travelxm-learning psql -U postgres < supabase/seeds/portal.sql
-- Per-agent demo data (clients, bookings, …) is loaded by
-- public.portal_seed_demo(agent uuid), called from scripts/seed.mts.

insert into public.packages (
  id, name, destination, description, trip_types, settings, price_per_person, duration_days,
  commission_rate, rating, review_count, image_url, gallery, highlights, itinerary, inclusions,
  what_to_bring, kid_friendly, min_age, is_featured, featured_rank
) values
(
  1, 'Bali Luxury Escape', 'Bali, Indonesia',
  'Seven nights of curated indulgence across Ubud and Uluwatu — private pool villas, temple sunrises, and a dedicated island concierge.',
  '{luxury,relaxation,cultural}', '{beach,rainforest,islands}', 2450, 8, 12, 4.9, 128,
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1400&q=80',
    'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1400&q=80',
    'https://images.unsplash.com/photo-1573790387438-4da905039392?w=1400&q=80',
    'https://images.unsplash.com/photo-1604999333679-b86d54738315?w=1400&q=80',
    'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1400&q=80'
  ],
  array['Private pool villa in Ubud rainforest', 'Sunrise trek at Mount Batur', 'Uluwatu temple Kecak fire dance',
        'Floating breakfast experience', 'Full-day island concierge', 'Return private transfers'],
  '[{"label":"Day 1","title":"Arrive in Bali","description":"Private transfer from Denpasar to your Ubud pool villa; welcome massage."},
    {"label":"Days 2–3","title":"Ubud rice terraces & temples","description":"Tegallalang terraces, Tirta Empul water temple and a Balinese cooking class."},
    {"label":"Day 4","title":"Mount Batur sunrise","description":"Pre-dawn guided trek (moderate, about 2 hours up) with breakfast at the crater rim."},
    {"label":"Days 5–7","title":"Uluwatu coast","description":"Cliff-top villa, Nusa Penida day trip and the Kecak fire dance at sunset."},
    {"label":"Day 8","title":"Departure","description":"Floating breakfast, then private transfer to the airport."}]',
  array['7 nights in private pool villas', 'Daily breakfast, 3 dinners', 'All transfers in a private car', 'Guided excursions and entrance fees', '24/7 island concierge'],
  array['Sarong or clothing covering shoulders and knees for temples', 'Warm layer and headlamp for the Batur trek', 'Reef-safe sunscreen', 'Insect repellent', 'Passport valid 6+ months'],
  true, 6, true, 1
),
(
  2, 'Maldives Overwater Dream', 'Maldives',
  'Five nights in an overwater villa with glass floors, house-reef snorkelling, and champagne sunset cruises on a private dhoni.',
  '{honeymoon,luxury,relaxation}', '{beach,islands}', 5350, 6, 15, 5.0, 96,
  'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1400&q=80',
    'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=1400&q=80',
    'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=1400&q=80',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1400&q=80'
  ],
  array['Overwater villa with glass floor', 'House-reef snorkelling', 'Private sunset dhoni cruise',
        'Couples spa ritual', 'All-inclusive dining plan', 'Seaplane transfers included'],
  '[{"label":"Day 1","title":"Seaplane arrival","description":"Scenic seaplane from Malé and check-in to your overwater villa."},
    {"label":"Day 2","title":"House reef","description":"Guided snorkel with turtles and reef sharks straight from the villa steps."},
    {"label":"Day 3","title":"Spa & sandbank","description":"Couples spa ritual, then a private sandbank picnic."},
    {"label":"Days 4–5","title":"At your own pace","description":"Sunset dhoni cruise with champagne; optional diving or dolphin trips."},
    {"label":"Day 6","title":"Departure","description":"Seaplane back to Malé for your onward flight."}]',
  array['5 nights in an overwater villa', 'All-inclusive meals and drinks', 'Return seaplane transfers', 'Sunset cruise and couples spa ritual', 'Snorkel equipment'],
  array['Reef-safe sunscreen and a rash guard', 'Light, modest clothing for Malé', 'Underwater camera', 'Any prescription seasickness tablets'],
  false, 12, true, 2
),
(
  3, 'Swiss Alpine Tour', 'Switzerland',
  'A rail-and-peak journey through Lucerne, Interlaken and Zermatt with Glacier Express panoramic seats and Matterhorn views.',
  '{adventure,family}', '{mountains,countryside}', 3900, 10, 10, 4.8, 84,
  'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1400&q=80',
    'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1400&q=80',
    'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=1400&q=80',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80'
  ],
  array['Glacier Express panoramic carriage', 'Jungfraujoch — Top of Europe', 'Zermatt car-free village stay',
        'Lake Lucerne paddle steamer', 'Swiss Travel Pass included'],
  '[{"label":"Days 1–3","title":"Lucerne","description":"Old Town walk, Lake Lucerne paddle steamer and Mount Pilatus cogwheel railway."},
    {"label":"Days 4–6","title":"Interlaken & the Jungfrau","description":"Lauterbrunnen valley, Jungfraujoch at 3,454 m and optional paragliding."},
    {"label":"Day 7","title":"Glacier Express","description":"Eight hours of panoramic rail across 291 bridges to Zermatt."},
    {"label":"Days 8–9","title":"Zermatt","description":"Gornergrat railway for Matterhorn views; easy or challenging hikes."},
    {"label":"Day 10","title":"Departure","description":"Train to Zurich or Geneva airport on your Swiss Travel Pass."}]',
  array['9 nights in 4-star hotels', 'Daily breakfast', 'Swiss Travel Pass (1st class)', 'Glacier Express reserved panoramic seats', 'Jungfraujoch ticket'],
  array['Warm layers and a waterproof jacket, even in summer', 'Sturdy walking shoes', 'Sunglasses and sunscreen for altitude', 'Swiss plug adapter (type J)'],
  true, 4, true, 3
),
(
  4, 'Kyoto Cultural Journey', 'Kyoto, Japan',
  'Machiya townhouse stays, private tea ceremony, and dawn access to Fushimi Inari before the crowds — Japan at its most serene.',
  '{cultural}', '{city,countryside}', 3200, 9, 11, 4.7, 112,
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1400&q=80',
    'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=1400&q=80',
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1400&q=80',
    'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=1400&q=80'
  ],
  array['Restored machiya townhouse stay', 'Private tea ceremony with a master', 'Dawn walk at Fushimi Inari',
        'Arashiyama bamboo grove by rickshaw', 'Kaiseki dinner with maiko performance'],
  '[{"label":"Days 1–2","title":"Arrive in Kyoto","description":"Check in to your machiya; evening walk through Gion and Pontocho."},
    {"label":"Day 3","title":"Fushimi Inari at dawn","description":"Beat the crowds through the torii gates, then Nishiki Market."},
    {"label":"Days 4–5","title":"Arashiyama & Nara","description":"Bamboo grove by rickshaw and a day trip to Nara''s temples and deer park."},
    {"label":"Days 6–8","title":"Tea, crafts & kaiseki","description":"Private tea ceremony, indigo-dyeing workshop and kaiseki dinner with maiko."},
    {"label":"Day 9","title":"Departure","description":"Haruka express to Kansai airport."}]',
  array['8 nights in a machiya and a ryokan', 'Daily breakfast, kaiseki dinner', 'Private guide for 3 days', 'Japan Rail regional pass', 'All workshop and entrance fees'],
  array['Slip-on shoes — you remove them often', 'Socks without holes for temples and ryokan', 'Cash (many places are cash-only)', 'Portable Wi-Fi or eSIM'],
  true, 8, false, null
),
(
  5, 'Dubai Luxury Week', 'Dubai, UAE',
  'Sky-high suites, desert glamping under the stars, and a private yacht afternoon along the Marina — the full Dubai spectrum.',
  '{luxury,family}', '{city,beach}', 4100, 7, 13, 4.9, 74,
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1400&q=80',
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1400&q=80',
    'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=1400&q=80'
  ],
  array['Burj-view suite accommodation', 'Overnight desert glamping', 'Private yacht Marina cruise',
        'Sky-dining experience', 'VIP Burj Khalifa access'],
  '[{"label":"Day 1","title":"Arrival","description":"Chauffeured transfer to your Burj-view suite."},
    {"label":"Day 2","title":"Downtown & Old Dubai","description":"VIP Burj Khalifa access, abra ride across the Creek and the spice souk."},
    {"label":"Days 3–4","title":"Desert overnight","description":"Dune drive, falconry display and glamping under the stars."},
    {"label":"Days 5–6","title":"Marina & beaches","description":"Private yacht cruise past Palm Jumeirah; beach club or water park day."},
    {"label":"Day 7","title":"Departure","description":"Late checkout and chauffeured airport transfer."}]',
  array['6 nights in a 5-star suite', '1 night desert glamping with dinner', 'Private yacht (3 hours)', 'All transfers by chauffeur', 'VIP Burj Khalifa tickets'],
  array['Modest clothing for the souks and mosques', 'Sun hat and high-SPF sunscreen', 'A light jacket for air-conditioning and desert nights'],
  true, 0, true, 4
),
(
  6, 'Santorini Sunset Romance', 'Santorini, Greece',
  'Cliffside cave suites in Oia, catamaran caldera cruises, and volcanic-sand beach days built for two.',
  '{honeymoon,relaxation}', '{beach,islands}', 2890, 6, 12, 4.8, 143,
  'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1400&q=80',
    'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=1400&q=80',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1400&q=80'
  ],
  array['Cave suite with private plunge pool', 'Catamaran caldera sunset cruise', 'Santo Wines volcano tasting', 'Private photoshoot in Oia'],
  '[{"label":"Day 1","title":"Arrive in Oia","description":"Transfer to your cave suite; sunset from your plunge pool."},
    {"label":"Day 2","title":"Caldera catamaran","description":"Hot springs, volcano hike and a sunset dinner on board."},
    {"label":"Days 3–4","title":"Beaches & wine","description":"Red and Perissa beaches, then a volcanic wine tasting at Santo Wines."},
    {"label":"Day 5","title":"Oia photoshoot","description":"Private golden-hour photoshoot through Oia''s lanes."},
    {"label":"Day 6","title":"Departure","description":"Airport or ferry transfer."}]',
  array['5 nights in a cave suite with plunge pool', 'Daily breakfast', 'Catamaran cruise with dinner', 'Wine tasting and photoshoot', 'All transfers'],
  array['Comfortable flat shoes — lots of steps', 'Swimwear and a cover-up', 'Light layer for windy evenings'],
  false, 16, false, null
),
(
  7, 'Kenya Safari Expedition', 'Masai Mara, Kenya',
  'Game drives at golden hour, luxury tented camps, and a sunrise balloon safari over the Mara plains.',
  '{wildlife,adventure,family}', '{safari}', 4750, 8, 14, 4.9, 67,
  'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1400&q=80',
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1400&q=80',
    'https://images.unsplash.com/photo-1535941339077-2dd1c7963098?w=1400&q=80'
  ],
  array['Big Five game drives', 'Sunrise hot-air balloon safari', 'Luxury tented camp with full board',
        'Maasai village cultural visit', 'Bush breakfast on the plains'],
  '[{"label":"Day 1","title":"Nairobi","description":"Meet-and-greet and overnight at a garden hotel."},
    {"label":"Day 2","title":"Fly to the Mara","description":"Light aircraft to the reserve, afternoon game drive."},
    {"label":"Days 3–6","title":"Masai Mara","description":"Morning and evening drives, balloon safari at sunrise, Maasai village visit."},
    {"label":"Day 7","title":"Bush breakfast","description":"Breakfast on the plains and a final drive."},
    {"label":"Day 8","title":"Departure","description":"Flight back to Nairobi for your onward connection."}]',
  array['7 nights (1 Nairobi, 6 tented camp)', 'Full board in camp', 'Return light-aircraft flights', 'Daily game drives with a private guide', 'Balloon safari and park fees'],
  array['Neutral-coloured clothing (khaki, olive — avoid blue and black)', 'Binoculars', 'Soft-sided bag, max 15 kg for light aircraft', 'Yellow fever certificate and malaria prophylaxis — check with a doctor'],
  true, 8, false, null
),
(
  8, 'Paris & Loire Châteaux', 'Paris, France',
  'Four nights in Saint-Germain plus a chauffeured Loire Valley château trail with private tastings.',
  '{cultural,luxury}', '{city,countryside}', 3450, 7, 10, 4.6, 98,
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=80',
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1400&q=80',
    'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=1400&q=80',
    'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=1400&q=80'
  ],
  array['Boutique stay in Saint-Germain', 'Skip-the-line Louvre with art historian', 'Chauffeured Loire châteaux day', 'Seine dinner cruise'],
  '[{"label":"Days 1–2","title":"Saint-Germain","description":"Check in to a boutique hotel; Seine dinner cruise."},
    {"label":"Day 3","title":"The Louvre","description":"Skip-the-line tour with an art historian, afternoon in the Marais."},
    {"label":"Day 4","title":"Montmartre & free time","description":"Morning walk through Montmartre; afternoon at leisure."},
    {"label":"Days 5–6","title":"Loire Valley","description":"Chauffeured route to Chambord and Chenonceau with private wine tastings."},
    {"label":"Day 7","title":"Departure","description":"Transfer to Charles de Gaulle."}]',
  array['6 nights in boutique hotels', 'Daily breakfast', 'Louvre private tour', 'Chauffeured Loire day with tastings', 'Seine dinner cruise'],
  array['Comfortable walking shoes', 'Smart-casual outfit for dinners', 'Type E plug adapter'],
  true, 10, false, null
),
(
  9, 'Costa Rica Rainforest Trail', 'Costa Rica',
  'Zip-lines over cloud forest, volcano hot springs, and wildlife lodges from Arenal to Manuel Antonio.',
  '{adventure,wildlife,family}', '{rainforest,mountains,beach}', 2150, 9, 11, 4.7, 89,
  '/imgs/arenal-volcano.webp',
  array['/imgs/arenal-volcano.webp', '/imgs/la-fortuna-waterfall.webp', '/imgs/sloth.webp',
        '/imgs/keel-billed-toucan.webp', '/imgs/pacific-sunset-beach.webp', '/imgs/scarlet-macaws-corcovado.webp'],
  array['Cloud-forest zip-line circuit', 'Arenal volcano hot springs', 'Manuel Antonio wildlife walk', 'White-water rafting (Class III)'],
  '[{"label":"Day 1","title":"San José","description":"Arrival and transfer to a boutique hotel in the Central Valley."},
    {"label":"Days 2–4","title":"Arenal & La Fortuna","description":"Hanging bridges, La Fortuna waterfall, volcano hot springs and rafting."},
    {"label":"Days 5–6","title":"Monteverde cloud forest","description":"Zip-line circuit and a night walk to spot sloths and frogs."},
    {"label":"Days 7–8","title":"Manuel Antonio","description":"Guided wildlife walk in the national park, then beach time on the Pacific."},
    {"label":"Day 9","title":"Departure","description":"Private shuttle back to San José."}]',
  array['8 nights in eco-lodges', 'Daily breakfast', 'Private shuttles between regions', 'Zip-line, rafting and hot springs entry', 'Bilingual naturalist guides'],
  array['Rain jacket — it rains most afternoons', 'Quick-dry clothing and water shoes', 'Insect repellent', 'Binoculars for wildlife'],
  true, 6, true, 5
),
(
  10, 'Maldives Family Lagoon', 'Maldives',
  'Beach villas on a kids-love-it lagoon island: dolphin cruises, splash park, and a kids'' club that gives parents a real holiday.',
  '{family,relaxation}', '{beach,islands}', 3150, 7, 12, 4.8, 58,
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  array[
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1400&q=80',
    'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=1400&q=80'
  ],
  array['Two-bedroom beach villa', 'Kids'' club & splash park', 'Dolphin-spotting cruise', 'Family snorkelling safari'],
  '[{"label":"Day 1","title":"Speedboat arrival","description":"Transfer from Malé and check-in to your two-bedroom beach villa."},
    {"label":"Days 2–3","title":"Lagoon days","description":"Kids'' club, splash park and a shallow-water snorkel lesson."},
    {"label":"Day 4","title":"Dolphin cruise","description":"Sunset cruise to spot spinner dolphins."},
    {"label":"Days 5–6","title":"Snorkel safari","description":"Family snorkelling safari to a turtle reef; parents'' spa afternoon."},
    {"label":"Day 7","title":"Departure","description":"Speedboat back to Malé."}]',
  array['6 nights in a two-bedroom beach villa', 'Half board, kids eat free', 'Return speedboat transfers', 'Kids'' club access', 'Dolphin cruise and snorkel safari'],
  array['Reef-safe sunscreen and rash guards for the kids', 'Water shoes', 'Kids'' swim aids if needed', 'Light, modest clothing for Malé'],
  true, 0, false, null
)
on conflict (id) do update set
  name = excluded.name, destination = excluded.destination, description = excluded.description,
  trip_types = excluded.trip_types, settings = excluded.settings, price_per_person = excluded.price_per_person,
  duration_days = excluded.duration_days, commission_rate = excluded.commission_rate, rating = excluded.rating,
  review_count = excluded.review_count, image_url = excluded.image_url, gallery = excluded.gallery,
  highlights = excluded.highlights, itinerary = excluded.itinerary, inclusions = excluded.inclusions,
  what_to_bring = excluded.what_to_bring, kid_friendly = excluded.kid_friendly, min_age = excluded.min_age,
  is_featured = excluded.is_featured, featured_rank = excluded.featured_rank;

select setval(pg_get_serial_sequence('public.packages', 'id'), (select max(id) from public.packages));

delete from public.package_reviews where package_id between 1 and 10;
insert into public.package_reviews (package_id, author_name, author_location, traveler_type, rating, title, body, traveled_on) values
  (1, 'Hannah R.', 'Toronto, Canada', 'Couple', 5, 'Worth every penny', 'The Ubud villa was unreal and the concierge sorted a last-minute dinner booking in minutes. The Batur sunrise is tough but unforgettable.', '2026-05-12'),
  (1, 'Marcus L.', 'Austin, USA', 'Family', 5, 'Great with our teenagers', 'Our 13- and 16-year-olds loved the cooking class and the Uluwatu fire dance. Transfers were always on time.', '2026-03-02'),
  (1, 'Sienna P.', 'Melbourne, Australia', 'Friends', 4, 'Beautiful, bring temple clothes', 'Loved it. Pack a sarong — a few temples turned us away without one.', '2026-01-20'),
  (2, 'Olivia & Ben', 'London, UK', 'Honeymoon', 5, 'Honeymoon perfection', 'Glass floor, turtles under the villa, and the sunset dhoni cruise was the best evening of our lives.', '2026-06-01'),
  (2, 'Carlos M.', 'Madrid, Spain', 'Couple', 5, 'Seamless from start to finish', 'The seaplane transfer alone is worth it. All-inclusive meant we never looked at a bill.', '2026-02-14'),
  (2, 'Priya S.', 'Mumbai, India', 'Couple', 5, 'Vegetarian options were excellent', 'The chef adapted every meal. House reef snorkelling was better than any boat trip.', '2025-11-20'),
  (3, 'Tom W.', 'Chicago, USA', 'Family', 5, 'Kids loved the trains', 'The Glacier Express was a highlight for our 9-year-old. Jungfraujoch is cold even in July — bring layers.', '2026-07-18'),
  (3, 'Anja K.', 'Berlin, Germany', 'Couple', 5, 'Matterhorn views every morning', 'Zermatt hotel had a direct Matterhorn view. The travel pass made everything effortless.', '2026-06-08'),
  (3, 'Grace T.', 'Sydney, Australia', 'Solo', 4, 'Pricey but stunning', 'Switzerland is expensive but everything in the package was high quality.', '2025-09-10'),
  (4, 'Emma D.', 'Vancouver, Canada', 'Couple', 5, 'Fushimi Inari at dawn is magic', 'We had the gates almost to ourselves. The machiya felt like living in old Kyoto.', '2026-04-04'),
  (4, 'Kenji A.', 'San Francisco, USA', 'Family', 4, 'Lots of walking', 'Wonderful trip; our 10-year-old got tired by day 4, so plan rest afternoons.', '2025-10-22'),
  (4, 'Lucia F.', 'Rome, Italy', 'Solo', 5, 'The tea ceremony was a highlight', 'Our guide was brilliant and the kaiseki dinner was a work of art.', '2026-03-28'),
  (5, 'Rahul M.', 'Pune, India', 'Family', 5, 'Something for all ages', 'Kids loved the water park, we loved the desert camp. The yacht afternoon was a treat.', '2026-01-05'),
  (5, 'Sophie B.', 'Paris, France', 'Couple', 5, 'Desert night under the stars', 'Glamping was far more luxurious than expected. Sky-dining is expensive but memorable.', '2025-12-12'),
  (5, 'Jake H.', 'Dublin, Ireland', 'Friends', 4, 'Hot in June', 'Great trip; go between November and March if you can.', '2025-06-20'),
  (6, 'Aisha K.', 'Dubai, UAE', 'Couple', 5, 'The caldera sunset cruise', 'Cave suite was gorgeous and the photoshoot gave us photos we will keep forever.', '2026-07-07'),
  (6, 'Mia & Leo', 'Lisbon, Portugal', 'Honeymoon', 5, 'Romantic in every way', 'Loved the wine tasting on volcanic soil. Lots of steps in Oia — flat shoes!', '2026-05-30'),
  (6, 'Daniel R.', 'Boston, USA', 'Couple', 4, 'Busy but beautiful', 'Oia gets crowded at sunset, but the plunge pool view let us skip the crowds.', '2025-09-15'),
  (7, 'Nora O.', 'Lagos, Nigeria', 'Friends', 5, 'Saw the Big Five in two days', 'Our guide found a leopard on day one. The balloon safari is a must.', '2026-08-01'),
  (7, 'The Petersens', 'Oslo, Norway', 'Family', 5, 'A trip our kids will never forget', 'Camp staff were wonderful with our 8- and 11-year-olds. Game drives are long — bring snacks.', '2026-02-18'),
  (7, 'Liam C.', 'Cork, Ireland', 'Solo', 5, 'Bush breakfast on the plains', 'Tented camp was pure luxury. Respect the 15 kg bag limit on the small plane.', '2025-10-05'),
  (8, 'Claire M.', 'Montreal, Canada', 'Couple', 5, 'Chambord took our breath away', 'Chauffeur and tastings in the Loire made the trip. Louvre guide was superb.', '2026-04-20'),
  (8, 'Ethan G.', 'Denver, USA', 'Family', 4, 'Great mix of city and countryside', 'Kids enjoyed the châteaux more than the museums. Hotel rooms are small, as expected in Paris.', '2025-08-12'),
  (8, 'Isabel V.', 'Mexico City, Mexico', 'Friends', 5, 'Seine dinner cruise was lovely', 'Very well organised, and Saint-Germain is the perfect base.', '2026-02-02'),
  (9, 'Marco R.', 'Milan, Italy', 'Solo', 5, 'Adventure heaven', 'Rafting, zip-lines and sloths in one trip. Naturalist guides were excellent.', '2026-03-15'),
  (9, 'The Garcias', 'Miami, USA', 'Family', 5, 'Best family trip we have taken', 'Our 7-year-old spotted a toucan on day two and talked about nothing else. Pack rain jackets.', '2026-07-10'),
  (9, 'Ellie W.', 'Brighton, UK', 'Couple', 4, 'Pura vida!', 'Hot springs after the rafting were perfect. It rains in the afternoon, so plan mornings.', '2025-12-01'),
  (10, 'Rachel & Sam', 'Manchester, UK', 'Family', 5, 'Parents actually relaxed', 'Kids'' club was fantastic and the lagoon is shallow and safe for little ones.', '2026-04-10'),
  (10, 'Ahmed Y.', 'Doha, Qatar', 'Family', 5, 'Dolphins!', 'Our kids (4 and 6) loved the dolphin cruise. Two-bedroom villa gave everyone space.', '2026-01-26'),
  (10, 'Julia N.', 'Stockholm, Sweden', 'Family', 4, 'Great value for the Maldives', 'Half board worked well with kids eating free. Bring water shoes for the coral.', '2025-11-02');
