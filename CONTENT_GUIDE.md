# CONTENT_GUIDE.md — Editorial Guidelines for CMS Entry

> **Purpose:** Help editors enter **real** content consistently in the Strapi 5 model defined by `agent.md`.
> **Do not** paste sample trek itineraries, fake reviews, or placeholder blog posts into the CMS or into this guide.
> **Audience:** Content editors, SEO editors, ops staff handling Inquiry triage.

---

## 1. General principles

1. **Write for travelers first, search engines second.** Fill SEO fields with accurate summaries of the page — never keyword-stuffed templates (`agent.md` §9).
2. **Prefer structured fields over dumping everything into richtext.** Itinerary days, FAQs, inclusions, permits, and gallery items exist so the site (and JSON-LD) can use them.
3. **Use Media Library uploads** for all internal images. Do not paste third-party image URLs into media fields.
4. **Publish intentionally.** Editorial types use Draft & Publish — keep incomplete entries unpublished. Operational types (Departure, Inquiry) have no draft flag; use their `status` fields instead.
5. **Closed vocabularies are enums.** Pick from the dropdown; do not invent parallel spellings in free text when an enum exists (`tripType`, `difficulty`, inclusion categories, etc.).
6. **No hardcoded business facts in the frontend.** Permit costs, phones, and addresses belong in CMS fields (Trip permits, Site Setting).

---

## 2. SEO component (`shared.seo`) — what “good” looks like

Applies to: Trip, Destination, Activity, Blog Post, Blog Category, Author, Page (and Guide when guide pages are indexed).

| Field | Guidance |
| ----- | -------- |
| `metaTitle` | ~**60 characters** recommended. Unique per URL. Include the primary topic (trek/destination/article name) and brand only if it fits naturally. Leave empty only if the frontend’s fallback from `title`/`name` is explicitly accepted — prefer filling. |
| `metaDescription` | ~**160 characters** recommended. One or two sentences: who it’s for, what they get, differentiator. No quote stuffing, no duplicate of the entire `shortDescription` if that is longer. |
| `keywords` | Optional. Comma-separated. Low priority; do not treat as a ranking lever. |
| `canonicalURL` | Use only for deliberate canonicalization. Otherwise leave blank and let the frontend emit the default URL. |
| `noIndex` / `noFollow` | Default off. Enable only for thin, duplicate, or non-public pages. |
| `ogTitle` / `ogDescription` | Fill when the social preview should differ from meta (shorter/punchier). Else leave blank if frontend falls back. |
| `ogImage` / `twitterImage` | Prefer a **1200×630-ish** marketing crop when the hero is vertical or busy. Always Media Library. |
| `structuredData` | **Leave empty** in normal cases. Frontend builds JSON-LD from entity fields. Use only for approved edge-case overrides. |

---

## 3. Slugs (`uid`)

- Generated from `title` / `name`, then **edited once** for clarity if needed.
- Lowercase, hyphenated, stable. Avoid dates or campaign codes in evergreen trip slugs.
- Changing a published slug requires a **frontend redirect** plan — coordinate before saving.
- Uniqueness is per content type; frontend path prefixes (`/blog/`, `/destinations/`, …) separate types.

---

## 4. Trip

### Core copy

