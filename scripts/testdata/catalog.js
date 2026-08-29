'use strict';

const { heading, blocks, seo, bullets } = require('./shared');
const everestTrips = require('./trips-everest');
const annapurnaTrips = require('./trips-annapurna');
const otherTrips = require('./trips-other');

const destinations = [
  {
    name: 'Nepal',
    slug: 'nepal',
    is_active: true,
    imageKeys: ['everest', 'abc', 'langtang'],
    seo: seo(
      'Nepal Trekking & Tours',
      'Treks, peak climbs, jungle safaris, and heritage tours across Nepal — Everest, Annapurna, Langtang, Manaslu, Mustang, Dolpo and more.',
      'nepal trekking, himalaya, everest, annapurna'
    ),
    description: blocks(
      heading('Nepal'),
      'Nepal holds eight of the fourteen 8,000-metre peaks, a dense network of tea-house trails, restricted trans-Himalayan valleys, and lowland wildlife reserves. Kathmandu and Pokhara are the usual gateways; Lukla, Jomsom, Nepalgunj, and Bhadrapur open the farther ranges.',
      'Use this destination to browse regions and trips. Seasons, permits, and flight risk differ by valley — each trip page states what is included.'
    ),
  },
  {
    name: 'Tibet',
    slug: 'tibet',
    is_active: true,
    imageKeys: ['tibet'],
    seo: seo(
      'Tibet Tours | Lhasa and Everest North',
      'Guided overland journeys on the Tibetan Plateau with Tibet Travel Permits, Lhasa sightseeing, and Everest’s north face.',
      'tibet tour, lhasa, rongbuk, everest north'
    ),
    description: blocks(
      heading('Tibet'),
      'Foreign visitors travel in Tibet with a Tibet Travel Permit and a licensed guide. Our programs start in Lhasa for acclimatization, then follow classic overland routes toward Gyantse, Shigatse, and Rongbuk.',
      'Itineraries are paced for altitude. Checkpoint and monastery opening hours can change; we brief you on current rules after permits are issued.'
    ),
  },
  {
    name: 'Bhutan',
    slug: 'bhutan',
    is_active: true,
    imageKeys: ['bhutan'],
    seo: seo(
      'Bhutan Tours | Paro, Thimphu, Punakha',
      'Licensed cultural tours in western Bhutan including Taktsang, Punakha Dzong, and the Sustainable Development Fee.',
      'bhutan tour, tiger nest, paro, thimphu'
    ),
    description: blocks(
      heading('Bhutan'),
      'Bhutan’s west-country classics — Paro, Thimphu, Punakha — combine dzongs, high passes, and the hike to Taktsang. Packages include a licensed guide, driver, and the Sustainable Development Fee at the rate in force when we invoice.',
      'Paro airport seats are limited. Book flights early, especially around festivals.'
    ),
  },
];

