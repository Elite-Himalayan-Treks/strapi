'use strict';

/**
 * Seed rich Nepal trek/tour test content for frontend development.
 * Usage: node ./scripts/seed-testdata.js
 * Stop `strapi develop` first if SQLite is locked.
 */

function paragraph(text) {
  return {
    type: 'paragraph',
    children: [{ type: 'text', text }],
  };
}

function heading(text, level = 2) {
  return {
    type: 'heading',
    level,
    children: [{ type: 'text', text }],
  };
}

function blocks(...parts) {
  return parts.map((p) => (typeof p === 'string' ? paragraph(p) : p));
}

function seo(metaTitle, metaDescription, keywords = '') {
  return {
    metaTitle,
    metaDescription,
    keywords,
    canonical: '',
  };
}

async function setPublicPermissions(strapi, newPermissions) {
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  const existing = await strapi.query('plugin::users-permissions.permission').findMany({
    where: { role: publicRole.id },
  });
  const existingActions = new Set(existing.map((p) => p.action));

  const toCreate = [];
  for (const [controller, actions] of Object.entries(newPermissions)) {
    for (const action of actions) {
      const fullAction = `api::${controller}.${controller}.${action}`;
      if (existingActions.has(fullAction)) continue;
      toCreate.push(
        strapi.query('plugin::users-permissions.permission').create({
          data: { action: fullAction, role: publicRole.id },
        })
      );
    }
  }
  await Promise.all(toCreate);
  console.log(`Public permissions ensured (${toCreate.length} new).`);
}

async function createPublished(strapi, uid, data) {
  const meta = strapi.contentType(uid);
  const hasDraftPublish = meta?.options?.draftAndPublish !== false;
  return strapi.documents(uid).create({
    data,
    ...(hasDraftPublish ? { status: 'published' } : {}),
  });
}

async function upsertSingle(strapi, uid, data) {
  const existing = await strapi.documents(uid).findFirst({});
  const meta = strapi.contentType(uid);
  const hasDraftPublish = meta?.options?.draftAndPublish !== false;
  if (existing?.documentId) {
    return strapi.documents(uid).update({
      documentId: existing.documentId,
      data,
      ...(hasDraftPublish ? { status: 'published' } : {}),
    });
  }
  return createPublished(strapi, uid, data);
}

async function deleteAll(strapi, uid) {
  const docs = await strapi.documents(uid).findMany({ limit: 1000 });
  for (const doc of docs) {
    await strapi.documents(uid).delete({ documentId: doc.documentId });
  }
}