| Field | Guidance |
| ----- | -------- |
| `title` | Official product name as customers should say it. |
| `shortDescription` | Max ~**300 characters**. Card/listing blurb: duration + region + hook. Not a second meta description dump. |
| `description` | Full marketing body. Use headings/lists inside richtext sparingly; put day-by-day detail in `itinerary`, not only here. |
| `tripCode` | Optional internal SKU-like code; keep consistent with ops spreadsheets if any. |
| `tripType` | Pick the single best enum (`trekking`, `tour`, `peak-climbing`, …). Drives URL faceting on the frontend. |
| `durationDays` / `durationNights` | Must match itinerary span (including arrival/buffer days you number). |
| `price` / `priceCurrency` / `priceLabel` | Base “from” price. Use `priceLabel` for phrasing like “From” / “Per person” — don’t bury that only in richtext. |
| `maxAltitude` | Meters, integer. Highest sleep or point you claim on the trip. |
| `distance` | Free descriptive (e.g. total trek distance) unless you later standardize units. |
| `difficulty` | Honest enum relative to your catalog — stay consistent across similar products. |
| `groupSizeMin` / `groupSizeMax` | Operational truth for private vs group products. |
| `bestSeason` | JSON array of allowed tokens only: `spring`, `autumn`, `winter`, `summer`, `monsoon` (per model note). Do not invent other strings. |
| `accommodationType` | Single best-fit enum; detail nuances in itinerary `accommodation` or important information. |
| `featured` / `popular` / `recommended` | Editorial promotion flags — don’t enable all three by default. |
| `status` | Product lifecycle (`active`, `draft`, `seasonal`, `discontinued`) — **not** the same as CMS Draft & Publish. Public listings should generally use `active` (and published). |

### Relations

- Set **primary** `destination` always (URL/canonical region).
- Use `destinations` (M2M) only when the trip truly spans multiple regions.
- Link `activities` that customers would filter by.
- `relatedTrips`: 2–4 genuine alternatives; no need for symmetric links both ways.
- Attach `guides` only when those guides are actually associated with the product story.

### Components

**Itinerary (`trip.itinerary-day`)**

- One component row per day (or Day 0 arrival if you use that convention — `dayNumber` may be `0`).
- `title`: short day headline (place or theme), not a paragraph.
- `description`: what happens that day; keep logistics fields (`walkingHours`, `altitude`, meals, transport) in their fields when known.
- Order rows by `dayNumber`. Do not leave large gaps unless intentional.
- Optional day `image`: real photo of that segment when available; still use gallery for general sets.

**Highlights**

- Short, scannable benefits (not full paragraphs). Icons optional.

**Inclusions / exclusions**

- One discrete item per row. Use `category` enum consistently (`meals`, `permit`, `porter`, …).
- Prefer clear titles; put caveats in `description`.

**Permits**

- Real permit names, authority, and **estimated** costs as editorial data (currency enum). Link `officialUrl` when useful.
- Never tell developers to hardcode these in the frontend.

**FAQs**

- Real questions customers ask. `answer` in richtext; keep answers self-contained.
- Use `order` for display sequence (0, 1, 2…).
- Good FAQ pairs also feed FAQ structured data on the frontend.

**Important information**

- Use `type` enum (`altitude`, `visa`, `safety`, …) so the UI can group or iconify.
- Safety/altitude content must be accurate — prefer conservative wording.

**Gallery**

- Every item: required `altText` describing the scene (not “IMG_1234”).
- Optional `caption`, `credit`, `title` for attribution and lightbox.

---

## 5. Destination

| Field | Guidance |
| ----- | -------- |
| `name` / `slug` | Region or place name as used in navigation. |
| `shortDescription` | Listing card length; fuller story in `description`. |
| `regionCode` | Optional stable internal code; keep unique. |
| `country` | Default Nepal unless genuinely elsewhere. |
| Geo fields | Fill when you will show maps; use decimal lat/long consistently. |
| `bestSeason` | Same controlled token list as Trip. |
| Hierarchy | Set `parentDestination` for breadcrumb trees (e.g. area under a larger region). Don’t create deep trees without nav need. |
| `faqs` | Destination-level questions (permits for the area, weather, access) — not a copy-paste of every trip FAQ. |
| `relatedDestinations` | Editorial “explore next” links. |

---

## 6. Activity

- `name` should match filter labels customers understand (e.g. experience type).
- `icon`: small simple asset; `heroImage` for landing headers.
- Relate only trips/destinations where the activity is genuinely offered.
- SEO fields required if the activity URL is indexable.

---

## 7. Departure (ops / display availability)

- Always linked to a Trip.
- `departureDate` / `returnDate` required and coherent with trip duration.
- `price` overrides trip base price for that date when set.
- Keep `availableSeats` ≤ `totalSeats` (lifecycle validation may enforce).
- `status` reflects sales state (`open`, `limited`, `guaranteed`, `full`, `cancelled`, `completed`).
- `notes`: internal/ops — do not put customer-facing marketing here if Public API may expose it; prefer Trip fields for public copy.
- **Not a booking engine** — seats are display-only until a later phase.