const regionDefs = [
  {
    name: 'Everest Region',
    slug: 'everest-region',
    destinationSlug: 'nepal',
    price_from: 920,
    price_to: 2990,
    display_order: 1,
    featured: true,
    imageKey: 'everest',
    seo: seo('Everest Region Treks', 'EBC, Gokyo, Three Passes, Island Peak, Mera Peak and shorter Namche treks.'),
    description: blocks(
      heading('Everest Region (Khumbu)'),
      'Sherpa villages, suspension bridges, and glacier viewpoints under Everest, Lhotse, and Ama Dablam. Most itineraries fly to Lukla; keep spare time for weather delays.',
      'Best seasons: March–May and late September–November. Winter is possible on shorter treks; monsoon brings cloud and slippery trails.'
    ),
  },
  {
    name: 'Annapurna Region',
    slug: 'annapurna-region',
    destinationSlug: 'nepal',
    price_from: 640,
    price_to: 1890,
    display_order: 2,
    featured: true,
    imageKey: 'abc',
    seo: seo('Annapurna Region Treks', 'ABC, Circuit, Poon Hill, Mardi Himal, Khopra, Tilicho and Nar Phu.'),
    description: blocks(
      heading('Annapurna Region'),
      'The most varied trekking massif in Nepal: subtropical farmland, Gurung and Magar villages, Thorong La, the Annapurna Sanctuary, and restricted Nar Phu. Access from Pokhara keeps logistics flexible.',
      'Roads have shortened some Circuit stages; we keep you on trail where it is safer and more beautiful.'
    ),
  },
  {
    name: 'Langtang Region',
    slug: 'langtang-region',
    destinationSlug: 'nepal',
    price_from: 690,
    price_to: 1090,
    display_order: 3,
    featured: true,
    imageKey: 'langtang',
    seo: seo('Langtang Valley Treks', 'Langtang, Kyanjin, Gosaikunda and Helambu close to Kathmandu.'),
    description: blocks(
      heading('Langtang Region'),
      'North of Kathmandu, Langtang delivers glacier scenery without a Lukla flight. Tamang heritage, Kyanjin bakeries, and optional sacred lakes at Gosaikunda make strong mid-length treks.'
    ),
  },
  {
    name: 'Manaslu Region',
    slug: 'manaslu-region',
    destinationSlug: 'nepal',
    price_from: 1490,
    price_to: 2190,
    display_order: 4,
    featured: true,
    imageKey: 'manaslu',
    seo: seo('Manaslu Circuit and Tsum Valley', 'Restricted-area treks around Manaslu with Larkya La and the Tsum side valley.'),
    description: blocks(
      heading('Manaslu Region'),
      'A restricted circuit around the world’s eighth-highest mountain, plus the sacred Tsum Valley. Expect quieter trails than Annapurna, Tibetan-influenced culture, and mandatory licensed guiding.'
    ),
  },
  {
    name: 'Upper Mustang',
    slug: 'upper-mustang',
    destinationSlug: 'nepal',
    price_from: 1090,
    price_to: 2490,
    display_order: 5,
    featured: true,
    imageKey: 'mustang',
    seo: seo('Upper and Lower Mustang', 'Lo Manthang restricted trek and Jomsom–Muktinath pilgrimage walks.'),
    description: blocks(
      heading('Mustang'),
      'Rain-shadow desert, cave monasteries, and the walled city of Lo Manthang. Upper Mustang requires a restricted permit; Lower Mustang (Jomsom–Muktinath) does not. Wind after midday is part of the experience.'
    ),
  },
  {
    name: 'Dolpo',
    slug: 'dolpo-region',
    destinationSlug: 'nepal',
    price_from: 3490,
    price_to: 3490,
    display_order: 6,
    featured: false,
    imageKey: 'dolpo',
    seo: seo('Upper Dolpo Treks', 'Shey Gompa, Phoksundo Lake and Inner Dolpo camping expeditions.'),
    description: blocks(
      heading('Dolpo'),
      'Nepal’s remote west: turquoise Phoksundo, Shey Gompa, and Bon-Buddhist villages reached by camping crew and restricted permits. Flights via Nepalgunj to Juphal cancel often — itineraries include spare aviation days.'
    ),
  },
  {
    name: 'Kanchenjunga',
    slug: 'kanchenjunga-region',
    destinationSlug: 'nepal',
    price_from: 2890,
    price_to: 2890,
    display_order: 7,
    featured: false,
    imageKey: 'kanchenjunga',
    seo: seo('Kanchenjunga Treks', 'North and south base camps of the world’s third-highest mountain.'),
    description: blocks(
      heading('Kanchenjunga'),
      'Far-east Nepal: Pang Pema, Oktang, and high ridges in the Kanchenjunga Conservation Area. Sparse lodges, mixed camping, and restricted-area sectors. Best for trekkers who already know a 5,000 m pass.'
    ),
  },
  {
    name: 'Makalu',
    slug: 'makalu-region',
    destinationSlug: 'nepal',
    price_from: 2350,
    price_to: 2490,
    display_order: 8,
    featured: false,
    imageKey: 'makalu',
    seo: seo('Makalu Base Camp Trek', 'Makalu Barun National Park via Shipton La to Base Camp at 4,870 m.'),
    description: blocks(
      heading('Makalu Region'),
      'The Barun valley and Makalu’s south-east face. Quieter than Khumbu, with a serious pass (Shipton La) and basic lodges or camps. Access via Tumlingtar.'
    ),
  },
  {
    name: 'Kathmandu Valley',
    slug: 'kathmandu-valley',
    destinationSlug: 'nepal',
    price_from: 290,
    price_to: 320,
    display_order: 9,
    featured: false,
    imageKey: 'kathmandu',
    seo: seo('Kathmandu Valley Tours', 'UNESCO heritage days in Kathmandu, Patan and Bhaktapur.'),
    description: blocks(
      heading('Kathmandu Valley'),
      'Living Newar cities, Buddhist stupas, and Hindu pilgrimage sites. Use as a jet-lag buffer or a standalone culture trip.'
    ),
  },
  {
    name: 'Terai & Wildlife',
    slug: 'terai-region',
    destinationSlug: 'nepal',
    price_from: 260,
    price_to: 290,
    display_order: 10,
    featured: false,
    imageKey: 'chitwan',
    seo: seo('Chitwan and Terai Safaris', 'Jungle lodges, jeep safaris and river activities in the Nepali lowlands.'),
    description: blocks(
      heading('Terai'),
      'Chitwan National Park is the classic post-trek jungle: rhinoceros, river canoe, and Tharu hospitality. Heat in late spring; misty mornings in winter.'
    ),
  },
  {
    name: 'Central Tibet',
    slug: 'tibet-central',
    destinationSlug: 'tibet',
    price_from: 1890,
    price_to: 1890,
    display_order: 11,
    featured: true,
    imageKey: 'tibet',
    seo: seo('Lhasa and Central Tibet', 'Potala, Jokhang, Gyantse, Shigatse and Everest North overland.'),
    description: blocks(
      heading('Central Tibet'),
      'The cultural and overland core of Tibet tourism: Lhasa’s temples, the Friendship Highway lakes, and Rongbuk. Permit-only travel with a guide.'
    ),
  },
  {
    name: 'Western Bhutan',
    slug: 'bhutan-west',
    destinationSlug: 'bhutan',
    price_from: 2490,
    price_to: 2490,
    display_order: 12,
    featured: true,
    imageKey: 'bhutan',
    seo: seo('Western Bhutan', 'Paro, Thimphu, Punakha and Taktsang with licensed guiding.'),
    description: blocks(
      heading('Western Bhutan'),
      'The classic first visit to Bhutan: dzongs, Dochula, and the Tiger’s Nest hike. SDF and licensed guiding are part of the package structure.'
    ),
  },
];

const activityDefs = [
  {
    name: 'Trekking',
    slug: 'trekking',
    display_order: 1,
    description:
      'Multi-day Himalayan treks with tea-house or camping support, licensed guides, and carefully paced acclimatization from foothill walks to 5,000 m passes.',
  },
  {
    name: 'Peak Climbing',
    slug: 'peak-climbing',
    display_order: 2,
    description:
      'NMA trekking peaks such as Island Peak and Mera Peak — glacier travel, fixed ropes where needed, high-camp logistics, and climbing guides.',
  },
  {
    name: 'Cultural Tours',
    slug: 'cultural-tours',
    display_order: 3,
    description:
      'Heritage walks, monastery visits, and valley touring in Nepal, Tibet, and Bhutan with private vehicles and licensed culture guides.',
  },
  {
    name: 'Adventure',
    slug: 'adventure',
    display_order: 4,
    description:
      'Rafting, paragliding, and multi-activity add-ons around Pokhara and the Trisuli, often combined with a foothill trek.',
  },
  {
    name: 'Wildlife & Nature',
    slug: 'wildlife-nature',
    display_order: 5,
    description:
      'Chitwan and other Terai jungle lodges: safari drives, canoe, birdwatching, and lowland nature combined with mountain itineraries.',
  },
  {
    name: 'Pilgrimage',
    slug: 'pilgrimage',
    display_order: 6,
    description:
      'Muktinath, Gosaikunda, Lumbini approaches, and other sacred sites with respectful pacing and local ritual context.',
  },
];

