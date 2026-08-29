'use strict';

/**
 * Wipe CMS content and seed a full Himalayan catalog (original copy + freely licensed images).
 *
 * Usage:
 *   Stop `strapi develop` first (SQLite lock).
 *   node ./scripts/seed-testdata.js
 *
 * Optional:
 *   SKIP_WIPE=1     keep existing collection rows (not recommended)
 *   SKIP_IMAGES=1   skip remote image download (SVG placeholders only)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const mime = require('mime-types');
const catalog = require('./testdata/catalog');
const { seo } = require('./testdata/shared');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-seed-'));

/** Unsplash photo ids — landscape/adventure shots under the Unsplash License (not scraped from operators). */
const UNSPLASH = {
  everest: '1544735716-392fe2489ffa',
  everest2: '1486870591958-9b9d0d1dda99',
  gokyo: '1501785888041-af3ef285b470',
  passes: '1464822759023-fed622ff2c3b',
  chola: '1483728642387-6c3bdd6c93e5',
  namche: '1551632811-561732d1e306',
  island: '1519904981063-b0cf448d479e',
  mera: '1454496522488-7a8e488e8606',
  abc: '1469474968028-56623f02e42e',
  circuit: '1506905925346-21bda4d32df4',
  poonhill: '1470071459604-3b5ec3a7fe05',
  mardi: '1519681393784-d120267933ba',
  khopra: '1472214103451-9374bd1c798e',
  tilicho: '1501785888041-af3ef285b470',
  narphu: '1469854523086-cc02fe5d8800',
  mustang: '1509316785289-025f5b846b35',
  muktinath: '1500534314209-a25ddb2bd429',
  langtang: '1441974231531-c6227db76b6e',
  gosaikunda: '1470071459604-3b5ec3a7fe05',
  manaslu: '1486870591958-9b9d0d1dda99',
  tsum: '1551632811-561732d1e306',
  dolpo: '1469854523086-cc02fe5d8800',
  kanchenjunga: '1464822759023-fed622ff2c3b',
  makalu: '1519904981063-b0cf448d479e',
  chitwan: '1448375240586-882707db888b',
  kathmandu: '1524492412937-b28074a5d7da',
  tibet: '1506905925346-21bda4d32df4',
  bhutan: '1474044159687-1ee9f3a51722',
  hike: '1551632811-561732d1e306',
  sunrise: '1469474968028-56623f02e42e',
  camp: '1478131143081-80f7f84ca84d',
  snow: '1483728642387-6c3bdd6c93e5',
};

function unsplashUrl(id) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&h=1066&q=75`;
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
  let safety = 0;
  while (safety < 50) {
    const docs = await strapi.documents(uid).findMany({ limit: 100 });
    if (!docs?.length) break;
    for (const doc of docs) {
      await strapi.documents(uid).delete({ documentId: doc.documentId });
    }
    safety += 1;
  }
}

async function deleteAllMedia(strapi) {
  const uploadService = strapi.plugin('upload').service('upload');
  let safety = 0;
  while (safety < 80) {
    const files = await strapi.db.query('plugin::upload.file').findMany({ limit: 80 });
    if (!files?.length) break;
    for (const file of files) {
      try {
        await uploadService.remove(file);
      } catch (e) {
        console.log(`Skip media ${file.name}:`, e.message);
      }
    }
    safety += 1;
  }
  console.log('Media library cleared.');
}

function writeTemp(name, contents, encoding = 'utf8') {
  const filepath = path.join(TMP, name);
  fs.writeFileSync(filepath, contents, encoding);
  return filepath;
}

function svgAvatar(initials, bg, label) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${bg}"/>
  <circle cx="300" cy="300" r="220" fill="rgba(255,255,255,0.08)"/>
  <text x="300" y="340" text-anchor="middle" fill="#ffffff" font-size="180" font-family="Georgia, serif">${initials}</text>
  <text x="300" y="560" text-anchor="middle" fill="#ffffff" font-size="22" font-family="sans-serif" opacity="0.7">${escapeXml(label)}</text>
</svg>`;
}

