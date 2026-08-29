'use strict';

function paragraph(text) {
  return { type: 'paragraph', children: [{ type: 'text', text }] };
}

function heading(text, level = 2) {
  return { type: 'heading', level, children: [{ type: 'text', text }] };
}

function blocks(...parts) {
  return parts.map((p) => (typeof p === 'string' ? paragraph(p) : p));
}

function seo(metaTitle, metaDescription, keywords = '') {
  return { metaTitle, metaDescription, keywords, canonical: '' };
}

function itinerary(days) {
  return days
    .map((d, i) => {
      const n = i + 1;
      if (typeof d === 'string') return `Day ${n}: ${d}`;
      const head = [`Day ${n}: ${d.title}`];
      if (d.alt) head[0] += ` (${d.alt})`;
      const lines = [head[0]];
      if (d.walk) lines.push(`Walking: ${d.walk}`);
      if (d.dist) lines.push(`Distance: ${d.dist}`);
      if (d.text) lines.push(d.text);
      const stayBits = [];
      if (d.meals) stayBits.push(`Meals: ${d.meals}`);
      if (d.stay) stayBits.push(`Overnight: ${d.stay}`);
      if (stayBits.length) lines.push(stayBits.join(' | '));
      return lines.join('\n');
    })
    .join('\n\n');
}

function bullets(...items) {
  return items.map((i) => `- ${i}`).join('\n');
}

const INCLUDE = {
  teahouse: bullets(
    'Airport pick-up and drop-off in Kathmandu (or Pokhara when the trip starts there)',
    'Hotel in Kathmandu or Pokhara on a twin-share basis with breakfast, nights as listed',
    'All ground transfers named in the itinerary (private vehicle or tourist bus)',
    'Tea-house lodging on trek, twin share',
    'Three meals a day on trek (breakfast, lunch, dinner) plus tea or coffee with meals',
    'Licensed English-speaking trekking guide',
    'Porter support (one porter per two trekkers, 20 kg combined)',
    'All trekking permits, park fees, and rural municipality charges required for the route',
    'Guide and porter insurance, wages, meals, and lodging',
    'Company first-aid kit carried by the guide',
    'Sleeping-bag and down-jacket rental coordination in Kathmandu (rental fee extra unless stated)',
    'Farewell dinner and a printed trip dossier'
  ),
  climbing: bullets(
    'Everything listed in the standard tea-house trek package for approach and exit days',
    'NMA / designated trekking-peak permit and garbage deposit handling',
    'Climbing guide (ratio as stated on the trip page)',
    'Group climbing equipment: ropes, snow bars, ice screws, tents at high camp',
    'High-camp meals and stove fuel',
    'Domestic flights named in the itinerary (typically Kathmandu–Lukla–Kathmandu)'
  ),
  tour: bullets(
    'Airport transfers',
    'Hotels on a twin-share basis with breakfast',
    'Private vehicle and licensed culture / nature guide',
    'Monument, park, or safari fees listed in the itinerary',
    'Activities named as included (for example jungle walks or boat rides)'
  ),
  restricted: bullets(
    'Restricted-area permits arranged through a registered agency',
    'Conservation-area permits on entry and exit as required',
    'Licensed guide (mandatory on restricted routes)',
    'Tea-house or camping package as described on the trip page',
    'All staff wages, insurance, and logistics'
  ),
};

const EXCLUDE = {
  teahouse: bullets(
    'International airfare and Nepal entry visa',
    'Travel insurance (mandatory; must cover helicopter evacuation to the trip’s maximum altitude)',
    'Lunch and dinner in Kathmandu or Pokhara unless named',
    'Personal trekking gear, sleeping-bag rental, and down-jacket rental',
    'Hot showers, Wi-Fi, device charging, bottled drinks, and snacks on trek',
    'Tips for guide, porter, and driver',
    'Extra nights caused by Lukla or mountain-flight delays',
    'Optional side trips, horse hire, and helicopter upgrades'
  ),
  climbing: bullets(
    'Personal climbing hardware (boots, crampons, harness, helmet, ice axe — rentable in Kathmandu)',
    'Insurance that explicitly covers mountaineering and rescue at the peak altitude',
    'Summit bonus where locally customary (briefed before departure)',
    'International flights, visa, tips, and Kathmandu extras'
  ),
  tour: bullets(
    'International flights, visa, and insurance',
    'Lunches and dinners unless named',
    'Personal shopping, tips, and optional activities'
  ),
};

const EQUIPMENT = {
  teahouse:
    'Broken-in waterproof boots, 30–35 L daypack, down or synthetic puffy, waterproof shell, warm hat and gloves, sunglasses (cat. 3–4), SPF 50, headlamp, two water bottles or a bladder, trekking poles, sleeping bag rated to at least −10 °C, personal first-aid and blister kit.',
  climbing:
    'Everything in the tea-house list plus double or stiff mountaineering boots, 12-point crampons, harness, helmet, ice axe, jumar and belay device, mitts, and a −20 °C bag for high camp. Group tents and ropes are provided.',
  tour: 'Comfortable walking shoes, sun hat, modest clothing for temples, light jacket, and a small daypack.',
};

const HIGHLIGHTS = {
  ebc: bullets(
    'Stand on the Khumbu Glacier at Everest Base Camp (5,364 m)',
    'Sunrise panorama from Kala Patthar (5,545 m)',
    'Acclimatization hike toward the Everest View Hotel above Namche',
    'Tengboche Monastery and Sherpa villages along the Dudh Koshi',
    'Suspension bridges, prayer wheels, and rhododendron forest',
    'Licensed local guide and porter support throughout'
  ),
};

module.exports = {
  paragraph,
  heading,
  blocks,
  seo,
  itinerary,
  bullets,
  INCLUDE,
  EXCLUDE,
  EQUIPMENT,
  HIGHLIGHTS,
};