const team = [
  {
    name: 'Pembu Sherpa',
    slug: 'pembu-sherpa',
    role: 'Senior Trekking Guide',
    initials: 'PS',
    color: '#1e3a5f',
    bio: 'Khumbu specialist with 15+ years on Everest-region routes, Gokyo, and Three Passes.',
    experience:
      'Led 100+ EBC and Gokyo groups. Wilderness first-aid trained. Climbing-support experience on Island Peak approaches.',
    language: 'English, Nepali, Sherpa',
    phone: '+977-9800000001',
    whatsapp: '+977-9800000001',
    display_order: 1,
    active: true,
    description: blocks(
      'Pembu grew up near Namche and knows lodge networks, weather windows, and cultural etiquette across Khumbu.'
    ),
  },
  {
    name: 'Maya Gurung',
    slug: 'maya-gurung',
    role: 'Annapurna Guide',
    initials: 'MG',
    color: '#3d5a40',
    bio: 'Pokhara-based guide focused on ABC, Poon Hill, Mardi Himal, and women’s trek groups.',
    experience: '10 years guiding Annapurna sanctuaries, foothill cultural walks, and mixed-ability families.',
    language: 'English, Nepali, Gurung',
    phone: '+977-9800000002',
    whatsapp: '+977-9800000002',
    display_order: 2,
    active: true,
    description: blocks('Maya emphasizes inclusive pacing and clear altitude communication on steep stone staircases.'),
  },
  {
    name: 'Dorje Tamang',
    slug: 'dorje-tamang',
    role: 'Manaslu & Langtang Guide',
    initials: 'DT',
    color: '#5c3d2e',
    bio: 'Restricted-area and Langtang specialist covering Larkya La, Tsum, and Gosaikunda.',
    experience: '12 years on Manaslu Circuit, Tsum Valley, and Langtang; strong navigation in shoulder seasons.',
    language: 'English, Nepali, Tamang',
    phone: '+977-9800000003',
    whatsapp: '+977-9800000003',
    display_order: 3,
    active: true,
    description: blocks('Dorje is known for calm decision-making on pass days and thoughtful village interpretation.'),
  },
  {
    name: 'Tashi Bista',
    slug: 'tashi-bista',
    role: 'Mustang & Dolpo Guide',
    initials: 'TB',
    color: '#8a5a2b',
    bio: 'Upper Mustang and Dolpo expedition leader with restricted-permit field experience.',
    experience: 'Leads Lo Manthang seasons and Inner Dolpo camping trips; fluent in local checkpoint routine.',
    language: 'English, Nepali, Tibetan dialects',
    phone: '+977-9800000005',
    whatsapp: '+977-9800000005',
    display_order: 4,
    active: true,
    description: blocks('Tashi grew up with trans-Himalayan wind and dust — he teaches sun and hydration discipline early.'),
  },
  {
    name: 'Anisha Shrestha',
    slug: 'anisha-shrestha',
    role: 'Operations Manager',
    initials: 'AS',
    color: '#4a306d',
    bio: 'Kathmandu operations, permits, Lukla coordination, and custom itinerary design.',
    experience: 'Coordinates peak-season aviation, restricted permits, and insurance checks before every departure.',
    language: 'English, Nepali',
    phone: '+977-1-4000000',
    whatsapp: '+977-9800000004',
    display_order: 5,
    active: true,
    description: blocks('Anisha is your pre-trek contact for packing questions, visa timing, and arrival planning.'),
  },
  {
    name: 'Nima Lama',
    slug: 'nima-lama',
    role: 'Climbing Guide',
    initials: 'NL',
    color: '#2c4a6e',
    bio: 'NMA-oriented climbing guide for Island Peak and Mera Peak.',
    experience: 'Glacier travel instruction, high-camp management, and conservative summit-day calls.',
    language: 'English, Nepali, Sherpa',
    phone: '+977-9800000006',
    whatsapp: '+977-9800000006',
    display_order: 6,
    active: true,
    description: blocks('Nima treats summit day as optional; getting the team down is the actual job.'),
  },
];

const blogCategoryDefs = [
  { name: 'Trekking Tips', slug: 'trekking-tips' },
  { name: 'Culture & Places', slug: 'culture-places' },
  { name: 'Seasons & Weather', slug: 'seasons-weather' },
  { name: 'Permits & Practical', slug: 'permits-practical' },
];