function svgLogo() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160">
  <rect width="640" height="160" rx="12" fill="#1e3a5f"/>
  <polygon points="40,120 90,40 140,120" fill="#e8c547"/>
  <polygon points="90,70 120,120 60,120" fill="#1e3a5f"/>
  <text x="170" y="95" fill="#ffffff" font-size="52" font-family="Georgia, serif">Nepal Trails</text>
</svg>`;
}

function svgMark(letters, bg) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <rect width="400" height="200" rx="16" fill="${bg}"/>
  <text x="200" y="118" text-anchor="middle" fill="#ffffff" font-size="48" font-family="sans-serif" font-weight="700">${escapeXml(letters)}</text>
</svg>`;
}

function svgIcon(kind, bg) {
  const glyph = {
    trekking: '▲',
    'peak-climbing': '◆',
    'cultural-tours': '⌂',
    adventure: '⚡',
    'wildlife-nature': '✿',
    pilgrimage: '✦',
  }[kind] || '●';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="40" fill="${bg}"/>
  <text x="128" y="168" text-anchor="middle" fill="#ffffff" font-size="96">${glyph}</text>
</svg>`;
}

function svgLandscape(title, bg) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#f4efe6"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#sky)"/>
  <polygon points="0,1000 220,520 480,780 700,400 980,720 1200,360 1600,820 1600,1000" fill="#2c3e50" opacity="0.85"/>
  <polygon points="200,1000 520,560 840,1000" fill="#ffffff" opacity="0.35"/>
  <text x="80" y="120" fill="#ffffff" font-size="48" font-family="Georgia, serif">${escapeXml(title)}</text>
</svg>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function uploadFile(strapi, filepath, name, alt) {
  const size = fs.statSync(filepath).size;
  const ext = path.extname(filepath).replace('.', '') || 'bin';
  const mimetype = mime.lookup(ext) || (ext === 'svg' ? 'image/svg+xml' : 'application/octet-stream');
  const [file] = await strapi.plugin('upload').service('upload').upload({
    files: {
      filepath,
      originalFileName: path.basename(filepath),
      size,
      mimetype: mimetype === 'application/octet-stream' && ext === 'svg' ? 'image/svg+xml' : mimetype,
    },
    data: {
      fileInfo: {
        name,
        alternativeText: alt || name,
        caption: alt || name,
      },
    },
  });
  return file;
}

async function downloadToFile(url, dest) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'NepalTrailsSeed/1.0 (local CMS seed; Unsplash License images)',
      Accept: 'image/jpeg,image/png,image/webp,*/*',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`Image too small (${buf.length} bytes)`);
  fs.writeFileSync(dest, buf);
  return dest;
}

async function loadImageMap(strapi) {
  const map = {};
  const keys = Object.keys(UNSPLASH);
  for (const key of keys) {
    const dest = path.join(TMP, `${key}.jpg`);
    let uploaded;
    if (process.env.SKIP_IMAGES === '1') {
      const svgPath = writeTemp(`${key}.svg`, svgLandscape(key, '#4a6741'));
      uploaded = await uploadFile(strapi, svgPath, key, key);
    } else {
      try {
        process.stdout.write(`  image ${key}… `);
        await downloadToFile(unsplashUrl(UNSPLASH[key]), dest);
        uploaded = await uploadFile(strapi, dest, key, `Himalayan landscape (${key})`);
        console.log('ok');
      } catch (e) {
        console.log(`fallback (${e.message})`);
        const svgPath = writeTemp(`${key}.svg`, svgLandscape(key, '#3d5c7a'));
        uploaded = await uploadFile(strapi, svgPath, key, key);
      }
    }
    map[key] = uploaded;
  }
  return map;
}

function mediaId(file) {
  return file?.id || file;
}

async function seed(strapi) {
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
    booking: ['checkout', 'status', 'confirmPayment'],
    about: ['find'],
    global: ['find'],
    company: ['find'],
  });

  if (process.env.SKIP_WIPE !== '1') {
    console.log('Clearing existing content…');
    const uids = [
      'api::booking.booking',
      'api::inquiry.inquiry',
      'api::newsletter.newsletter',
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
        console.log(`  cleared ${uid}`);
      } catch (e) {
        console.log(`  skip clear ${uid}:`, e.message);
      }
    }
    await deleteAllMedia(strapi);
  }

  console.log('Uploading images…');
  const images = await loadImageMap(strapi);

  const logoPath = writeTemp('logo.svg', svgLogo());
  const logo = await uploadFile(strapi, logoPath, 'nepal-trails-logo', 'Nepal Trails logo');
  const favicon = logo;

  const activityIcons = {};
  const activityColors = {
    trekking: '#1e3a5f',
    'peak-climbing': '#5c3d2e',
    'cultural-tours': '#4a306d',
    adventure: '#8a3b12',
    'wildlife-nature': '#2d5a27',
    pilgrimage: '#6b4f1d',
  };
  for (const a of catalog.activityDefs) {
    const p = writeTemp(`icon-${a.slug}.svg`, svgIcon(a.slug, activityColors[a.slug] || '#333'));
    activityIcons[a.slug] = await uploadFile(strapi, p, `icon-${a.slug}`, `${a.name} icon`);
  }

  const teamPhotos = {};
  for (const m of catalog.team) {
    const p = writeTemp(`team-${m.slug}.svg`, svgAvatar(m.initials, m.color, m.role));
    teamPhotos[m.slug] = await uploadFile(strapi, p, m.slug, m.name);
  }

  const partnerLogos = {};
  const partnerColors = ['#1e3a5f', '#3d5a40', '#5c3d2e', '#4a306d'];
  for (const [i, ptn] of catalog.partners.entries()) {
    const p = writeTemp(`partner-${i}.svg`, svgMark(ptn.mark, partnerColors[i % partnerColors.length]));
    partnerLogos[ptn.name] = await uploadFile(strapi, p, ptn.mark, ptn.name);
  }

  const certPath = writeTemp(
    'company-registration.txt',
    'Nepal Trails Pvt. Ltd.\nCompany Registration (sample seed document)\nRegistration No: 123456/067/068\nThis file is placeholder test data for the About / Company page.\n'
  );
  const certFile = await uploadFile(strapi, certPath, 'company-registration', 'Sample company registration');
  const licencePath = writeTemp(
    'tourism-licence.txt',
    'Nepal Trails Pvt. Ltd.\nTourism / trekking licence (sample seed document)\nLicence: TAAN / NMA licensed operator (placeholder)\n'
  );
  const licenceFile = await uploadFile(strapi, licencePath, 'tourism-licence', 'Sample tourism licence');

  const img = (key) => mediaId(images[key] || images.everest);

  console.log('Seeding destinations…');
  const destinations = {};
  for (const d of catalog.destinations) {
    const banners = (d.imageKeys || []).map(img);
    destinations[d.slug] = await createPublished(strapi, 'api::destination.destination', {
      name: d.name,
      slug: d.slug,
      is_active: d.is_active,
      seo: { ...d.seo, shareImage: banners[0] },
      description: d.description,
      banner_image: banners,
    });
  }

  console.log('Seeding regions…');
  const regions = {};
  for (const r of catalog.regionDefs) {
    const thumb = img(r.imageKey);
    regions[r.slug] = await createPublished(strapi, 'api::region.region', {
      name: r.name,
      slug: r.slug,
      destination: destinations[r.destinationSlug].documentId,
      price_from: r.price_from,
      price_to: r.price_to,
      display_order: r.display_order,
      featured: r.featured,
      thumbnail: thumb,
      seo: { ...r.seo, shareImage: thumb },
      description: r.description,
    });
  }

  console.log('Seeding activities…');
  const activities = {};
  for (const a of catalog.activityDefs) {
    activities[a.slug] = await createPublished(strapi, 'api::activity.activity', {
      name: a.name,
      slug: a.slug,
      display_order: a.display_order,
      description: a.description,
      icon: mediaId(activityIcons[a.slug]),
    });
  }

  console.log(`Seeding ${catalog.trips.length} trips…`);
  const trips = {};
  for (const t of catalog.trips) {
    const gallery = img(t.imageKey);
    const region = regions[t.regionSlug];
    const activity = activities[t.activitySlug];
    if (!region) throw new Error(`Unknown region ${t.regionSlug} on ${t.slug}`);
    if (!activity) throw new Error(`Unknown activity ${t.activitySlug} on ${t.slug}`);
    const { regionSlug, activitySlug, imageKey, ...rest } = t;
    trips[t.slug] = await createPublished(strapi, 'api::trip.trip', {
      ...rest,
      region: region.documentId,
      activity: activity.documentId,
      gallery,
      seo: { ...rest.seo, shareImage: gallery },
    });
    process.stdout.write('.');
  }
  console.log('');

  console.log('Seeding fixed departures…');
  for (const d of catalog.departures) {
    const trip = trips[d.tripSlug];
    if (!trip) {
      console.log(`  skip departure, missing trip ${d.tripSlug}`);
      continue;
    }
    const { tripSlug, ...rest } = d;
    await createPublished(strapi, 'api::fixed-departure.fixed-departure', {
      ...rest,
      trip: trip.documentId,
    });
  }

  console.log('Seeding reviews…');
  for (const r of catalog.reviewPool) {
    const trip = trips[r.tripSlug];
    if (!trip) continue;
    const { tripSlug, ...rest } = r;
    await createPublished(strapi, 'api::review.review', {
      ...rest,
      approved: true,
      trip: trip.documentId,
    });
  }

  console.log('Seeding FAQs…');
  for (const f of catalog.faqDefs) {
    const { tripSlug, ...rest } = f;
    await createPublished(strapi, 'api::faq.faq', {
      ...rest,
      trip: tripSlug && trips[tripSlug] ? trips[tripSlug].documentId : null,
    });
  }

  console.log('Seeding team…');
  for (const member of catalog.team) {
    const { initials, color, ...rest } = member;
    await createPublished(strapi, 'api::team-member.team-member', {
      ...rest,
      photo: mediaId(teamPhotos[member.slug]),
    });
  }

  console.log('Seeding blogs…');
  const cats = {};
  for (const c of catalog.blogCategoryDefs) {
    cats[c.slug] = await createPublished(strapi, 'api::blog-catagory.blog-catagory', c);
  }
  for (const b of catalog.blogDefs) {
    const photo = img(b.imageKey);
    await createPublished(strapi, 'api::blog.blog', {
      title: b.title,
      slug: b.slug,
      catagory: cats[b.categorySlug].documentId,
      author: b.author,
      excerpt: b.excerpt,
      tags: b.tags,
      featured_image: photo,
      seo: { ...b.seo, shareImage: photo },
      content: b.content,
    });
  }

  console.log('Seeding static pages…');
  for (const p of catalog.staticPages) {
    await createPublished(strapi, 'api::static-page.static-page', {
      title: p.title,
      slug: p.slug,
      content: p.content,
      banner: img(p.imageKey),
      seo: { ...p.seo, shareImage: img(p.imageKey) },
    });
  }

  console.log('Seeding offices & partners…');
  for (const o of catalog.offices) {
    await createPublished(strapi, 'api::office.office', o);
  }
  for (const p of catalog.partners) {
    await createPublished(strapi, 'api::partner.partner', {
      name: p.name,
      website: p.website,
      display_order: p.display_order,
      logo: mediaId(partnerLogos[p.name]),
    });
  }

  console.log('Seeding video reviews…');
  for (const v of catalog.videoReviews) {
    const trip = trips[v.tripSlug];
    if (!trip) continue;
    await createPublished(strapi, 'api::video-review.video-review', {
      trip: trip.documentId,
      reviewer_name: v.reviewer_name,
      country: v.country,
      title: v.title,
      display_order: v.display_order,
      thumbnail: img(v.imageKey),
    });
  }

  console.log('Seeding inquiries & newsletters…');
  for (const i of catalog.inquiries) {
    const trip = trips[i.tripSlug];
    const { tripSlug, ...rest } = i;
    await createPublished(strapi, 'api::inquiry.inquiry', {
      ...rest,
      trip: trip ? trip.documentId : null,
    });
  }
  for (const n of catalog.newsletters) {
    await createPublished(strapi, 'api::newsletter.newsletter', n);
  }

  console.log('Seeding single types…');
  await upsertSingle(strapi, 'api::site-setting.site-setting', {
    title: 'Nepal Trails',
    site_name: 'Nepal Trails',
    tagline: 'Trekking, peaks, and cultural journeys across the Himalaya',
    logo: mediaId(logo),
    favicon: mediaId(favicon),
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
    seo: {
      ...seo(
        'Nepal Trails | Trekking & Tours',
        'Guided Everest, Annapurna, Langtang, Manaslu, Mustang and Dolpo adventures with local experts.'
      ),
      shareImage: img('everest'),
    },
  });

  await upsertSingle(strapi, 'api::homepage.homepage', {
    hero: 'Nepal Trails — Walk the Himalaya with local experts. Featured: Everest Base Camp, Annapurna Sanctuary, Upper Mustang, Manaslu Circuit.',
    featured_trips:
      'everest-base-camp-trek, annapurna-base-camp-trek, manaslu-circuit-trek, upper-mustang-trek, gokyo-lakes-trek, ghorepani-poon-hill-trek',
    featured_regions: 'everest-region, annapurna-region, upper-mustang, langtang-region, manaslu-region',
    featured_activities: 'trekking, peak-climbing, cultural-tours, wildlife-nature',
    why_choose_us:
      'Licensed local guides · Fair porter wages · Permit expertise · Safety-first acclimatization · Published departure seats · Restricted-area handling',
    featured_reviews: 'Sarah Mitchell, Emily Chen, Sophie Laurent',
    featured_blogs: 'prepare-first-himalayan-trek, best-time-trek-nepal, annapurna-vs-everest, lukla-flights-weather',
    cta_section:
      'Ready to plan? Tell us your dates and preferred region — we will reply with a tailored itinerary within one business day.',
  });

  await upsertSingle(strapi, 'api::header.header', {
    logo: mediaId(logo),
    top_bar: {
      phone: '+977-1-4000000',
      whatsapp: '+977-9800000000',
      email: 'info@nepaltrails.example',
      notice: 'Mon–Fri 9:00–18:00 NPT',
    },
    navigation: [
      { title: 'Destinations', type: 'page', url: '/destinations', display_order: 1 },
      { title: 'Trekking', type: 'page', url: '/trekking', display_order: 2, mega_menu: 'regions' },
      { title: 'Peak Climbing', type: 'page', url: '/activities/peak-climbing', display_order: 3 },
      { title: 'Tours', type: 'page', url: '/tours', display_order: 4 },
      { title: 'Blog', type: 'page', url: '/blog', display_order: 5 },
      { title: 'About', type: 'page', url: '/about', display_order: 6 },
      { title: 'Contact', type: 'page', url: '/contact', display_order: 7 },
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
      'Nepal Trails operates treks and tours across Nepal, Tibet, and Bhutan from Kathmandu and Pokhara offices. We focus on safety, local employment, and transparent pricing.',
    quick_links: [
      { title: 'About', type: 'page', url: '/about', display_order: 1 },
      { title: 'Contact', type: 'page', url: '/contact', display_order: 2 },
      { title: 'Terms', type: 'page', url: '/terms', display_order: 3 },
      { title: 'Privacy', type: 'page', url: '/privacy', display_order: 4 },
      { title: 'Responsible travel', type: 'page', url: '/responsible-travel', display_order: 5 },
      { title: 'Plan my trip', type: 'page', url: '/plan-my-trip', display_order: 6 },
    ],
    travel_links: [
      { title: 'Everest Region', type: 'page', url: '/trekking?region=everest-region', display_order: 1 },
      { title: 'Annapurna Region', type: 'page', url: '/trekking?region=annapurna-region', display_order: 2 },
      { title: 'Langtang', type: 'page', url: '/trekking?region=langtang-region', display_order: 3 },
      { title: 'Manaslu', type: 'page', url: '/trekking?region=manaslu-region', display_order: 4 },
      { title: 'Upper Mustang', type: 'page', url: '/trekking?region=upper-mustang', display_order: 5 },
      { title: 'Peak Climbing', type: 'page', url: '/activities/peak-climbing', display_order: 6 },
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

  try {
    await upsertSingle(strapi, 'api::about.about', {
      title: 'About Nepal Trails',
      blocks: [
        {
          __component: 'shared.rich-text',
          body: '## Our story\n\nNepal Trails began as a guide collective in Kathmandu and grew into a full-service trekking operator. We still measure success by safe summit attempts, fair wages, and travellers who return for a second region.',
        },
      ],
    });
  } catch (e) {
    console.log('Skipping about single type:', e.message);
  }

  try {
    await upsertSingle(strapi, 'api::company.company', {
      title: 'About the company',
      aboutCompany:
        'Nepal Trails Pvt. Ltd. is a Kathmandu-registered trekking operator. We run guided Himalayan journeys with licensed mountain staff, published inclusions, and the same care we would give family on the trail.\n\nCompany papers — registration, tourism licence, and insurance — are kept on this page so you can check who you are booking with before you travel.',
      legalName: 'Nepal Trails Pvt. Ltd.',
      registrationNumber: '123456/067/068',
      licenseNumber: 'TAAN / NMA licensed operator',
      documents: [
        {
          title: 'Company registration (sample)',
          category: 'Registration',
          description: 'Placeholder registration document for frontend development.',
          issuedDate: '2010-04-12',
          file: mediaId(certFile),
        },
        {
          title: 'Tourism licence (sample)',
          category: 'License',
          description: 'Placeholder licence document for frontend development.',
          issuedDate: '2024-01-15',
          file: mediaId(licenceFile),
        },
      ],
    });
  } catch (e) {
    console.log('Skipping company single type:', e.message);
  }

  try {
    await upsertSingle(strapi, 'api::global.global', {
      siteName: 'Nepal Trails',
      favicon: mediaId(favicon),
      siteDescription:
        'Trekking and adventure travel across Nepal, Tibet, and Bhutan — Everest, Annapurna, Langtang, Manaslu, Mustang, Dolpo.',
      defaultSeo: {
        ...seo('Nepal Trails', 'Guided Himalayan treks and cultural tours operated from Kathmandu.'),
        shareImage: img('everest'),
      },
    });
  } catch (e) {
    console.log('Skipping global single type:', e.message);
  }

  console.log('Seed complete.');
  console.log(
    `Created: ${catalog.destinations.length} destinations, ${catalog.regionDefs.length} regions, ${catalog.activityDefs.length} activities, ${catalog.trips.length} trips, ${catalog.blogDefs.length} blogs, ${catalog.reviewPool.length} reviews, ${catalog.faqDefs.length} FAQs, ${catalog.team.length} team, ${catalog.departures.length} departures.`
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
    try {
      fs.rmSync(TMP, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