async function seed(strapi) {
  const tripCount = await strapi.db.query('api::trip.trip').count();
  if (tripCount > 0 && process.env.FORCE_SEED !== '1') {
    console.log(
      `Database already has ${tripCount} trip(s). Aborting. Re-run with FORCE_SEED=1 to wipe content types and re-seed.`
    );
    return;
  }

  if (process.env.FORCE_SEED === '1' || tripCount === 0) {
    console.log('Clearing existing seeded content types...');
    const uids = [
      'api::inquiry.inquiry',
      'api::video-review.video-review',
      'api::faq.faq',
      'api::review.review',
      'api::fixed-departure.fixed-departure',
      'api::blog.blog',
      'api::blog-catagory.blog-catagory',
      'api::trip.trip',
      'api::team-member.team-member',
      'api::static-page.static-page',
      'api::partner.partner',
      'api::office.office',
      'api::activity.activity',
      'api::region.region',
      'api::destination.destination',
    ];
    for (const uid of uids) {
      try {
        await deleteAll(strapi, uid);
      } catch (e) {
        console.log(`Skip clear ${uid}:`, e.message);
      }
    }
  }

  await setPublicPermissions(strapi, {
    destination: ['find', 'findOne'],
    region: ['find', 'findOne'],
    activity: ['find', 'findOne'],
    trip: ['find', 'findOne'],
    'fixed-departure': ['find', 'findOne'],
    review: ['find', 'findOne'],
    'video-review': ['find', 'findOne'],
    faq: ['find', 'findOne'],
    'team-member': ['find', 'findOne'],
    blog: ['find', 'findOne'],
    'blog-catagory': ['find', 'findOne'],
    'static-page': ['find', 'findOne'],
    'site-setting': ['find'],
    homepage: ['find'],
    header: ['find'],
    footer: ['find'],
    office: ['find', 'findOne'],
    partner: ['find', 'findOne'],
    inquiry: ['create'],
    newsletter: ['create'],
    about: ['find'],
    global: ['find'],
  });

  console.log('Seeding destinations...');
  const nepal = await createPublished(strapi, 'api::destination.destination', {
    name: 'Nepal',
    slug: 'nepal',
    is_active: true,
    seo: seo(
      'Nepal Trekking & Tours Destination',
      'Plan treks, tours, and adventures across Nepal — Everest, Annapurna, Langtang, Mustang and more.',
      'nepal, trekking, tours, himalaya'
    ),
    description: blocks(
      heading('Discover Nepal'),
      'Nepal is home to eight of the world’s fourteen 8,000-metre peaks, including Mount Everest, and a dense network of trekking trails that range from gentle foothill walks to high-altitude expeditions. Beyond the mountains, Kathmandu’s heritage squares, Pokhara’s lakeside calm, and wildlife reserves in the Terai make it a complete adventure and culture destination.',
      'This destination hub groups the major trekking regions we operate in. Each region page lists signature trips, seasons, and practical notes so you can compare routes before requesting a custom departure.'
    ),
  });

  const tibet = await createPublished(strapi, 'api::destination.destination', {
    name: 'Tibet',
    slug: 'tibet',
    is_active: true,
    seo: seo(
      'Tibet Tours & Overland Journeys',
      'Guided overland and cultural journeys across the Tibetan Plateau, including Lhasa and Everest Base Camp (North).',
      'tibet, lhasa, overland'
    ),
    description: blocks(
      heading('Tibet journeys'),
      'Our Tibet programs focus on cultural touring, plateau acclimatization, and classic overland routes. Permits and group logistics are arranged in advance; itineraries are paced for altitude.'
    ),
  });

  console.log('Seeding regions...');
  const regionDefs = [
    {
      name: 'Everest Region',
      slug: 'everest-region',
      destination: nepal.documentId,
      price_from: 1290,
      price_to: 4500,
      display_order: 1,
      featured: true,
      seo: seo('Everest Region Treks', 'EBC, Gokyo, Three Passes and shorter Everest viewpoint treks.')
      description: blocks(
        heading('Everest Region'),
        'The Khumbu is Nepal’s most iconic trekking area: Sherpa villages, suspension bridges, rhododendron forests, and glacier viewpoints beneath Everest, Lhotse, and Ama Dablam. Trails start after a dramatic flight into Lukla (or a longer drive/trek approach when flights are disrupted).',
        'Best seasons are spring (March–May) and autumn (late September–November). Winter is possible for experienced hikers; monsoon brings cloud and slippery trails.'
      ),
    },
    {
      name: 'Annapurna Region',
      slug: 'annapurna-region',
      destination: nepal.documentId,
      price_from: 890,
      price_to: 2800,
      display_order: 2,
      featured: true,
      seo: seo('Annapurna Region Treks', 'ABC, Annapurna Circuit, Poon Hill and family-friendly foothill walks.')
      description: blocks(
        heading('Annapurna Region'),
        'Centered on the Annapurna massif, this region offers extraordinary variety: subtropical farmland, Magar and Gurung villages, high passes like Thorong La, and the amphitheatre at Annapurna Base Camp. Access from Pokhara keeps logistics flexible.',
        'The Circuit has changed with new roads; we design itineraries that still prioritize trail sections and cultural stops.'
      ),
    },
    {
      name: 'Langtang Region',
      slug: 'langtang-region',
      destination: nepal.documentId,
      price_from: 750,
      price_to: 1600,
      display_order: 3,
      featured: true,
      seo: seo('Langtang Valley Treks', 'Langtang Valley, Kyanjin Ri and Gosaikunda combinations close to Kathmandu.')
      description: blocks(
        heading('Langtang Region'),
        'Langtang sits north of Kathmandu and delivers big mountain scenery without the Lukla flight. Tamang heritage, cheese factories at Kyanjin, and optional sacred lakes at Gosaikunda make it a strong mid-length trek.'
      ),
    },
    {
      name: 'Manaslu Region',
      slug: 'manaslu-region',
      destination: nepal.documentId,
      price_from: 1450,
      price_to: 2200,
      display_order: 4,
      featured: false,
      seo: seo('Manaslu Circuit Trek', 'Restricted-area circuit around Manaslu with Larkya La pass.')
      description: blocks(
        heading('Manaslu Region'),
        'The Manaslu Circuit is a restricted-area trek circling the world’s eighth-highest mountain. Expect quieter trails than Annapurna, Tibetan-influenced culture, and a challenging high pass at Larkya La (≈5,160 m).'
      ),
    },
    {
      name: 'Upper Mustang',
      slug: 'upper-mustang',
      destination: nepal.documentId,
      price_from: 2100,
      price_to: 3500,
      display_order: 5,
      featured: true,
      seo: seo('Upper Mustang Trek & Tour', 'Lo Manthang, desert landscapes and restricted-area culture of former Kingdom of Lo.')
      description: blocks(
        heading('Upper Mustang'),
        'Often called the last forbidden kingdom, Upper Mustang features arid cliffs, cave monasteries, and the walled city of Lo Manthang. Special permits apply; jeep-supported and trekking styles are both available.'
      ),
    },
  ];

  const regions = {};
  for (const r of regionDefs) {
    const { destination, ...rest } = r;
    const created = await createPublished(strapi, 'api::region.region', {
      ...rest,
      destination,
    });
    regions[r.slug] = created;
  }

  console.log('Seeding activities...');
  const activityDefs = [
    {
      name: 'Trekking',
      slug: 'trekking',
      display_order: 1,
      description:
        'Multi-day Himalayan treks with tea-house or camping support, licensed guides, and carefully paced acclimatization.',
    },
    {
      name: 'Peak Climbing',
      slug: 'peak-climbing',
      display_order: 2,
      description:
        'NMA trekking peaks such as Island Peak and Mera Peak — mountaineering skills, fixed ropes, and high-camp logistics.',
    },
    {
      name: 'Cultural Tours',
      slug: 'cultural-tours',
      display_order: 3,
      description:
        'Heritage walks, monastery visits, and village homestays focused on Newar, Sherpa, Gurung, and Tibetan cultures.',
    },
    {
      name: 'Adventure',
      slug: 'adventure',
      display_order: 4,
      description:
        'Rafting, paragliding, canyoning, and multi-activity itineraries based around Pokhara and the Trisuli / Seti rivers.',
    },
    {
      name: 'Wildlife & Nature',
      slug: 'wildlife-nature',
      display_order: 5,
      description:
        'Chitwan and Bardia jungle safaris, birdwatching, and lowland nature lodges combined with mountain itineraries.',
    },
    {
      name: 'Pilgrimage',
      slug: 'pilgrimage',
      display_order: 6,
      description:
        'Muktinath, Gosaikunda, Lumbini, and other sacred sites with respectful pacing and local ritual context.',
    },
  ];

  const activities = {};
  for (const a of activityDefs) {
    activities[a.slug] = await createPublished(strapi, 'api::activity.activity', a);
  }

  console.log('Seeding trips...');
  const tripDefs = [
    {
      title: 'Everest Base Camp Trek',
      slug: 'everest-base-camp-trek',
      trip_code: 'EBC-14',
      destination: 'Nepal',
      region: regions['everest-region'].documentId,
      activity: activities.trekking.documentId,
      short_description:
        'The classic 14-day journey to Everest Base Camp (5,364 m) via Namche, Tengboche, and Gorak Shep, with an optional Kala Patthar sunrise viewpoint.',
      overview:
        'The Everest Base Camp Trek is Nepal’s signature Himalayan adventure. Starting with a scenic flight to Lukla, you follow the Dudh Koshi valley into Sherpa heartland, acclimatize in Namche Bazaar, visit Tengboche Monastery, and continue through Pangboche and Dingboche to the glacial moraine at Base Camp.\n\nNights are spent in tea houses. Days combine steady walking with built-in rest for altitude. Our itineraries include buffer time for Lukla flight delays and clear briefings on Acute Mountain Sickness (AMS).\n\nThis trip suits fit first-time high-altitude trekkers who want iconic scenery, cultural immersion, and a well-supported tea-house style experience.',
      duration_days: 14,
      duration_night: 13,
      difficulty: 'moderate',
      max_altitude: '5545m (Kala Patthar)',
      start_point: 'Kathmandu / Lukla',
      end_point: 'Lukla / Kathmandu',
      group_size_min: 2,
      group_size_max: 12,
      best_season: 'March–May, September–November',
      price: 1490,
      discount_price: 1390,
      currency: 'USD',
      featured: true,
      route_map: '',
      view_count: 1280,
      highlights:
        '- Reach Everest Base Camp (5,364 m)\n- Sunrise views from Kala Patthar (5,545 m)\n- Acclimatization day with optional Everest View Hotel hike\n- Tengboche Monastery and Sherpa culture in Namche\n- Suspension bridges and rhododendron forests of Khumbu\n- Experienced local guide and porter support',
      itinerary:
        'Day 1: Arrive Kathmandu (1,400 m) — briefing and gear check\nDay 2: Fly to Lukla (2,840 m), trek to Phakding (2,610 m)\nDay 3: Phakding to Namche Bazaar (3,440 m)\nDay 4: Acclimatization in Namche — hike toward Everest View Hotel\nDay 5: Namche to Tengboche (3,860 m)\nDay 6: Tengboche to Dingboche (4,410 m)\nDay 7: Acclimatization in Dingboche — Nangkartshang viewpoint\nDay 8: Dingboche to Lobuche (4,940 m)\nDay 9: Lobuche to Gorak Shep (5,164 m), visit EBC (5,364 m), return Gorak Shep\nDay 10: Kala Patthar sunrise, descend to Pheriche or Pangboche\nDay 11: Descend to Namche Bazaar\nDay 12: Namche to Lukla\nDay 13: Fly Lukla to Kathmandu\nDay 14: Departure or optional buffer day in Kathmandu',
      cost_include:
        '- Airport transfers in Kathmandu\n- 3-star twin-share hotel in Kathmandu with breakfast (2 nights)\n- Domestic flights Kathmandu–Lukla–Kathmandu\n- Tea-house lodging during trek (twin share)\n- Breakfast, lunch, and dinner on trek\n- Licensed English-speaking trekking guide\n- Porter (1 per 2 clients; max 20 kg shared)\n- Sagarmatha National Park permit and Khumbu Pasang Lhamu rural municipality fee\n- Staff insurance and wages\n- First-aid kit carried by guide\n- Farewell dinner in Kathmandu',
      cost_exclude:
        '- International airfare and Nepal visa\n- Lunch/dinner in Kathmandu\n- Travel insurance (mandatory; must cover helicopter evacuation to 6,000 m)\n- Personal trekking gear and sleeping bag rental\n- Hot showers, Wi‑Fi, battery charging, and bottled drinks on trek\n- Tips for guide and porter\n- Extra nights due to flight delays',
      permits:
        'Sagarmatha National Park entry permit and Khumbu Pasang Lhamu Rural Municipality entrance fee are included. TIMS is generally not required for this route under current Khumbu local regulations — we confirm latest rules before your departure.',
      equipment:
        'Boots, down jacket, layers, rain shell, poles, sleeping bag (-10C), 30L daypack, sunglasses, SPF50, headlamp, bottles.',
      seo: seo(
          'Everest Base Camp Trek 14 Days | Nepal',
          'Classic EBC trek with Kala Patthar, tea-house lodging, permits, guide and porter. Spring and autumn departures.',
          'everest base camp trek, ebc, khumbu'
        ),
    },
    {
      title: 'Annapurna Base Camp Trek',
      slug: 'annapurna-base-camp-trek',
      trip_code: 'ABC-11',
      destination: 'Nepal',
      region: regions['annapurna-region'].documentId,
      activity: activities.trekking.documentId,
      short_description:
        'An 11-day trek into the Annapurna Sanctuary, ending at Annapurna Base Camp (4,130 m) beneath Annapurna I and Machhapuchhre.',
      overview:
        'The Annapurna Base Camp (ABC) Trek climbs from lush Modi Khola valleys through Gurung villages into a high glacial amphitheatre. Compared with Everest, ABC is lower in maximum altitude but still demands fitness and respect for weather in the sanctuary.\n\nYou typically start from Pokhara with a drive to the trailhead (Nayapul, Kimche, or similar depending on road conditions), ascending via Chhomrong and Deurali. Hot springs at Jhinu Danda are a favorite on the descent.\n\nIdeal for trekkers wanting dramatic mountain walls without Lukla flight logistics.',
      duration_days: 11,
      duration_night: 10,
      difficulty: 'moderate',
      max_altitude: '4130m (Annapurna Base Camp)',
      start_point: 'Pokhara',
      end_point: 'Pokhara',
      group_size_min: 1,
      group_size_max: 12,
      best_season: 'March–May, September–November',
      price: 990,
      discount_price: 920,
      currency: 'USD',
      featured: true,
      view_count: 960,
      highlights:
        '- Stand at Annapurna Base Camp (4,130 m)\n- Machhapuchhre Base Camp viewpoint\n- Gurung villages and terraced farmland\n- Optional Poon Hill sunrise extension\n- Natural hot springs at Jhinu\n- Flexible Pokhara start/finish',
      itinerary:
        'Day 1: Arrive Pokhara — trek briefing\nDay 2: Drive to trailhead, trek to Ghandruk or Chhomrong\nDay 3: Ascend via Chhomrong toward Bamboo / Dovan\nDay 4: Trek to Deurali\nDay 5: Deurali to Annapurna Base Camp via Machhapuchhre Base Camp\nDay 6: Sunrise at ABC, descend to Bamboo area\nDay 7: Descend toward Jhinu Danda (hot springs)\nDay 8: Trek to trailhead and drive to Pokhara\nDay 9–11: Buffer / sightseeing / departure as per package variant\n(Exact nightly stops may adjust for group pace and lodge availability.)',
      cost_include:
        '- Pokhara hotel with breakfast (as per itinerary nights)\n- Ground transport Pokhara–trailhead–Pokhara\n- Tea-house lodging and meals on trek\n- Guide and porter\n- ACAP and TIMS (or current equivalent permits)\n- Staff costs and basic first aid',
      cost_exclude:
        '- Kathmandu–Pokhara transport unless listed\n- Nepal visa and international flights\n- Travel insurance\n- Personal expenses, tips, and beverages\n- Extra nights in Pokhara',
      permits: 'Annapurna Conservation Area Permit (ACAP) and TIMS/local fees as required — included when we handle permits.',
      equipment: 'Layered trek kit; nights at ABC can drop below freezing in shoulder seasons.',
      seo: seo(
          'Annapurna Base Camp Trek | 11 Days',
          'Trek to ABC (4,130 m) from Pokhara with guide, permits, and tea-house support.',
          'annapurna base camp, abc trek'
        ),
    },
    {
      title: 'Annapurna Circuit Trek',
      slug: 'annapurna-circuit-trek',
      trip_code: 'ACT-16',
      destination: 'Nepal',
      region: regions['annapurna-region'].documentId,
      activity: activities.trekking.documentId,
      short_description:
        'A varied 16-day circuit crossing Thorong La (5,416 m), from Marsyangdi valley farms to Mustang’s arid side and Tatopani / Pokhara.',
      overview:
        'The Annapurna Circuit remains one of the world’s great long-distance treks. Landscapes shift from rice terraces and waterfalls to pine forests, high yak pastures, and the wind-scoured approach to Thorong La.\n\nRoad construction has shortened some walking stages; our version emphasizes trail segments, Manang acclimatization, and a thoughtful descent via Muktinath. Optional jeep links can replace dusty road walks when preferred.',
      duration_days: 16,
      duration_night: 15,
      difficulty: 'challenging',
      max_altitude: '5416m (Thorong La)',
      start_point: 'Besisahar / Bhulbhule',
      end_point: 'Pokhara',
      group_size_min: 2,
      group_size_max: 10,
      best_season: 'March–May, October–November',
      price: 1290,
      discount_price: null,
      currency: 'USD',
      featured: true,
      view_count: 740,
      highlights:
        '- Cross Thorong La Pass (5,416 m)\n- Manang village acclimatization and Gangapurna lake views\n- Muktinath pilgrimage site\n- Dramatic climate and culture change east to west\n- Hot springs at Tatopani (itinerary dependent)',
      itinerary:
        'Representative outline: Kathmandu/Pokhara transfer → Marsyangdi valley stages (Jagat, Dharapani, Chame) → Upper Pisang / Manang → Yak Kharka → Thorong Phedi → Thorong La to Muktinath → Jomsom / Marpha → exit toward Pokhara. Daily stops confirmed in your final dossier.',
      cost_include:
        '- Guide and porter\n- Tea-house full board on trek\n- ACAP/TIMS as required\n- Ground transfers listed in itinerary\n- Celebration meal',
      cost_exclude:
        '- International flights, visa, insurance\n- Kathmandu hotels unless stated\n- Personal gear, tips, soft drinks\n- Optional mountain flight side trips',
      permits: 'ACAP and TIMS (or successor local permits).',
      equipment: 'Warm pass layers, snow gaiters in season, sturdy boots, high-UV sun protection.',
      seo: seo('Annapurna Circuit Trek', 'Thorong La crossing with guided tea-house support on the classic circuit.')
    },
    {
      title: 'Langtang Valley Trek',
      slug: 'langtang-valley-trek',
      trip_code: 'LTV-9',
      destination: 'Nepal',
      region: regions['langtang-region'].documentId,
      activity: activities.trekking.documentId,
      short_description:
        'A 9-day valley trek to Kyanjin Gompa with optional Kyanjin Ri or Tserko Ri viewpoints — close to Kathmandu, rich Tamang culture.',
      overview:
        'Langtang Valley offers glacier views and village life without domestic flights. After a drive to Syabrubesi, trails climb through forests recovering since the 2015 earthquake, past water mills and prayer walls, to Kyanjin Gompa.\n\nOptional peaks above Kyanjin give panoramic reward for early starts. Combine with Gosaikunda on longer variants.',
      duration_days: 9,
      duration_night: 8,
      difficulty: 'moderate',
      max_altitude: '4984m (Tserko Ri optional)',
      start_point: 'Syabrubesi',
      end_point: 'Syabrubesi',
      group_size_min: 1,
      group_size_max: 12,
      best_season: 'March–May, October–November',
      price: 790,
      discount_price: 750,
      currency: 'USD',
      featured: false,
      view_count: 410,
      highlights:
        '- Kyanjin Gompa and local cheese production\n- Optional Tserko Ri or Kyanjin Ri viewpoints\n- Tamang heritage villages\n- No Lukla flight dependency\n- Easy add-on from Kathmandu city break',
      itinerary:
        'Day 1: Drive Kathmandu–Syabrubesi\nDay 2–4: Ascend via Lama Hotel / Langtang village toward Kyanjin\nDay 5: Exploration / peak viewpoint day\nDay 6–7: Descend toward Syabrubesi\nDay 8: Drive to Kathmandu\nDay 9: Buffer / depart',
      cost_include:
        '- Private transport Kathmandu–Syabrubesi–Kathmandu\n- Guide, porter, permits\n- Tea-house meals and lodging on trek',
      cost_exclude: '- Kathmandu hotels, insurance, visa, tips, personal expenses',
      permits: 'Langtang National Park permit and local TIMS/equivalent.',
      equipment: 'Standard tea-house kit; warmer layers for early viewpoint mornings.',
      seo: seo('Langtang Valley Trek 9 Days', 'Guided Langtang trek to Kyanjin with park permits included.')
    },
    {
      title: 'Manaslu Circuit Trek',
      slug: 'manaslu-circuit-trek',
      trip_code: 'MCT-14',
      destination: 'Nepal',
      region: regions['manaslu-region'].documentId,
      activity: activities.trekking.documentId,
      short_description:
        'Restricted-area 14-day circuit around Manaslu crossing Larkya La (≈5,160 m), with Tibetan-influenced villages and quieter trails.',
      overview:
        'Manaslu Circuit rewards trekkers seeking fewer crowds than the classic Annapurna or Everest routes. The trek requires restricted-area permits and a licensed agency arrangement. Cultural highlights include monasteries and villages along the Budi Gandaki before the alpine approach to Larkya La.\n\nWe operate with trained guides, porters, and conservative altitude profiles.',
      duration_days: 14,
      duration_night: 13,
      difficulty: 'challenging',
      max_altitude: '5160m (Larkya La)',
      start_point: 'Soti Khola / Machha Khola',
      end_point: 'Dharapani / Besisahar',
      group_size_min: 2,
      group_size_max: 10,
      best_season: 'March–May, September–November',
      price: 1690,
      discount_price: null,
      currency: 'USD',
      featured: true,
      view_count: 355,
      highlights:
        '- Larkya La pass crossing\n- Restricted area cultural immersion\n- Views of Manaslu and surrounding peaks\n- Quieter lodges than mainstream circuits',
      itinerary:
        'Drive from Kathmandu to trailhead, progressive ascent through Jagat, Deng, Namrung, Lho, Samagaon (acclimatization), Samdo, Dharamsala, Larkya La to Bimthang, then exit toward Dharapani. Final day counts vary with road head choices.',
      cost_include:
        '- Restricted area permit and MCAP/ACAP as required\n- Guide (government rules may require), porter\n- Lodging and meals on trek\n- Transport as listed',
      cost_exclude: '- International flights, visa, insurance, tips, personal kit, Kathmandu extras',
      permits:
        'Manaslu Restricted Area Permit (RAP), Manaslu Conservation Area Permit, and Annapurna Conservation Area Permit on exit — arranged by us.',
      equipment: 'Cold-weather pass kit, broken-in boots, layered system, personal meds.',
      seo: seo('Manaslu Circuit Trek', 'Restricted Manaslu Circuit with Larkya La and full permit handling.')
    },
    {
      title: 'Upper Mustang Trek',
      slug: 'upper-mustang-trek',
      trip_code: 'UMT-12',
      destination: 'Nepal',
      region: regions['upper-mustang'].documentId,
      activity: activities['cultural-tours'].documentId,
      short_description:
        'A 12-day restricted journey to Lo Manthang through Mustang’s desert canyons, cave monasteries, and walled capital.',
      overview:
        'Upper Mustang feels closer to the Tibetan Plateau than to green Nepali mid-hills: eroded cliffs, ancient caves, and strong winds. Lo Manthang’s city walls, royal palace (exterior views / local guidance), and nearby monasteries are the cultural climax.\n\nWe offer trekking and hybrid jeep-assist styles depending on season and fitness. Special permits and fixed itinerary rules apply.',
      duration_days: 12,
      duration_night: 11,
      difficulty: 'moderate',
      max_altitude: '4200m (approximate high points on standard route)',
      start_point: 'Pokhara / Jomsom',
      end_point: 'Jomsom / Pokhara',
      group_size_min: 2,
      group_size_max: 8,
      best_season: 'March–November (avoid severe winter closures)',
      price: 2490,
      discount_price: 2350,
      currency: 'USD',
      featured: true,
      view_count: 290,
      highlights:
        '- Lo Manthang walled city\n- Desert Himalayan landscapes\n- Cave and monastery visits\n- Restricted-area expertise and permits\n- Optional Tiji festival timing (seasonal)',
      itinerary:
        'Pokhara → Jomsom → Kagbeni → Chele → Syangboche / Ghami → Charang → Lo Manthang (exploration days) → return via alternative villages → Jomsom → Pokhara. Exact stages depend on trek vs jeep mix.',
      cost_include:
        '- Upper Mustang restricted permit\n- ACAP\n- Guide, lodging, meals as itinerary\n- Flights or ground transport listed in dossier',
      cost_exclude: '- International flights, visa, insurance, tips, beverages, personal expenses',
      permits: 'Upper Mustang Restricted Area Permit (per person, per duration) plus ACAP — priced into the package.',
      equipment: 'Strong sun protection, dust scarf, warm wind layers for evenings.',
      seo: seo('Upper Mustang Trek', 'Restricted Upper Mustang to Lo Manthang with permits and cultural guiding.')
    },
    {
      title: 'Island Peak Climbing',
      slug: 'island-peak-climbing',
      trip_code: 'IPC-18',
      destination: 'Nepal',
      region: regions['everest-region'].documentId,
      activity: activities['peak-climbing'].documentId,
      short_description:
        '18-day Everest-region itinerary combining EBC acclimatization with an ascent of Island Peak (Imja Tse, 6,189 m).',
      overview:
        'Island Peak is a popular “trekking peak” that introduces crampons, rope work, and a steep summit headwall. We build acclimatization via the Chhukung valley after standard Khumbu approach days.\n\nClimbing is weather-dependent; safety decisions rest with the climbing guide. Prior trekking experience at altitude is strongly recommended; basic mountaineering training is provided on the glacier.',
      duration_days: 18,
      duration_night: 17,
      difficulty: 'challenging',
      max_altitude: '6189m (Island Peak)',
      start_point: 'Kathmandu / Lukla',
      end_point: 'Lukla / Kathmandu',
      group_size_min: 2,
      group_size_max: 6,
      best_season: 'April–May, October–November',
      price: 2890,
      discount_price: null,
      currency: 'USD',
      featured: false,
      view_count: 210,
      highlights:
        '- Summit attempt on Island Peak (6,189 m)\n- Glacier skills briefing\n- Khumbu cultural trek approach\n- Climbing guide and group equipment\n- Flexible contingency days',
      itinerary:
        'Kathmandu → Lukla → Namche (acclimatize) → Tengboche → Dingboche → Chhukung → Island Peak Base / High Camp → summit window → descend and exit via Lukla. Detailed climbing schedule issued after gear check.',
      cost_include:
        '- Climbing guide, trekking staff\n- Group climbing gear (ropes, ice screws as required)\n- Peak permit and park fees\n- Tea-house and camping sections as planned\n- Flights KTM–Lukla–KTM',
      cost_exclude:
        '- Personal climbing hardware (harness, boots, crampons, ice axe — rentable)\n- Insurance with climbing/rescue cover\n- Tips, visa, international flights',
      permits: 'Island Peak climbing permit via NMA process, Sagarmatha NP, and local fees.',
      equipment:
        'Mountaineering boots, crampons, harness, helmet, ice axe, belay jacket, mittens, gaiters (rentals available).',
      seo: seo('Island Peak Climbing', 'Guided Island Peak (6,189 m) with Khumbu acclimatization and permits.')
    },
    {
      title: 'Kathmandu Valley Cultural Tour',
      slug: 'kathmandu-valley-cultural-tour',
      trip_code: 'KVC-3',
      destination: 'Nepal',
      region: regions['everest-region'].documentId,
      activity: activities['cultural-tours'].documentId,
      short_description:
        'A 3-day guided introduction to Kathmandu, Patan, and Bhaktapur UNESCO heritage — ideal before or after a trek.',
      overview:
        'Explore living heritage cities of the Kathmandu Valley: Durbar Squares, Buddhist stupas at Swayambhunath and Boudhanath, and Hindu pilgrimage at Pashupatinath. Days are paced for jet-lagged arrivals with private vehicle and licensed culture guide.\n\nEasily combined with any trek departure.',
      duration_days: 3,
      duration_night: 2,
      difficulty: 'easy',
      max_altitude: '1400m',
      start_point: 'Kathmandu',
      end_point: 'Kathmandu',
      group_size_min: 1,
      group_size_max: 10,
      best_season: 'Year-round',
      price: 320,
      discount_price: 290,
      currency: 'USD',
      featured: false,
      view_count: 180,
      highlights:
        '- UNESCO World Heritage sites\n- Local lunch suggestions and craft stops\n- Flexible photo-friendly pacing\n- Private vehicle and culture guide',
      itinerary:
        'Day 1: Kathmandu Durbar Square, Swayambhunath, Patan evening\nDay 2: Pashupatinath and Boudhanath; optional Thamel briefing for trekkers\nDay 3: Bhaktapur full morning, return and farewell',
      cost_include: '- Hotels as booked, breakfasts, private transport, guide, monument entry fees listed',
      cost_exclude: '- Lunches/dinners unless stated, personal shopping, tips, insurance',
      permits: 'Monument entry tickets included as per itinerary.',
      equipment: 'Walking shoes, sun hat, modest clothes for temple visits.',
      seo: seo('Kathmandu Valley Cultural Tour', '3-day heritage tour of Kathmandu, Patan, and Bhaktapur.')
    },
  ];

  // Fix cultural tour region — use a neutral approach: still ok linked to Nepal via destination string.
  // Prefer not linking cultural tour to everest-region only; create without wrong region if needed.
  // We'll attach cultural tour region to null by using annapurna as alternate — actually destination field is string "Nepal".
  // Change region for cultural tour: leave as everest was wrong. Use first region is bad.
  // I'll re-link after — for now update the last trip to not use everest. Simple fix: set region to annapurna-region as generic foothill? Better: keep destination Nepal string and use langtang or skip.
  tripDefs[tripDefs.length - 1].region = regions['annapurna-region'].documentId;

  const trips = {};
  for (const t of tripDefs) {
    const { region, activity, ...rest } = t;
    trips[t.slug] = await createPublished(strapi, 'api::trip.trip', {
      ...rest,
      region,
      activity,
    });
  }

  console.log('Seeding fixed departures...');
  const departures = [
    {
      tripSlug: 'everest-base-camp-trek',
      start_date: '2026-09-12',
      end_date: '2026-09-25',
      price: 1490,
      discount: 1390,
      total_seats: 12,
      booked_seats: 4,
      status: 'open',
    },
    {
      tripSlug: 'everest-base-camp-trek',
      start_date: '2026-10-05',
      end_date: '2026-10-18',
      price: 1490,
      discount: null,
      total_seats: 12,
      booked_seats: 9,
      status: 'limited',
    },
    {
      tripSlug: 'annapurna-base-camp-trek',
      start_date: '2026-09-20',
      end_date: '2026-09-30',
      price: 990,
      discount: 920,
      total_seats: 10,
      booked_seats: 2,
      status: 'open',
    },
    {
      tripSlug: 'annapurna-circuit-trek',
      start_date: '2026-10-10',
      end_date: '2026-10-25',
      price: 1290,
      discount: null,
      total_seats: 8,
      booked_seats: 8,
      status: 'full',
    },
    {
      tripSlug: 'manaslu-circuit-trek',
      start_date: '2026-10-02',
      end_date: '2026-10-15',
      price: 1690,
      discount: null,
      total_seats: 8,
      booked_seats: 3,
      status: 'open',
    },
    {
      tripSlug: 'upper-mustang-trek',
      start_date: '2026-09-01',
      end_date: '2026-09-12',
      price: 2490,
      discount: 2350,
      total_seats: 6,
      booked_seats: 1,
      status: 'open',
    },
    {
      tripSlug: 'island-peak-climbing',
      start_date: '2026-10-15',
      end_date: '2026-11-01',
      price: 2890,
      discount: null,
      total_seats: 4,
      booked_seats: 2,
      status: 'guaranteed',
    },
  ];
  for (const d of departures) {
    const { tripSlug, ...rest } = d;
    await createPublished(strapi, 'api::fixed-departure.fixed-departure', {
      ...rest,
      trip: trips[tripSlug].documentId,
    });
  }

  console.log('Seeding reviews...');
  const reviewDefs = [
    {
      tripSlug: 'everest-base-camp-trek',
      guide: 'Pembu Sherpa',
      reviewer_name: 'Sarah Mitchell',
      country: 'United Kingdom',
      rating: 5,
      title: 'Flawless support to Base Camp',
      source: 'website',
      trip_date: '2025-10-12',
      approved: true,
      review:
        'Our guide managed pace carefully and the porter team was wonderful. Tea houses were booked ahead during peak season, which made a huge difference. Kala Patthar sunrise was the highlight of my life.',
    },
    {
      tripSlug: 'everest-base-camp-trek',
      guide: 'Pembu Sherpa',
      reviewer_name: 'Kenji Tanaka',
      country: 'Japan',
      rating: 5,
      title: 'Safe and well organized',
      source: 'tripadvisor',
      trip_date: '2025-05-03',
      approved: true,
      review:
        'Lukla flights were delayed one day; the company adjusted hotels and kept us informed. On the trail, daily briefings about altitude were clear. Highly recommend for first EBC trek.',
    },
    {
      tripSlug: 'annapurna-base-camp-trek',
      guide: 'Maya Gurung',
      reviewer_name: 'Lucas Berger',
      country: 'Germany',
      rating: 4,
      title: 'Beautiful sanctuary, great food stops',
      source: 'google',
      trip_date: '2025-11-02',
      approved: true,
      review:
        'ABC exceeded expectations. One lodge was basic but authentic. Guide Maya knew every shortcut when afternoon clouds rolled in. Would book again for Circuit.',
    },
    {
      tripSlug: 'manaslu-circuit-trek',
      guide: 'Dorje Tamang',
      reviewer_name: 'Emily Chen',
      country: 'Australia',
      rating: 5,
      title: 'Quiet trails and incredible pass day',
      source: 'website',
      trip_date: '2025-10-20',
      approved: true,
      review:
        'Manaslu felt remote in the best way. Permits were handled seamlessly. Larkya La was tough but the team’s encouragement and timing were perfect.',
    },
    {
      tripSlug: 'upper-mustang-trek',
      guide: 'Tashi Bista',
      reviewer_name: 'Sophie Laurent',
      country: 'France',
      rating: 5,
      title: 'Otherworldly landscapes',
      source: 'website',
      trip_date: '2025-09-08',
      approved: true,
      review:
        'Lo Manthang was a dream. Cultural explanations were thoughtful and respectful. Jeep sections saved our knees without losing the magic.',
    },
    {
      tripSlug: 'langtang-valley-trek',
      guide: 'Hari Lama',
      reviewer_name: 'Michael Rossi',
      country: 'Italy',
      rating: 4,
      title: 'Perfect short Himalayan escape',
      source: 'google',
      trip_date: '2026-03-15',
      approved: true,
      review:
        'Ideal after a work trip in Kathmandu. Trails were peaceful and Kyanjin Ri was worth the early alarm. Clear communication throughout.',
    },
  ];
  for (const r of reviewDefs) {
    const { tripSlug, ...rest } = r;
    await createPublished(strapi, 'api::review.review', {
      ...rest,
      trip: trips[tripSlug].documentId,
    });
  }

  console.log('Seeding FAQs...');
  const faqDefs = [
    {
      tripSlug: 'everest-base-camp-trek',
      question: 'How fit do I need to be for the Everest Base Camp Trek?',
      display_order: 1,
      active: true,
      answer: blocks(
        'You should be comfortable walking 5–7 hours a day on consecutive days with a daypack. Prior hill-walking helps. We recommend cardio and weighted-pack training for 8–12 weeks before departure. Altitude affects everyone differently — fitness reduces fatigue but does not eliminate AMS risk.'
      ),
    },
    {
      tripSlug: 'everest-base-camp-trek',
      question: 'What happens if Lukla flights are cancelled?',
      display_order: 2,
      active: true,
      answer: blocks(
        'Weather often delays Lukla flights. We build buffer time where possible, rebook the next available flight, and help with extra Kathmandu lodging (usually at your cost unless stated otherwise). In prolonged closures, helicopter options may be available at additional cost.'
      ),
    },
    {
      tripSlug: 'everest-base-camp-trek',
      question: 'Do you provide sleeping bags and down jackets?',
      display_order: 3,
      active: true,
      answer: blocks(
        'You can rent quality sleeping bags and down jackets in Kathmandu. We share a full packing list after booking and can arrange rentals before the Lukla flight.'
      ),
    },
    {
      tripSlug: 'annapurna-base-camp-trek',
      question: 'Is Annapurna Base Camp easier than Everest Base Camp?',
      display_order: 1,
      active: true,
      answer: blocks(
        'ABC is lower in maximum elevation and avoids the Lukla flight, so many trekkers find logistics simpler. Steep stone staircases and sanctuary weather still make it a serious trek — treat it with the same preparation respect.'
      ),
    },
    {
      tripSlug: 'manaslu-circuit-trek',
      question: 'Why is Manaslu a restricted area?',
      display_order: 1,
      active: true,
      answer: blocks(
        'Parts of the Manaslu route require a Restricted Area Permit and must be arranged through a registered agency with a licensed guide. This helps manage tourism in sensitive border regions and supports local regulation.'
      ),
    },
    {
      tripSlug: 'upper-mustang-trek',
      question: 'Can I visit Upper Mustang independently?',
      display_order: 1,
      active: true,
      answer: blocks(
        'Independent travel is not permitted in the same way as open trekking areas. Restricted permits, guide arrangements, and itinerary rules apply. We handle paperwork and logistics so you can focus on the experience.'
      ),
    },
    {
      tripSlug: 'island-peak-climbing',
      question: 'Do I need previous mountaineering experience?',
      display_order: 1,
      active: true,
      answer: blocks(
        'Prior high-altitude trekking is strongly recommended. Formal climbing experience helps but is not always mandatory for Island Peak — we provide glacier skills training. Your guide may turn back for safety if conditions or fitness require it.'
      ),
    },
  ];
  for (const f of faqDefs) {
    const { tripSlug, ...rest } = f;
    await createPublished(strapi, 'api::faq.faq', {
      ...rest,
      trip: trips[tripSlug].documentId,
    });
  }

  console.log('Seeding team members...');
  const team = [
    {
      name: 'Pembu Sherpa',
      slug: 'pembu-sherpa',
      role: 'Senior Trekking Guide',
      bio: 'Khumbu specialist with 15+ years on Everest-region routes.',
      experience:
        'Led 100+ EBC and Gokyo groups. Wilderness first-aid trained. Fluent in English, Nepali, and Sherpa.',
      language: 'English, Nepali, Sherpa',
      phone: '+977-9800000001',
      whatsapp: '+977-9800000001',
      display_order: 1,
      active: true,
      description: blocks(
        'Pembu grew up in a village near Namche and knows lodge networks, weather windows, and cultural etiquette across Khumbu.'
      ),
    },
    {
      name: 'Maya Gurung',
      slug: 'maya-gurung',
      role: 'Annapurna Guide',
      bio: 'Pokhara-based guide focused on ABC, Poon Hill, and women’s trek groups.',
      experience: '10 years guiding Annapurna sanctuaries and foothill cultural walks.',
      language: 'English, Nepali, Gurung',
      phone: '+977-9800000002',
      whatsapp: '+977-9800000002',
      display_order: 2,
      active: true,
      description: blocks('Maya emphasizes inclusive pacing and clear altitude communication.'),
    },
    {
      name: 'Dorje Tamang',
      slug: 'dorje-tamang',
      role: 'Manaslu & Langtang Guide',
      bio: 'Restricted-area and Langtang specialist.',
      experience: '12 years on Manaslu Circuit and Langtang Valley; strong navigation in shoulder seasons.',
      language: 'English, Nepali, Tamang',
      phone: '+977-9800000003',
      whatsapp: '+977-9800000003',
      display_order: 3,
      active: true,
      description: blocks('Dorje is known for calm decision-making on pass days and thoughtful village interpretation.'),
    },
    {
      name: 'Anisha Shrestha',
      slug: 'anisha-shrestha',
      role: 'Operations Manager',
      bio: 'Kathmandu operations, permits, and flight coordination.',
      experience: 'Coordinates peak-season Lukla schedules, restricted permits, and custom itineraries.',
      language: 'English, Nepali',
      phone: '+977-1-4000000',
      whatsapp: '+977-9800000004',
      display_order: 4,
      active: true,
      description: blocks(
        'Anisha is your pre-trek contact for packing questions, insurance checks, and arrival planning.'
      ),
    },
  ];
  for (const member of team) {
    await createPublished(strapi, 'api::team-member.team-member', member);
  }

  console.log('Seeding blog categories and posts...');
  const catTrekking = await createPublished(strapi, 'api::blog-catagory.blog-catagory', {
    name: 'Trekking Tips',
    slug: 'trekking-tips',
  });
  const catCulture = await createPublished(strapi, 'api::blog-catagory.blog-catagory', {
    name: 'Culture & Places',
    slug: 'culture-places',
  });
  const catSeasons = await createPublished(strapi, 'api::blog-catagory.blog-catagory', {
    name: 'Seasons & Weather',
    slug: 'seasons-weather',
  });

  const blogs = [
    {
      title: 'How to Prepare for Your First Himalayan Trek',
      slug: 'prepare-first-himalayan-trek',
      catagory: catTrekking.documentId,
      author: 'Anisha Shrestha',
      excerpt:
        'A practical training, gear, and mindset checklist for first-time trekkers heading to Everest, Annapurna, or Langtang.',
      tags: 'training, packing, altitude, beginner',
      seo: seo(
          'Prepare for Your First Himalayan Trek',
          'Training, packing, insurance, and altitude basics for first-time Nepal trekkers.'
        ),
      content: blocks(
        heading('Start with honest fitness'),
        'You do not need to be an athlete, but you do need consecutive hiking days in your legs. Build weekly hill walks with a weighted pack. Add stair intervals and mobility work for knees and hips.',
        heading('Think in layers'),
        'Nepal treks move through multiple climate bands. Pack moisture-wicking bases, an insulating mid-layer, a down or synthetic puffy, and a waterproof shell. Cotton kills when wet — leave it at home.',
        heading('Insurance is not optional'),
        'Buy travel insurance that explicitly covers trekking to your maximum altitude and helicopter evacuation. Carry policy numbers offline and share them with your operator.',
        heading('Respect altitude'),
        'Ascend gradually, hydrate, and tell your guide early if you have headache, nausea, or unusual fatigue. Descent is the definitive treatment for serious AMS.'
      ),
    },
    {
      title: 'Best Time to Trek in Nepal: Season-by-Season Guide',
      slug: 'best-time-trek-nepal',
      catagory: catSeasons.documentId,
      author: 'Maya Gurung',
      excerpt:
        'Compare spring blooms, autumn clarity, winter solitude, and monsoon realities across Nepal’s major trekking regions.',
      tags: 'spring, autumn, monsoon, winter',
      seo: seo('Best Time to Trek in Nepal', 'Season guide for Everest, Annapurna, Langtang, Manaslu, and Mustang.')
      content: blocks(
        heading('Autumn (late September–November)'),
        'Generally the most stable skies and clearest mountain views after monsoon washes the dust out of the air. Expect busier trails and earlier lodge bookings on classic routes.',
        heading('Spring (March–May)'),
        'Rhododendrons paint mid-hills; mornings are often clear before afternoon clouds. Popular for climbing peaks as well as tea-house treks.',
        heading('Winter & monsoon'),
        'Winter offers solitude and cold nights; high passes may hold snow. Monsoon (June–August) means lush hills, leeches at lower elevations, and blocked mountain views — Upper Mustang and rain-shadow areas can still work.'
      ),
    },
    {
      title: 'Namche Bazaar: Acclimatization Done Right',
      slug: 'namche-bazaar-acclimatization',
      catagory: catCulture.documentId,
      author: 'Pembu Sherpa',
      excerpt:
        'Why the Everest trek pauses in Namche, what to do on your rest day, and how Sherpa culture shapes the Khumbu experience.',
      tags: 'namche, everest, sherpa, acclimatization',
      seo: seo('Namche Bazaar Acclimatization', 'Make the most of your Namche rest day on the EBC trek.')
      content: blocks(
        heading('Why Namche matters'),
        'At about 3,440 m, Namche is the gateway to high Khumbu. A rest day with an active hike “climb high, sleep low” dramatically improves later days toward Dingboche and Lobuche.',
        heading('What to do'),
        'Hike toward the Everest View Hotel or Syangboche for panorama practice. Visit the museum, browse the Saturday market when timed right, and hydrate more than you think you need.',
        'Support local bakeries and fair lodge practices — tourism is the backbone of the valley economy.'
      ),
    },
    {
      title: 'Annapurna vs Everest: Which Trek Should You Choose?',
      slug: 'annapurna-vs-everest',
      catagory: catTrekking.documentId,
      author: 'Dorje Tamang',
      excerpt:
        'Side-by-side comparison of scenery, altitude, logistics, cost, and crowd levels to help you pick ABC/Circuit vs EBC.',
      tags: 'comparison, abc, ebc, planning',
      seo: seo(
          'Annapurna vs Everest Trek',
          'Compare Annapurna Base Camp / Circuit with Everest Base Camp for your first Nepal trek.'
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
      catagory: catCulture.documentId,
      author: 'Anisha Shrestha',
      excerpt:
        'Permit ethics, cultural respect, and waste practices for Manaslu, Upper Mustang, and other regulated regions.',
      tags: 'permits, mustang, manaslu, responsible tourism',
      seo: seo(
          'Responsible Trekking in Restricted Areas',
          'How to trek Manaslu and Upper Mustang respectfully with proper permits and local guidance.'
        ),
      content: blocks(
        heading('Permits protect places'),
        'Restricted permits are not bureaucracy for its own sake — they fund management and control numbers. Always trek with the required licensed guide and keep permit papers accessible at checkpoints.',
        heading('Culture & waste'),
        'Ask before photographing people, dress modestly at monasteries, and pack out what you pack in. Carry a reusable bottle and use boiled or treated water instead of single-use plastic where possible.'
      ),
    },
  ];
  for (const b of blogs) {
    await createPublished(strapi, 'api::blog.blog', b);
  }

  console.log('Seeding static pages...');
  await createPublished(strapi, 'api::static-page.static-page', {
    title: 'About Us',
    slug: 'about',
    content:
      'We are a Kathmandu-based adventure operator specializing in trekking, peak climbing, and cultural journeys across Nepal. Our guides are locally employed, insured, and trained in wilderness first aid. We design itineraries for safe acclimatization, fair staff wages, and honest pre-trip communication.\n\nWhether you want a classic Everest Base Camp departure or a custom restricted-area expedition, our operations team handles permits, flights, and lodge logistics so you can focus on the trail.',
    seo: seo(
        'About Our Nepal Trekking Company',
        'Locally led trekking and touring company based in Kathmandu — guides, safety, and responsible travel.'
      ),
  });
  await createPublished(strapi, 'api::static-page.static-page', {
    title: 'Contact',
    slug: 'contact',
    content:
      'Email: info@nepaltrails.example\nPhone / WhatsApp: +977-9800000000\nOffice: Thamel, Kathmandu, Nepal\n\nTell us your preferred dates, group size, and trek ideas. We respond within one business day with a proposed itinerary and quote. For urgent arrival support, use WhatsApp with your flight details.',
    seo: seo('Contact Us', 'Contact our Kathmandu team for trek planning, fixed departures, and custom itineraries.')
  });
  await createPublished(strapi, 'api::static-page.static-page', {
    title: 'Terms & Conditions',
    slug: 'terms',
    content:
      'Bookings require a deposit to confirm services. Balance due dates, cancellation tiers, and force-majeure flight policies are listed on your invoice. Travel insurance is mandatory. Itineraries may change due to weather, landslides, or aviation disruptions. Full legal terms are provided in your booking confirmation email.',
    seo: seo('Terms & Conditions', 'Booking, cancellation, and travel terms for our Nepal trekking services.')
  });
  await createPublished(strapi, 'api::static-page.static-page', {
    title: 'Privacy Policy',
    slug: 'privacy',
    content:
      'We collect inquiry details (name, email, phone, trip preferences) solely to respond to your request and deliver booked services. We do not sell personal data. Payment processing, where used, is handled by compliant providers. Contact us to update or delete inquiry records where applicable.',
    seo: seo('Privacy Policy', 'How we handle inquiry and customer data for trek bookings.')
  });

  console.log('Seeding offices & partners...');
  await createPublished(strapi, 'api::office.office', {
    type: 'Head Office',
    country: 'Nepal',
    city: 'Kathmandu',
    address: 'Thamel Marg, Kathmandu 44600',
    contact_person: 'Anisha Shrestha',
    phone: '+977-1-4000000',
    whatsapp: '+977-9800000000',
    email: 'info@nepaltrails.example',
    google_map: 'https://maps.google.com/?q=Thamel,Kathmandu',
  });
  await createPublished(strapi, 'api::office.office', {
    type: 'Branch',
    country: 'Nepal',
    city: 'Pokhara',
    address: 'Lakeside Road, Pokhara 33700',
    contact_person: 'Maya Gurung',
    phone: '+977-61-400000',
    whatsapp: '+977-9800000002',
    email: 'pokhara@nepaltrails.example',
    google_map: 'https://maps.google.com/?q=Lakeside,Pokhara',
  });

  await createPublished(strapi, 'api::partner.partner', {
    name: 'Nepal Tourism Board',
    website: 'https://ntb.gov.np',
    display_order: 1,
  });
  await createPublished(strapi, 'api::partner.partner', {
    name: 'Keep Kathmandu Clean Initiative',
    website: 'https://example.com/partner',
    display_order: 2,
  });

  console.log('Seeding video reviews (metadata only)...');
  await createPublished(strapi, 'api::video-review.video-review', {
    trip: trips['everest-base-camp-trek'].documentId,
    reviewer_name: 'Sarah Mitchell',
    country: 'United Kingdom',
    title: 'EBC trek day-by-day reflections',
    display_order: 1,
  });
  await createPublished(strapi, 'api::video-review.video-review', {
    trip: trips['annapurna-base-camp-trek'].documentId,
    reviewer_name: 'Lucas Berger',
    country: 'Germany',
    title: 'Arriving at Annapurna Sanctuary',
    display_order: 2,
  });

  console.log('Seeding sample inquiries...');
  await createPublished(strapi, 'api::inquiry.inquiry', {
    trip: trips['everest-base-camp-trek'].documentId,
    trip_label: 'Everest Base Camp Trek',
    type: 'trek-inquiry',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1-555-0100',
    country: 'USA',
    message: 'Interested in the October 5 EBC departure for 2 people. Do you have sleeping bag rentals?',
    preferred_date: '2026-10-05',
    group_size: 2,
    inquiry_status: 'new',
  });
  await createPublished(strapi, 'api::inquiry.inquiry', {
    trip: trips['upper-mustang-trek'].documentId,
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
  });

  console.log('Seeding single types...');
  await upsertSingle(strapi, 'api::site-setting.site-setting', {
    title: 'Nepal Trails',
    site_name: 'Nepal Trails',
    tagline: 'Trekking, peaks, and cultural journeys across the Himalaya',
    email: 'info@nepaltrails.example',
    phone: '+977-1-4000000',
    whatsapp: '+977-9800000000',
    address: 'Thamel, Kathmandu, Nepal',
    facebook: 'https://facebook.com/example',
    instagram: 'https://instagram.com/example',
    youtube: 'https://youtube.com/example',
    linkedin: 'https://linkedin.com/company/example',
    tripadvisor: 'https://tripadvisor.com/example',
    google_map: 'https://maps.google.com/?q=Thamel,Kathmandu',
    currency: 'USD',
    default_language: 'en',
    copyright: '© 2026 Nepal Trails. All rights reserved.',
    seo: seo(
        'Nepal Trails | Trekking & Tours',
        'Guided Everest, Annapurna, Langtang, Manaslu and Mustang adventures with local experts.'
      ),
  });

  await upsertSingle(strapi, 'api::homepage.homepage', {
    hero: 'Nepal Trails — Walk the Himalaya with local experts. Featured: Everest Base Camp, Annapurna Sanctuary, Upper Mustang.',
    featured_trips:
      'everest-base-camp-trek, annapurna-base-camp-trek, manaslu-circuit-trek, upper-mustang-trek',
    featured_regions: 'everest-region, annapurna-region, upper-mustang, langtang-region',
    featured_activities: 'trekking, peak-climbing, cultural-tours',
    why_choose_us:
      'Licensed local guides · Fair porter wages · Permit expertise · Safety-first acclimatization · Clear departure seats',
    featured_reviews: 'Sarah Mitchell, Emily Chen, Sophie Laurent',
    featured_blogs: 'prepare-first-himalayan-trek, best-time-trek-nepal, annapurna-vs-everest',
    cta_section:
      'Ready to plan? Tell us your dates and preferred region — we will reply with a tailored itinerary within one business day.',
  });

  await upsertSingle(strapi, 'api::header.header', {
    top_bar: {
      phone: '+977-1-4000000',
      whatsapp: '+977-9800000000',
      email: 'info@nepaltrails.example',
      notice: 'Mon–Fri 9:00–18:00 NPT',
    },
    navigation: [
      { title: 'Destinations', type: 'page', url: '/destinations', display_order: 1 },
      { title: 'Trekking', type: 'page', url: '/trekking', display_order: 2, mega_menu: 'regions' },
      { title: 'Activities', type: 'page', url: '/activities', display_order: 3 },
      { title: 'Blog', type: 'page', url: '/blog', display_order: 4 },
      { title: 'About', type: 'page', url: '/about', display_order: 5 },
      { title: 'Contact', type: 'page', url: '/contact', display_order: 6 },
    ],
    plan_trip_button: {
      text: 'Plan Your Trip',
      url: '/plan-my-trip',
      style: 'primary',
    },
    show_search: true,
    show_cart: false,
    show_wishlist: false,
  });

  await upsertSingle(strapi, 'api::footer.footer', {
    about:
      'Nepal Trails operates treks and tours across Nepal with Kathmandu and Pokhara offices. We focus on safety, local employment, and transparent pricing.',
    quick_links: [
      { title: 'About', type: 'page', url: '/about', display_order: 1 },
      { title: 'Contact', type: 'page', url: '/contact', display_order: 2 },
      { title: 'Terms', type: 'page', url: '/terms', display_order: 3 },
      { title: 'Privacy', type: 'page', url: '/privacy', display_order: 4 },
      { title: 'Plan my trip', type: 'page', url: '/plan-my-trip', display_order: 5 },
    ],
    travel_links: [
      { title: 'Everest Region', type: 'page', url: '/trekking?region=everest-region', display_order: 1 },
      { title: 'Annapurna Region', type: 'page', url: '/trekking?region=annapurna-region', display_order: 2 },
      { title: 'Langtang', type: 'page', url: '/trekking?region=langtang-region', display_order: 3 },
      { title: 'Manaslu', type: 'page', url: '/trekking?region=manaslu-region', display_order: 4 },
      { title: 'Upper Mustang', type: 'page', url: '/trekking?region=upper-mustang', display_order: 5 },
    ],
    contact: [
      { title: 'Address', value: 'Thamel, Kathmandu, Nepal', url: '' },
      { title: 'Phone', value: '+977-1-4000000', url: 'tel:+97714000000' },
      { title: 'Email', value: 'info@nepaltrails.example', url: 'mailto:info@nepaltrails.example' },
    ],
    social_links: [
      { platform: 'facebook', url: 'https://facebook.com/example' },
      { platform: 'instagram', url: 'https://instagram.com/example' },
      { platform: 'youtube', url: 'https://youtube.com/example' },
      { platform: 'tripadvisor', url: 'https://tripadvisor.com/example' },
    ],
    copyright: '© 2026 Nepal Trails',
  });

  // Legacy template singles (if frontend still reads them)
  try {
    await upsertSingle(strapi, 'api::about.about', {
      title: 'About Nepal Trails',
      blocks: [
        {
          __component: 'shared.rich-text',
          body: '## Our story\n\nNepal Trails began as a guide collective in Kathmandu and grew into a full-service trekking operator. We still measure success by safe summit attempts, fair wages, and travelers who return for a second region.',
        },
      ],
    });
  } catch (e) {
    console.log('Skipping about single type:', e.message);
  }

  try {
    await upsertSingle(strapi, 'api::global.global', {
      siteName: 'Nepal Trails',
      siteDescription:
        'Trekking and adventure travel across Nepal — Everest, Annapurna, Langtang, Manaslu, Mustang.',
      defaultSeo: seo(
        'Nepal Trails',
        'Guided Himalayan treks and cultural tours operated from Kathmandu.'
      ),
    });
  } catch (e) {
    console.log('Skipping global single type:', e.message);
  }

  console.log('Seed complete.');
  console.log(
    `Created: destinations, ${regionDefs.length} regions, ${activityDefs.length} activities, ${tripDefs.length} trips, blogs, reviews, FAQs, team, departures, pages, singles.`
  );
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    await seed(app);
  } finally {
    await app.destroy();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