const blogDefs = [
  {
    title: 'How to Prepare for Your First Himalayan Trek',
    slug: 'prepare-first-himalayan-trek',
    categorySlug: 'trekking-tips',
    author: 'Anisha Shrestha',
    imageKey: 'hike',
    excerpt:
      'Training, gear, insurance, and altitude mindset for first-time trekkers heading to Everest, Annapurna, or Langtang.',
    tags: 'training, packing, altitude, beginner',
    seo: seo(
      'Prepare for Your First Himalayan Trek',
      'Training, packing, insurance, and altitude basics for first-time Nepal trekkers.'
    ),
    content: blocks(
      heading('Start with honest fitness'),
      'You do not need to be an athlete, but you do need consecutive hiking days in your legs. Build weekly hill walks with a weighted pack. Add stair intervals and mobility work for knees and hips.',
      heading('Think in layers'),
      'Nepal treks move through multiple climate bands. Pack moisture-wicking bases, an insulating mid-layer, a down or synthetic puffy, and a waterproof shell. Cotton stays wet — leave it at home.',
      heading('Insurance is not optional'),
      'Buy travel insurance that explicitly covers trekking to your maximum altitude and helicopter evacuation. Carry policy numbers offline and share them with your operator.',
      heading('Respect altitude'),
      'Ascend gradually, hydrate, and tell your guide early if you have headache, nausea, or unusual fatigue. Descent is the definitive treatment for serious AMS.'
    ),
  },
  {
    title: 'Best Time to Trek in Nepal: Season-by-Season Guide',
    slug: 'best-time-trek-nepal',
    categorySlug: 'seasons-weather',
    author: 'Maya Gurung',
    imageKey: 'sunrise',
    excerpt:
      'Compare spring blooms, autumn clarity, winter solitude, and monsoon realities across Nepal’s major trekking regions.',
    tags: 'spring, autumn, monsoon, winter',
    seo: seo('Best Time to Trek in Nepal', 'Season guide for Everest, Annapurna, Langtang, Manaslu, Mustang and Dolpo.'),
    content: blocks(
      heading('Autumn (late September–November)'),
      'Generally the most stable skies and clearest mountain views after monsoon washes dust from the air. Expect busier trails and earlier lodge bookings on classic routes.',
      heading('Spring (March–May)'),
      'Rhododendrons paint the mid-hills; mornings are often clear before afternoon cloud. Popular for trekking peaks as well as tea-house treks.',
      heading('Winter and monsoon'),
      'Winter offers solitude and cold nights; high passes may hold snow. Monsoon (June–August) means lush hills, leeches at lower elevations, and blocked views — Upper Mustang and Dolpo’s rain shadow can still work.'
    ),
  },
  {
    title: 'Namche Bazaar: Acclimatization Done Right',
    slug: 'namche-bazaar-acclimatization',
    categorySlug: 'culture-places',
    author: 'Pembu Sherpa',
    imageKey: 'namche',
    excerpt:
      'Why the Everest trek pauses in Namche, what to do on your rest day, and how Sherpa culture shapes the Khumbu experience.',
    tags: 'namche, everest, sherpa, acclimatization',
    seo: seo('Namche Bazaar Acclimatization', 'Make the most of your Namche rest day on the EBC trek.'),
    content: blocks(
      heading('Why Namche matters'),
      'At about 3,440 m, Namche is the gateway to high Khumbu. A rest day with an active hike — climb high, sleep low — dramatically improves later days toward Dingboche and Lobuche.',
      heading('What to do'),
      'Hike toward the Everest View Hotel or Syangboche for panorama practice. Visit the museum, browse the Saturday market when timed right, and hydrate more than you think you need.',
      'Support local bakeries and fair lodge practices — tourism is the backbone of the valley economy.'
    ),
  },
  {
    title: 'Annapurna vs Everest: Which Trek Should You Choose?',
    slug: 'annapurna-vs-everest',
    categorySlug: 'trekking-tips',
    author: 'Dorje Tamang',
    imageKey: 'abc',
    excerpt:
      'Side-by-side comparison of scenery, altitude, logistics, cost, and crowd levels to help you pick ABC or Circuit versus EBC.',
    tags: 'comparison, abc, ebc, planning',
    seo: seo(
      'Annapurna vs Everest Trek',
      'Compare Annapurna Base Camp and Circuit with Everest Base Camp for your first Nepal trek.'
    ),
    content: blocks(
      heading('Choose Everest if…'),
      'You want the iconic Base Camp narrative, Sherpa culture, and are comfortable with Lukla flight uncertainty and higher sleeping altitudes.',
      heading('Choose Annapurna if…'),
      'You prefer Pokhara logistics, slightly lower max altitude at ABC, or a long varied Circuit with a major pass. Both are life-changing — match the route to your calendar and risk comfort.'
    ),
  },
  {
    title: 'Responsible Trekking in Restricted Areas',
    slug: 'responsible-trekking-restricted-areas',
    categorySlug: 'permits-practical',
    author: 'Anisha Shrestha',
    imageKey: 'mustang',
    excerpt:
      'Permit ethics, cultural respect, and waste practices for Manaslu, Upper Mustang, Nar Phu, and Dolpo.',
    tags: 'permits, mustang, manaslu, responsible tourism',
    seo: seo(
      'Responsible Trekking in Restricted Areas',
      'How to trek Manaslu, Mustang, Nar Phu and Dolpo respectfully with proper permits.'
    ),
    content: blocks(
      heading('Permits protect places'),
      'Restricted permits are not bureaucracy for its own sake — they fund management and control numbers. Always trek with the required licensed guide and keep permit papers accessible at checkpoints.',
      heading('Culture and waste'),
      'Ask before photographing people, dress modestly at monasteries, and pack out what you pack in. Carry a reusable bottle and use boiled or treated water instead of single-use plastic where possible.'
    ),
  },
  {
    title: 'Lukla Flights: What to Expect When Weather Wins',
    slug: 'lukla-flights-weather',
    categorySlug: 'permits-practical',
    author: 'Anisha Shrestha',
    imageKey: 'everest',
    excerpt: 'How we handle delayed Kathmandu–Lukla flights, helicopter options, and why buffer days matter.',
    tags: 'lukla, flights, everest, logistics',
    seo: seo('Lukla Flight Delays Explained', 'Practical advice for weather delays on the Everest trek flight.'),
    content: blocks(
      heading('Weather is the boss'),
      'Lukla is a visual-flight airport in a steep valley. Cloud, wind, and backlog can cancel a full morning of tickets. We rebook the next available sector and help with extra Kathmandu lodging.',
      heading('Helicopters'),
      'Charter helicopters can sometimes move small groups when fixed-wing traffic is stopped. They cost extra, depend on visibility, and are never guaranteed. We only suggest them when they are the honest option.',
      heading('Build buffer'),
      'Do not book an international departure the same calendar day as your planned Lukla return. One spare day in Kathmandu is cheap insurance.'
    ),
  },
  {
    title: 'Tea House vs Camping: How Nepal Treks Are Supported',
    slug: 'tea-house-vs-camping',
    categorySlug: 'trekking-tips',
    author: 'Tashi Bista',
    imageKey: 'camp',
    excerpt: 'When you sleep in lodges, when we carry tents, and what that means for cost, comfort, and wilderness routes.',
    tags: 'tea house, camping, dolpo, logistics',
    seo: seo('Tea House vs Camping Treks in Nepal', 'Lodge treks versus camping expeditions on remote restricted routes.'),
    content: blocks(
      heading('Tea houses'),
      'On Everest, Annapurna, Langtang, and much of Manaslu you sleep in family-run lodges: twin rooms, dal bhat, and a dining-room stove. Comfort varies with altitude and season.',
      heading('Camping'),
      'Upper Dolpo, parts of Kanchenjunga, and some Makalu nights still need tents, a kitchen crew, and more porters. You gain wilderness access and pay for the extra logistics.',
      heading('Hybrids'),
      'Many “camping” treks still use lodges where they exist. Your trip page states the mix so you can pack the right sleeping bag.'
    ),
  },
  {
    title: 'Altitude Illness: A Plain-Language Briefing',
    slug: 'altitude-illness-briefing',
    categorySlug: 'trekking-tips',
    author: 'Nima Lama',
    imageKey: 'snow',
    excerpt: 'AMS, HAPE, and HACE signs we watch on trek — and why turning around is a successful decision.',
    tags: 'ams, altitude, safety, health',
    seo: seo('Altitude Illness on Nepal Treks', 'Recognising AMS and why descent is the treatment that works.'),
    content: blocks(
      heading('Normal vs not normal'),
      'Mild headache and poor sleep at a new altitude can be ordinary. Vomiting, confusion, severe breathlessness at rest, or a wet cough are not. Tell your guide early — pride is how people get into trouble.',
      heading('Prevention'),
      'Our itineraries already include rest days. Do not skip them to “save a day.” Drink water, go slowly, and avoid alcohol at altitude.',
      heading('Treatment'),
      'Descent is the definitive treatment for worsening altitude illness. Medication and oxygen are adjuncts, not a reason to keep climbing.'
    ),
  },
  {
    title: 'Packing List for a 14-Day Tea House Trek',
    slug: 'packing-list-tea-house-trek',
    categorySlug: 'trekking-tips',
    author: 'Maya Gurung',
    imageKey: 'hike',
    excerpt: 'A field-tested layering and kit list for EBC, ABC, or Langtang — what you carry vs what the porter takes.',
    tags: 'packing, gear, ebc, abc',
    seo: seo('Nepal Trek Packing List', 'Layering and kit list for a two-week tea-house trek in Nepal.'),
    content: blocks(
      heading('On your back'),
      'Daypack 30–35 L: water, layers, camera, snacks, rain shell, first-aid, documents. Keep the rain cover accessible.',
      heading('In the porter bag'),
      'Sleeping bag, spare clothes, down jacket for evenings, toiletries. Aim for 10 kg personal kit so two trekkers stay under 20 kg combined.',
      heading('Hire in Kathmandu'),
      'Quality sleeping bags and down jackets are easy to rent in Thamel. Boots should be broken in at home — do not trek in brand-new footwear.'
    ),
  },
  {
    title: 'Mustang in the Rain Shadow: Why It Works in Monsoon',
    slug: 'mustang-monsoon-travel',
    categorySlug: 'seasons-weather',
    author: 'Tashi Bista',
    imageKey: 'mustang',
    excerpt: 'How Upper Mustang stays comparatively dry when the rest of Nepal is in cloud, and what wind and dust still do.',
    tags: 'mustang, monsoon, seasons, lo manthang',
    seo: seo('Upper Mustang in Monsoon', 'Why the rain shadow makes Mustang a summer option — with caveats.'),
    content: blocks(
      heading('The rain shadow'),
      'The Annapurna and Dhaulagiri massifs wring moisture from the monsoon. Upper Mustang often stays walkable when Khumbu is wrapped in cloud. That does not mean zero rain — it means better odds.',
      heading('Still bring a shell'),
      'Wind, dust, and strong sun are the daily factors. Evenings are cold. Restricted permits still apply regardless of season.',
      heading('Flights'),
      'Jomsom aviation has its own wind limits. Road access via Beni has improved; we choose flight or drive based on the week’s forecast.'
    ),
  },
];