---

## 8. Guide

| Field | Guidance |
| ----- | -------- |
| `shortBio` | 1–2 sentences for cards. |
| `biography` | Fuller profile richtext. |
| `languages` | Controlled list of language names/codes — don’t free-type uncontrolled variants if you can help it. |
| `specialties` | Link Activity records instead of inventing free-text specialty tags. |
| `certifications` | Follow whatever schema choice was implemented (component vs text); keep verifiable. |
| `socialLinks` | Valid URLs; correct `platform` enum. |
| `homeRegion` | Optional Destination relation. |

---

## 9. Review (moderation)

- Publish only after human check (Draft & Publish).
- `rating` integer 1–5 only.
- `name` = display name to show publicly.
- `source`: if not `website`, provide valid `sourceUrl`.
- `verified` / `featured`: set deliberately; featured reviews appear in promotions.
- Always link the correct `trip`.
- Do not invent testimonials.

---

## 10. Blog

### Blog Post

| Field | Guidance |
| ----- | -------- |
| `excerpt` | Required listing summary; ~1–2 sentences. |
| `content` | Full article body; use meaningful headings. |
| `featuredImage` | Required; ensure usable crop for cards and OG fallback. |
| `author` / `category` | Always set for bylines and Article metadata. |
| `tags` | Sparse, consistent labels; tags are not primary SEO landing pages by default. |
| `readingTime` | Optional minutes; can be estimated at publish. |
| Related trips/destinations/posts | Only when editorially relevant. |
| Dates | Use CMS publish flow (`publishedAt`); don’t add a second publish date field. |

### Blog Category / Tag / Author

- Category: clear name, short description, optional image + SEO if category pages are indexed.
- Tag: minimal — name/slug/description only.
- Author: real bio and photo; social links valid; SEO if author archives are public.

---

## 11. Page (static)

- One Page per stable URL (`about`, `contact`, policies, etc.).
- Keep the dynamic zone minimal:
  - **Text section:** heading + body.
  - **Image section:** image + **required** `altText` + optional caption.
  - **FAQ section:** heading + FAQ components (same quality bar as trip FAQs).
- Do not request dozens of new block types for layout experiments — extend only with a confirmed editorial need (`agent.md` §6.12 / §19).

---

## 12. Site Setting

- Single source for brand name, default SEO, logos, favicon, default social image, contact channels, addresses, social profiles, default currency.
- Use `officeLocation` only if it genuinely differs from `address`; otherwise keep one address to avoid drift.
- Emergency contact: only publish if the business wants it public on the site.

---

## 13. Inquiry (lead handling)

Editors/ops in Admin:

| Field | Guidance |
| ----- | -------- |
| Incoming public fields | Name, email, message required from forms; optional phone, country, travel date, party size, trip, `sourcePage`. |
| `status` | Workflow: start `new`, then `contacted` → `qualified` → `converted` / `closed` / `spam`. |
| `notes` | **Internal only** — never for public API consumption. |

Do not use Inquiry as a booking ledger; convert wins in a future booking phase.

---

## 14. Image & accessibility habits

- Write **alt text** that describes content and context (place, activity, people) without stuffing keywords.
- Prefer original or licensed photos; fill `credit` when attribution is required.
- Hero images should remain legible if the frontend overlays titles (avoid overly busy skyline crops when possible).

---

## 15. Consistency checks before pressing Publish

- [ ] Enums and seasons use allowed values only.
- [ ] Trip duration matches itinerary day span.
- [ ] Primary destination set; slug stable.
- [ ] SEO meta length roughly within recommendations.
- [ ] Gallery/image-section alt text present.
- [ ] FAQs are real Q&A pairs, ordered.
- [ ] Prices/currencies/permits look coherent across Trip and Departures.
- [ ] No unpublished dependencies required for the page to make sense (e.g. missing destination).

---

_End of CONTENT_GUIDE.md._