const reviewPool = [
  {
    tripSlug: 'everest-base-camp-trek',
    guide: 'Pembu Sherpa',
    reviewer_name: 'Sarah Mitchell',
    country: 'United Kingdom',
    rating: 5,
    title: 'Careful pacing all the way to Base Camp',
    source: 'website',
    trip_date: '2025-10-12',
    review:
      'Pembu managed pace carefully and the porter team was wonderful. Tea houses were booked ahead during peak season, which made a huge difference. Kala Patthar sunrise was the highlight of the decade for me.',
  },
  {
    tripSlug: 'everest-base-camp-trek',
    guide: 'Pembu Sherpa',
    reviewer_name: 'Kenji Tanaka',
    country: 'Japan',
    rating: 5,
    title: 'Lukla delay handled without drama',
    source: 'tripadvisor',
    trip_date: '2025-05-03',
    review:
      'Lukla flights delayed one day; the office adjusted hotels and kept us informed. Daily altitude briefings were clear. I would book the 14-day version again rather than a shorter profile.',
  },
  {
    tripSlug: 'gokyo-lakes-trek',
    guide: 'Pembu Sherpa',
    reviewer_name: 'Ingrid Nilsen',
    country: 'Norway',
    rating: 5,
    title: 'Quieter lakes, huge views',
    source: 'website',
    trip_date: '2025-10-28',
    review:
      'Gokyo Ri in still air was unforgettable. Lodges after Dole felt calmer than the EBC highway. Guide knowledge of the Ngozumpa side trails was excellent.',
  },
  {
    tripSlug: 'annapurna-base-camp-trek',
    guide: 'Maya Gurung',
    reviewer_name: 'Lucas Berger',
    country: 'Germany',
    rating: 4,
    title: 'Sanctuary light and honest lodges',
    source: 'google',
    trip_date: '2025-11-02',
    review:
      'ABC exceeded expectations. One lodge was basic but authentic. Maya knew every timing trick when afternoon cloud rolled into the sanctuary. Jhinu hot springs were a gift for the knees.',
  },
  {
    tripSlug: 'ghorepani-poon-hill-trek',
    guide: 'Maya Gurung',
    reviewer_name: 'Priya Sharma',
    country: 'India',
    rating: 5,
    title: 'Perfect first Himalayan sunrise',
    source: 'website',
    trip_date: '2026-03-18',
    review:
      'We travelled with teenagers. Steps were hard, views were worth it. Poon Hill at dawn showed Dhaulagiri clearly. Organisation from Pokhara was simple.',
  },
  {
    tripSlug: 'mardi-himal-trek',
    guide: 'Maya Gurung',
    reviewer_name: 'Owen Clarke',
    country: 'New Zealand',
    rating: 5,
    title: 'Machhapuchhre from the ridge',
    source: 'tripadvisor',
    trip_date: '2025-04-09',
    review:
      'High Camp is exposed and the dining room is small, but waking up under Machhapuchhre beats a crowded ABC night for me. Shoulder-season snow on the viewpoint — guide called a safe turnaround time.',
  },
  {
    tripSlug: 'annapurna-circuit-trek',
    guide: 'Dorje Tamang',
    reviewer_name: 'Elena Rossi',
    country: 'Italy',
    rating: 5,
    title: 'Thorong La done properly',
    source: 'website',
    trip_date: '2025-10-18',
    review:
      'Manang rest day made the pass possible. We used a short jeep only on a dusty road section — the rest was real trail. Muktinath afternoon was windy and wonderful.',
  },
  {
    tripSlug: 'manaslu-circuit-trek',
    guide: 'Dorje Tamang',
    reviewer_name: 'Emily Chen',
    country: 'Australia',
    rating: 5,
    title: 'Quiet trails and a serious pass',
    source: 'website',
    trip_date: '2025-10-20',
    review:
      'Manaslu felt remote in the best way. Permits were handled before we left Kathmandu. Larkya La was tough; the team’s timing out of Dharamsala was perfect.',
  },
  {
    tripSlug: 'langtang-valley-trek',
    guide: 'Dorje Tamang',
    reviewer_name: 'Michael Rossi',
    country: 'Italy',
    rating: 4,
    title: 'Ideal short escape from Kathmandu',
    source: 'google',
    trip_date: '2026-03-15',
    review:
      'No flight stress. Trails were peaceful and Kyanjin Ri was worth the early alarm. Road to Syabrubesi is still a long day — bring motion-sickness tablets if you need them.',
  },
  {
    tripSlug: 'upper-mustang-trek',
    guide: 'Tashi Bista',
    reviewer_name: 'Sophie Laurent',
    country: 'France',
    rating: 5,
    title: 'Lo Manthang felt like another country',
    source: 'website',
    trip_date: '2025-09-08',
    review:
      'Cultural explanations were thoughtful and respectful. Jeep sections saved our knees on road-walk without losing the magic of the canyons. Permits were invisible to us — as they should be.',
  },
  {
    tripSlug: 'island-peak-climbing',
    guide: 'Nima Lama',
    reviewer_name: 'David Okonkwo',
    country: 'United States',
    rating: 5,
    title: 'Honest mountaineering, not a photo-op',
    source: 'tripadvisor',
    trip_date: '2025-05-12',
    review:
      'Glacier training at Chhukung was clear. Summit day was cold and long. Nima would have turned us around without ego if the wind had stayed high. That is why I booked this company.',
  },
  {
    tripSlug: 'chitwan-jungle-safari',
    guide: 'Lodge naturalist',
    reviewer_name: 'Hannah Berg',
    country: 'Sweden',
    rating: 5,
    title: 'Rhinos after the mountains',
    source: 'google',
    trip_date: '2025-11-08',
    review:
      'Three days in Sauraha was the right decompression after ABC. Jeep safari saw rhino and gharial. Lodge food was generous. Easy logistics from Pokhara.',
  },
  {
    tripSlug: 'everest-three-passes-trek',
    guide: 'Pembu Sherpa',
    reviewer_name: 'Jonas Weber',
    country: 'Switzerland',
    rating: 5,
    title: 'The Khumbu as a proper circuit',
    source: 'website',
    trip_date: '2025-10-05',
    review:
      'Kongma La and Cho La in one trip is a lot of mountain. Acclimatization was conservative. Renjo La into Thame felt like a secret exit. Not a first trek — the briefing said so and they were right.',
  },
  {
    tripSlug: 'nar-phu-valley-trek',
    guide: 'Tashi Bista',
    reviewer_name: 'Claire Dubois',
    country: 'Canada',
    rating: 5,
    title: 'Villages that still feel far away',
    source: 'website',
    trip_date: '2025-04-22',
    review:
      'Phu was the highlight. Kang La was a full day. Restricted paperwork was done before we reached Koto. Lodges are simple — pack for that, not for Namche bakeries.',
  },
];

function faq(tripSlug, question, answer, display_order = 1) {
  return {
    tripSlug,
    question,
    display_order,
    active: true,
    answer: blocks(answer),
  };
}

const faqDefs = [
  faq(
    'everest-base-camp-trek',
    'How fit do I need to be for the Everest Base Camp Trek?',
    'You should be comfortable walking 5–7 hours a day on consecutive days with a daypack. Prior hill-walking helps. We recommend cardio and weighted-pack training for 8–12 weeks. Altitude affects everyone differently — fitness reduces fatigue but does not eliminate AMS risk.',
    1
  ),
  faq(
    'everest-base-camp-trek',
    'What happens if Lukla flights are cancelled?',
    'Weather often delays Lukla flights. We rebook the next available sector and help with extra Kathmandu lodging (usually at your cost unless stated otherwise). In prolonged closures, helicopter options may be available at additional cost and are never guaranteed.',
    2
  ),
  faq(
    'everest-base-camp-trek',
    'Do you provide sleeping bags and down jackets?',
    'You can rent quality sleeping bags and down jackets in Kathmandu. We share a packing list after booking and can arrange rentals before the Lukla flight. Boots should be yours and already broken in.',
    3
  ),
  faq(
    'everest-base-camp-trek',
    'Is travel insurance mandatory?',
    'Yes. Your policy must cover trekking to at least 6,000 m and helicopter evacuation. We collect insurer name and policy number before you fly to Lukla.',
    4
  ),
  faq(
    'annapurna-base-camp-trek',
    'Is Annapurna Base Camp easier than Everest Base Camp?',
    'ABC is lower in maximum elevation and avoids the Lukla flight, so many trekkers find logistics simpler. Steep stone staircases and sanctuary weather still make it a serious trek — treat it with the same preparation respect.',
    1
  ),
  faq(
    'annapurna-base-camp-trek',
    'Can I start this trek in Pokhara only?',
    'Yes. The published itinerary is Pokhara-based. Kathmandu–Pokhara tourist bus or flight can be added. Tell us your arrival city when you inquire.',
    2
  ),
  faq(
    'annapurna-circuit-trek',
    'Has the road ruined the Annapurna Circuit?',
    'Roads have shortened some stages and added dust in places. We keep you on historic trail wherever it is safer and more beautiful, using short vehicle links only to skip the worst road-walk. Thorong La and Manang still define the trek.',
    1
  ),
  faq(
    'manaslu-circuit-trek',
    'Why is Manaslu a restricted area?',
    'Parts of the route require a Restricted Area Permit arranged through a registered agency with a licensed guide. This manages tourism in a sensitive border region and is not optional.',
    1
  ),
  faq(
    'upper-mustang-trek',
    'Can I visit Upper Mustang independently?',
    'No. Restricted permits, a licensed guide, and itinerary rules apply. We handle paperwork so you can focus on the walking and the walled city.',
    1
  ),
  faq(
    'upper-mustang-trek',
    'How much is the restricted permit?',
    'The government sets a per-person, per-night tariff inside the restricted zone. It is included in our published package for the itinerary length. Extra nights, if you extend, are billed at the gazetted rate.',
    2
  ),
  faq(
    'island-peak-climbing',
    'Do I need previous mountaineering experience?',
    'Prior high-altitude trekking is strongly recommended. Formal climbing experience helps but is not always mandatory — we provide glacier skills training. Your guide may turn back for safety if conditions or fitness require it.',
    1
  ),
  faq(
    'mera-peak-climbing',
    'Is Mera easier than Island Peak?',
    'Mera is higher and usually less steep on the final ridge, but the glacier is long and the cold is serious. “Easier” is the wrong word. Fitness and conservative acclimatization matter more than a short technical crux.',
    1
  ),
  faq(
    'langtang-valley-trek',
    'Do I need a domestic flight?',
    'No. The trek starts with a drive to Syabrubesi. The road is winding; plan a full day and consider motion-sickness precautions.',
    1
  ),
  faq(
    'ghorepani-poon-hill-trek',
    'Is Poon Hill suitable for children?',
    'Active older children who hike at home often enjoy it. There are many stone steps. We can slow the profile and add a rest night. This is not a high-altitude trek, but it is still a mountain walk.',
    1
  ),
  faq(
    'tilicho-lake-trek',
    'Can the Tilicho trail close?',
    'Yes. Landslide sections west of Khangsar close after storms. If the path is unsafe we skip the lake and continue the Circuit. Your safety is not negotiable for a photograph.',
    1
  ),
  faq(
    'chitwan-jungle-safari',
    'Will I see a tiger?',
    'Tigers are rare. One-horned rhinoceros, deer, monkeys, and many birds are far more likely. We never bait or guarantee species.',
    1
  ),
  faq(
    'lhasa-everest-base-camp-overland',
    'Do I need a Tibet permit as well as a Chinese visa?',
    'In most cases yes: a Chinese visa (where required for your nationality) plus a Tibet Travel Permit processed through a licensed operator. We cannot accept independent travellers. Send passport scans as soon as you book.',
    1
  ),
  faq(
    'bhutan-cultural-tour',
    'What is the Sustainable Development Fee?',
    'Bhutan charges an SDF per person per night at a rate set by the government. Our package includes the SDF for the listed nights at the rate in force when we invoice. Festival weeks and policy changes can affect the total.',
    1
  ),
  faq(
    null,
    'How do I book a fixed departure?',
    'Choose a trip, note an open departure date, and either check out online or send an inquiry with names, passport nationalities, and insurance status. A deposit confirms services. Balance dates are on your invoice.',
    1
  ),
  faq(
    null,
    'What is your usual group size?',
    'Tea-house treks typically run from 2 to 12 people. Climbing trips are smaller. Private departures can be arranged for two people on most routes, subject to permit minimums on restricted treks.',
    2
  ),
  faq(
    null,
    'Do you arrange Nepal visas?',
    'Most nationalities obtain a tourist visa on arrival or e-visa. We send current official links; we do not stamp visas ourselves. Restricted-area and Tibet/Bhutan paperwork is separate and is part of those packages.',
    3
  ),
];

const offices = [
  {
    type: 'Head Office',
    country: 'Nepal',
    city: 'Kathmandu',
    address: 'Thamel Marg, Kathmandu 44600',
    contact_person: 'Anisha Shrestha',
    phone: '+977-1-4000000',
    whatsapp: '+977-9800000000',
    email: 'info@nepaltrails.example',
    google_map: 'https://maps.google.com/?q=Thamel,Kathmandu',
  },
  {
    type: 'Branch',
    country: 'Nepal',
    city: 'Pokhara',
    address: 'Lakeside Road, Pokhara 33700',
    contact_person: 'Maya Gurung',
    phone: '+977-61-400000',
    whatsapp: '+977-9800000002',
    email: 'pokhara@nepaltrails.example',
    google_map: 'https://maps.google.com/?q=Lakeside,Pokhara',
  },
  {
    type: 'Liaison',
    country: 'Nepal',
    city: 'Lukla (seasonal desk)',
    address: 'Tenzing-Hillary Airport area, Lukla',
    contact_person: 'Pembu Sherpa',
    phone: '+977-9800000001',
    whatsapp: '+977-9800000001',
    email: 'lukla@nepaltrails.example',
    google_map: 'https://maps.google.com/?q=Lukla,Nepal',
  },
];

const partners = [
  { name: 'Nepal Tourism Board', website: 'https://ntb.gov.np', display_order: 1, mark: 'NTB' },
  { name: 'Trekking Agencies Association of Nepal', website: 'https://www.taan.org.np', display_order: 2, mark: 'TAAN' },
  { name: 'Nepal Mountaineering Association', website: 'https://www.nepalmountaineering.org', display_order: 3, mark: 'NMA' },
  { name: 'Kathmandu Environmental Education Project', website: 'https://www.keepnepal.org', display_order: 4, mark: 'KEEP' },
];

const staticPages = [
  {
    title: 'About Us',
    slug: 'about',
    imageKey: 'everest',
    content:
      'We are a Kathmandu-based adventure operator specialising in trekking, peak climbing, and cultural journeys across Nepal, with selected programs in Tibet and Bhutan. Our guides are locally employed, insured, and trained in wilderness first aid. We design itineraries for safe acclimatization, fair staff wages, and honest pre-trip communication.\n\nWhether you want a classic Everest Base Camp departure or a custom restricted-area expedition, operations handle permits, flights, and lodge logistics so you can focus on the trail.',
    seo: seo(
      'About Our Nepal Trekking Company',
      'Locally led trekking and touring company based in Kathmandu — guides, safety, and responsible travel.'
    ),
  },
  {
    title: 'Contact',
    slug: 'contact',
    imageKey: 'kathmandu',
    content:
      'Email: info@nepaltrails.example\nPhone / WhatsApp: +977-9800000000\nOffice: Thamel, Kathmandu, Nepal\nPokhara: Lakeside Road\n\nTell us your preferred dates, group size, and trek ideas. We respond within one business day with a proposed itinerary and quote. For urgent arrival support, use WhatsApp with your flight details.',
    seo: seo('Contact Us', 'Contact our Kathmandu team for trek planning, fixed departures, and custom itineraries.'),
  },
  {
    title: 'Terms & Conditions',
    slug: 'terms',
    imageKey: 'hike',
    content:
      'Bookings require a deposit to confirm services. Balance due dates, cancellation tiers, and force-majeure flight policies are listed on your invoice. Travel insurance is mandatory. Itineraries may change due to weather, landslides, or aviation disruptions. Full legal terms are provided in your booking confirmation email.',
    seo: seo('Terms & Conditions', 'Booking, cancellation, and travel terms for our Nepal trekking services.'),
  },
  {
    title: 'Privacy Policy',
    slug: 'privacy',
    imageKey: 'kathmandu',
    content:
      'We collect inquiry details (name, email, phone, trip preferences) solely to respond to your request and deliver booked services. We do not sell personal data. Payment processing, where used, is handled by compliant providers. Contact us to update or delete inquiry records where applicable.',
    seo: seo('Privacy Policy', 'How we handle inquiry and customer data for trek bookings.'),
  },
  {
    title: 'Responsible Travel',
    slug: 'responsible-travel',
    imageKey: 'sunrise',
    content:
      'We pay staff legally, carry insurance for guides and porters, and brief guests on Leave No Trace in the Himalaya. Restricted-area fees fund local management. We ask you to treat water as precious, refuse unnecessary plastic, and ask before photographs of people.\n\nPorter loads are capped. If you see a practice you dislike on the trail, tell the operations team — we would rather hear it in Kathmandu than read it after you fly home.',
    seo: seo('Responsible Travel', 'How we treat staff, trails, and host communities on Himalayan journeys.'),
  },
];

const videoReviews = [
  {
    tripSlug: 'everest-base-camp-trek',
    reviewer_name: 'Sarah Mitchell',
    country: 'United Kingdom',
    title: 'EBC trek day-by-day reflections',
    display_order: 1,
    imageKey: 'everest',
  },
  {
    tripSlug: 'annapurna-base-camp-trek',
    reviewer_name: 'Lucas Berger',
    country: 'Germany',
    title: 'Arriving at Annapurna Sanctuary',
    display_order: 2,
    imageKey: 'abc',
  },
  {
    tripSlug: 'upper-mustang-trek',
    reviewer_name: 'Sophie Laurent',
    country: 'France',
    title: 'Wind and light in Lo Manthang',
    display_order: 3,
    imageKey: 'mustang',
  },
];

const inquiries = [
  {
    tripSlug: 'everest-base-camp-trek',
    trip_label: 'Everest Base Camp Trek',
    type: 'trek-inquiry',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1-555-0100',
    country: 'USA',
    message: 'Interested in the October EBC departure for 2 people. Do you have sleeping bag rentals?',
    preferred_date: '2026-10-05',
    group_size: 2,
    inquiry_status: 'new',
  },
  {
    tripSlug: 'upper-mustang-trek',
    trip_label: 'Upper Mustang Trek',
    type: 'custom',
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    phone: '+91-9800000000',
    country: 'India',
    message: 'Looking for a private Upper Mustang trip in September for a family of 4 (teens included).',
    preferred_date: '2026-09-10',
    group_size: 4,
    inquiry_status: 'new',
  },
  {
    tripSlug: 'island-peak-climbing',
    trip_label: 'Island Peak Climbing',
    type: 'climb-inquiry',
    name: 'Marcus Holm',
    email: 'marcus.holm@example.com',
    phone: '+46-700000000',
    country: 'Sweden',
    message: 'Two of us have trekked EBC before. Want Island Peak in May. Do you rent double boots in Kathmandu?',
    preferred_date: '2027-05-02',
    group_size: 2,
    inquiry_status: 'in_progress',
  },
];

const newsletters = [
  { email: 'newsletter.one@example.com', active: true },
  { email: 'newsletter.two@example.com', active: true },
  { email: 'alumni.trekker@example.com', active: false },
];

/** Autumn 2026 + spring 2027 sample departures for featured routes */
function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dep(tripSlug, start, durationDays, price, discount, seats, booked, status) {
  return {
    tripSlug,
    start_date: start,
    end_date: addDays(start, durationDays - 1),
    price,
    discount,
    total_seats: seats,
    booked_seats: booked,
    departure_status: status,
  };
}

const departures = [
  dep('everest-base-camp-trek', '2026-09-12', 14, 1490, 1390, 12, 4, 'open'),
  dep('everest-base-camp-trek', '2026-10-05', 14, 1490, null, 12, 9, 'limited'),
  dep('everest-base-camp-trek', '2026-10-19', 14, 1490, null, 12, 2, 'open'),
  dep('everest-base-camp-trek', '2027-03-28', 14, 1540, null, 12, 1, 'open'),
  dep('everest-base-camp-short-trek', '2026-10-08', 12, 1290, 1190, 10, 3, 'open'),
  dep('gokyo-lakes-trek', '2026-10-11', 13, 1390, 1290, 10, 2, 'open'),
  dep('everest-three-passes-trek', '2026-10-03', 19, 1890, null, 8, 5, 'limited'),
  dep('everest-view-trek', '2026-11-02', 8, 990, 920, 8, 1, 'open'),
  dep('annapurna-base-camp-trek', '2026-09-20', 11, 990, 920, 10, 2, 'open'),
  dep('annapurna-base-camp-trek', '2026-10-12', 11, 990, null, 10, 6, 'open'),
  dep('annapurna-base-camp-trek', '2027-03-15', 11, 1020, null, 10, 0, 'open'),
  dep('annapurna-circuit-trek', '2026-10-10', 16, 1290, null, 8, 8, 'full'),
  dep('annapurna-circuit-trek', '2026-10-24', 16, 1290, null, 8, 3, 'open'),
  dep('ghorepani-poon-hill-trek', '2026-10-01', 8, 690, 640, 12, 4, 'open'),
  dep('ghorepani-poon-hill-trek', '2026-10-15', 8, 690, null, 12, 7, 'limited'),
  dep('mardi-himal-trek', '2026-10-18', 9, 790, 750, 10, 2, 'open'),
  dep('manaslu-circuit-trek', '2026-10-02', 14, 1690, null, 8, 3, 'open'),
  dep('manaslu-circuit-trek', '2026-10-16', 14, 1690, null, 8, 6, 'limited'),
  dep('upper-mustang-trek', '2026-09-01', 14, 2490, 2350, 6, 1, 'open'),
  dep('upper-mustang-trek', '2026-10-06', 14, 2490, null, 6, 4, 'limited'),
  dep('langtang-valley-trek', '2026-10-09', 9, 790, 750, 10, 2, 'open'),
  dep('island-peak-climbing', '2026-10-15', 18, 2890, null, 4, 2, 'guaranteed'),
  dep('mera-peak-climbing', '2026-10-12', 18, 2690, 2550, 6, 1, 'open'),
  dep('nar-phu-valley-trek', '2026-10-04', 16, 1890, 1790, 8, 2, 'open'),
  dep('chitwan-jungle-safari', '2026-10-22', 3, 290, 260, 8, 3, 'open'),
  dep('bhutan-cultural-tour', '2026-10-08', 8, 2490, null, 8, 2, 'open'),
  dep('lhasa-everest-base-camp-overland', '2026-09-15', 8, 1890, null, 10, 4, 'open'),
];

module.exports = {
  destinations,
  regionDefs,
  activityDefs,
  trips: [...everestTrips, ...annapurnaTrips, ...otherTrips],
  team,
  blogCategoryDefs,
  blogDefs,
  reviewPool,
  faqDefs,
  offices,
  partners,
  staticPages,
  videoReviews,
  inquiries,
  newsletters,
  departures,
};
