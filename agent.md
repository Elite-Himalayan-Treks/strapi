# AGENTS.md — Nepal Trekking & Travel Platform: Strapi 5 Content Model

> **Scope of this document:** Backend content model / schema ONLY (Strapi 5, headless CMS).
> **Out of scope:** Frontend implementation, authentication, payment gateways, booking engine/business logic, real-time inventory, CRM, emails, fake/demo content.
> **Audience:** An AI coding agent (Cursor) operating directly inside an existing Strapi 5 codebase.

This file is an executable instruction manual, not a tutorial. Follow it literally. Where a decision must be made (e.g. an existing conflicting content type), STOP and report — do not guess and do not perform destructive changes.

---

## 1. Project Overview

We are building the backend content model for a commercial Nepal trekking, tours, adventure and travel website. Strapi 5 is the headless CMS. The frontend (built separately, not in this scope) will consume the REST/GraphQL API to render SEO-optimized pages for treks, tours, destinations, blog content, and static pages.

The content model must:

- Represent trekking, tours, peak climbing, expeditions and other adventure products through one unified, extensible `Trip` entity.
- Support fixed departures with real seat availability.
- Support destinations (regions), activities (experience types), guides, reviews, blog content, static pages, and lead capture (inquiries).
- Be SEO-first: every indexable entity carries structured metadata, clean UID slugs, and image alt-text, and provides enough raw data for the frontend to generate JSON-LD.
- Be normalized: relational data uses Strapi relations, not JSON blobs. Structured repeating data (itinerary days, FAQs, inclusions) uses Strapi **components**, not free text.
- Be extensible: new trekking regions, activities, and future travel products must not require schema redesign.

---

## 2. Architecture Principles (Non-Negotiable)

1. SEO-first architecture — every public-facing entity has slug + SEO component.
2. Content-first architecture — the model serves editorial reality, not a specific frontend layout.
3. Normalize relationships; do not fake relations with JSON or free text.
4. Use reusable components for structured, repeatable, embedded data.
5. Use collection types only for entities that require independent querying, filtering, or relations.
6. UID fields power slugs; the `title`/`name` field is the UID target.
7. Draft & Publish enabled on all editorial collection types.
8. All media goes through the Strapi Media Library — never raw string URLs for internal images.
9. Design for future i18n (do not block localization later); do not implement translations now.
10. No hardcoded business data (permit prices, contact info, currency) — all editable via CMS.
11. Avoid excessive polymorphism; prefer explicit relations per entity over generic "linkable" polymorphic tables.
12. Avoid deep/circular population chains; keep API population shallow and predictable.
13. Every enum is a closed, code-friendly `enumeration` field — never free text for controlled vocabularies.

---

## 3. Pre-Implementation Inspection (STEP 1–5 — Mandatory, Run First)

Before creating anything, the agent MUST:

1. Read `package.json` and confirm the exact installed Strapi version (must be `^5.x`). If it is not Strapi 5, STOP and report the discrepancy — do not proceed with Strapi 5 syntax on a Strapi 4 project.
2. Detect package manager from lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`).
3. Detect TypeScript vs JavaScript Strapi project (check `tsconfig.json`, `.ts` schema/controller/service files under `src/api`).
4. List existing content types: `ls src/api`. For each, open `content-types/*/schema.json` and note `kind`, `attributes`, and relation targets.
5. List existing components: `ls -R src/components`.
6. Check `config/plugins.*` for i18n or other relevant plugins already enabled.
7. Check `database/migrations` (if present) for prior manual migrations.

**Conflict protocol:** If any existing content type/component collides in name or intent with anything in this document (e.g. a `trip` or `tour` API already exists):

- Do NOT overwrite it.
- Diff its current schema against the target schema below.
- Report the conflict, the existing fields, and a proposed non-destructive reconciliation (additive migration: new optional fields, new components, new relations) before making any change.
- Never drop a column/attribute that already has data without explicit confirmation.

---

## 4. Content Type Naming Conventions

- API IDs: kebab-case singular, e.g. `blog-post`, `site-setting`.
- `collectionName`: snake_case plural, e.g. `blog_posts`.
- Component category folders: `shared`, `trip`, `content`.
- Component IDs: `category.component-name`, e.g. `trip.itinerary-day`.
- All slugs: `type: "uid"`, `targetField` pointing at the primary title/name field, lowercase, hyphenated.

---

## 5. Collection Types — Full Field Specification

For every content type below: `"draftAndPublish": true` in `options` unless stated otherwise. Use Strapi 5 attribute syntax (`type`, `relation`, `target`, `mappedBy`/`inversedBy`, `component`, `repeatable`).

### 5.1 `api::trip.trip` — Trip (central commercial product)

`src/api/trip/content-types/trip/schema.json`

| Field                | Type                                                                               | Notes                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| title                | string                                                                             | required                                                                                                         |
| slug                 | uid                                                                                | targetField: title, required                                                                                     |
| shortDescription     | text                                                                               | required, max ~300 chars (use `maxLength`)                                                                       |
| description          | richtext                                                                           | required                                                                                                         |
| tripCode             | string                                                                             | unique, optional internal reference code                                                                         |
| tripType             | enumeration                                                                        | see §7, required                                                                                                 |
| durationDays         | integer                                                                            | required, min: 1                                                                                                 |
| durationNights       | integer                                                                            | required, min: 0                                                                                                 |
| price                | decimal                                                                            | required, min: 0                                                                                                 |
| priceCurrency        | enumeration                                                                        | `USD`, `NPR`, `EUR`, `GBP`, `AUD`; default `USD`                                                                 |
| priceLabel           | string                                                                             | optional, e.g. "From", "Per person"                                                                              |
| maxAltitude          | integer                                                                            | meters, min: 0                                                                                                   |
| distance             | string                                                                             | optional (free descriptive, e.g. "130 km"), OR decimal km if strict validation preferred                         |
| difficulty           | enumeration                                                                        | see §7, required                                                                                                 |
| groupSizeMin         | integer                                                                            | min: 1                                                                                                           |
| groupSizeMax         | integer                                                                            | min: 1                                                                                                           |
| bestSeason           | json                                                                               | store as array of enum-like strings (`spring`,`autumn`,`winter`,`summer`) — see note below                       |
| accommodationType    | enumeration                                                                        | `teahouse`,`camping`,`hotel`,`homestay`,`mixed`                                                                  |
| transportSummary     | text                                                                               | optional                                                                                                         |
| featured             | boolean                                                                            | default false                                                                                                    |
| popular              | boolean                                                                            | default false                                                                                                    |
| recommended          | boolean                                                                            | default false                                                                                                    |
| status               | enumeration                                                                        | see §7 (product lifecycle, NOT Draft & Publish)                                                                  |
| heroImage            | media (single, images)                                                             | required                                                                                                         |
| gallery              | component (repeatable) → `trip.gallery-item`                                       |                                                                                                                  |
| itinerary            | component (repeatable) → `trip.itinerary-day`                                      |                                                                                                                  |
| highlights           | component (repeatable) → `trip.highlight`                                          |                                                                                                                  |
| inclusions           | component (repeatable) → `trip.inclusion-item`                                     |                                                                                                                  |
| exclusions           | component (repeatable) → `trip.exclusion-item`                                     |                                                                                                                  |
| importantInformation | component (repeatable) → `trip.important-information`                              |                                                                                                                  |
| permits              | component (repeatable) → `trip.permit`                                             |                                                                                                                  |
| faqs                 | component (repeatable) → `trip.faq`                                                |                                                                                                                  |
| destination          | relation manyToOne → `api::destination.destination` (inversedBy `trips`)           | primary destination                                                                                              |
| destinations         | relation manyToMany → `api::destination.destination` (inversedBy `tripsSecondary`) | optional — for treks spanning multiple regions; keep `destination` as the canonical/primary one for URL building |
| activities           | relation manyToMany → `api::activity.activity` (inversedBy `trips`)                |                                                                                                                  |
| departures           | relation oneToMany → `api::departure.departure` (mappedBy `trip`)                  |                                                                                                                  |
| guides               | relation manyToMany → `api::guide.guide` (inversedBy `trips`)                      |                                                                                                                  |
| reviews              | relation oneToMany → `api::review.review` (mappedBy `trip`)                        |                                                                                                                  |
| relatedTrips         | relation manyToMany → `api::trip.trip`                                             | self-relation, not required to be symmetric editorially                                                          |
| seo                  | component (single) → `shared.seo`                                                  |                                                                                                                  |

> **Note on `bestSeason`:** Prefer a multi-select **enumeration is not multi-select in Strapi 5**, so use one of: (a) a `json` field storing a controlled array validated at the application/service layer, or (b) a repeatable component `shared.season-tag` with a single enum field. For simplicity and to avoid unnecessary components, use **`json`** here and document the allowed values (`spring`, `autumn`, `winter`, `summer`, `monsoon`) in the model's description. Do not accept arbitrary strings — validate in a `lifecycles.js`/service-layer hook if strict enforcement is required.

### 5.2 `api::destination.destination` — Destination

| Field               | Type                                                                                 | Notes                                           |
| ------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| name                | string                                                                               | required                                        |
| slug                | uid                                                                                  | targetField: name, required                     |
| shortDescription    | text                                                                                 |                                                 |
| description         | richtext                                                                             |                                                 |
| regionCode          | string                                                                               | unique, optional short code (e.g. `EBC-REGION`) |
| country             | string                                                                               | default "Nepal"                                 |
| province            | string                                                                               |                                                 |
| district            | string                                                                               |                                                 |
| latitude            | decimal                                                                              |                                                 |
| longitude           | decimal                                                                              |                                                 |
| elevation           | integer                                                                              | meters                                          |
| bestSeason          | json                                                                                 | same convention as Trip.bestSeason              |
| heroImage           | media (single, images)                                                               |                                                 |
| gallery             | component (repeatable) → `trip.gallery-item`                                         |                                                 |
| featured            | boolean                                                                              | default false                                   |
| parentDestination   | relation manyToOne → `api::destination.destination` (inversedBy `childDestinations`) | self-relation, hierarchical                     |
| childDestinations   | relation oneToMany → `api::destination.destination` (mappedBy `parentDestination`)   |                                                 |
| trips               | relation oneToMany → `api::trip.trip` (mappedBy `destination`)                       | primary trips                                   |
| activities          | relation manyToMany → `api::activity.activity` (inversedBy `destinations`)           | activities commonly available here              |
| faqs                | component (repeatable) → `trip.faq`                                                  | destination-level FAQs                          |
| relatedDestinations | relation manyToMany → `api::destination.destination`                                 |                                                 |
| seo                 | component (single) → `shared.seo`                                                    |                                                 |

### 5.3 `api::activity.activity` — Activity

| Field            | Type                                                                         | Notes                       |
| ---------------- | ---------------------------------------------------------------------------- | --------------------------- |
| name             | string                                                                       | required                    |
| slug             | uid                                                                          | targetField: name, required |
| shortDescription | text                                                                         |                             |
| description      | richtext                                                                     |                             |
| icon             | media (single, images)                                                       | small icon/SVG asset        |
| heroImage        | media (single, images)                                                       |                             |
| featured         | boolean                                                                      | default false               |
| trips            | relation manyToMany → `api::trip.trip` (mappedBy `activities`)               |                             |
| destinations     | relation manyToMany → `api::destination.destination` (mappedBy `activities`) |                             |
| seo              | component (single) → `shared.seo`                                            |                             |

### 5.4 `api::departure.departure` — Departure

| Field                 | Type                                                            | Notes                                                        |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| trip                  | relation manyToOne → `api::trip.trip` (inversedBy `departures`) | required                                                     |
| departureDate         | date                                                            | required                                                     |
| returnDate            | date                                                            | required                                                     |
| price                 | decimal                                                         | required, min: 0 — overrides Trip.price for this date if set |
| priceCurrency         | enumeration                                                     | same set as Trip.priceCurrency                               |
| totalSeats            | integer                                                         | required, min: 0                                             |
| availableSeats        | integer                                                         | required, min: 0                                             |
| minimumParticipants   | integer                                                         | min: 1                                                       |
| confirmedParticipants | integer                                                         | min: 0, default 0                                            |
| status                | enumeration                                                     | see §7, required                                             |
| bookingDeadline       | date                                                            |                                                              |
| notes                 | text                                                            |                                                              |

`options.draftAndPublish`: **false** — departures are transactional/operational data, not editorial drafts; publish state is represented by `status`.

Relationship: **Trip 1 ── N Departure** (not JSON). No booking logic is implemented here — this is display-only availability data.

### 5.5 `api::guide.guide` — Guide

| Field           | Type                                                                        | Notes                                                        |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| name            | string                                                                      | required                                                     |
| slug            | uid                                                                         | targetField: name, required                                  |
| position        | string                                                                      | e.g. "Senior Trekking Guide"                                 |
| shortBio        | text                                                                        |                                                              |
| biography       | richtext                                                                    |                                                              |
| yearsExperience | integer                                                                     | min: 0                                                       |
| languages       | json                                                                        | controlled array of language codes/names (see note in §5.1)  |
| specialties     | relation manyToMany → `api::activity.activity`                              | reuse Activity as controlled vocabulary instead of free text |
| certifications  | component (repeatable) → `content.certification` _(optional — see §6 note)_ | or `text` if editorial simplicity is preferred               |
| homeRegion      | relation manyToOne → `api::destination.destination`                         | optional                                                     |
| profileImage    | media (single, images)                                                      |                                                              |
| featured        | boolean                                                                     | default false                                                |
| trips           | relation manyToMany → `api::trip.trip` (mappedBy `guides`)                  |                                                              |
| socialLinks     | component (repeatable) → `shared.social-link`                               |                                                              |
| seo             | component (single) → `shared.seo`                                           |                                                              |

### 5.6 `api::review.review` — Review

| Field       | Type                                                         | Notes                                                  |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| name        | string                                                       | required, reviewer display name                        |
| country     | string                                                       | optional, reviewer's country                           |
| rating      | integer                                                      | required, `min: 1`, `max: 5`                           |
| title       | string                                                       | optional headline                                      |
| comment     | text                                                         | required                                               |
| reviewDate  | date                                                         | required                                               |
| source      | enumeration                                                  | see §7, required                                       |
| sourceUrl   | string                                                       | validate as URL; required only if `source` ≠ `website` |
| verified    | boolean                                                      | default false                                          |
| featured    | boolean                                                      | default false                                          |
| trip        | relation manyToOne → `api::trip.trip` (inversedBy `reviews`) | required                                               |
| authorImage | media (single, images)                                       | optional                                               |

`options.draftAndPublish`: **true** — allows moderation before publishing.

### 5.7 `api::blog-post.blog-post` — Blog Post

| Field               | Type                                                                         | Notes                                               |
| ------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| title               | string                                                                       | required                                            |
| slug                | uid                                                                          | targetField: title, required                        |
| excerpt             | text                                                                         | required, short summary for listings                |
| content             | richtext                                                                     | required                                            |
| featuredImage       | media (single, images)                                                       | required                                            |
| gallery             | component (repeatable) → `trip.gallery-item`                                 |                                                     |
| author              | relation manyToOne → `api::author.author` (inversedBy `posts`)               |                                                     |
| category            | relation manyToOne → `api::blog-category.blog-category` (inversedBy `posts`) |                                                     |
| tags                | relation manyToMany → `api::tag.tag` (inversedBy `posts`)                    |                                                     |
| readingTime         | integer                                                                      | minutes, optional (can be computed at publish time) |
| featured            | boolean                                                                      | default false                                       |
| relatedTrips        | relation manyToMany → `api::trip.trip`                                       |                                                     |
| relatedDestinations | relation manyToMany → `api::destination.destination`                         |                                                     |
| relatedPosts        | relation manyToMany → `api::blog-post.blog-post`                             | self-relation                                       |
| seo                 | component (single) → `shared.seo`                                            |                                                     |

> Use Strapi's built-in `publishedAt` (part of Draft & Publish) instead of a duplicate custom `publishedAt` field.

### 5.8 `api::blog-category.blog-category` — Blog Category

| Field       | Type                                                                  | Notes                       |
| ----------- | --------------------------------------------------------------------- | --------------------------- |
| name        | string                                                                | required                    |
| slug        | uid                                                                   | targetField: name, required |
| description | text                                                                  |                             |
| image       | media (single, images)                                                |                             |
| posts       | relation oneToMany → `api::blog-post.blog-post` (mappedBy `category`) |                             |
| seo         | component (single) → `shared.seo`                                     |                             |

### 5.9 `api::tag.tag` — Tag

| Field       | Type                                                               | Notes                       |
| ----------- | ------------------------------------------------------------------ | --------------------------- |
| name        | string                                                             | required                    |
| slug        | uid                                                                | targetField: name, required |
| description | text                                                               | optional                    |
| posts       | relation manyToMany → `api::blog-post.blog-post` (mappedBy `tags`) |                             |

Keep this collection type intentionally minimal — no SEO component (tags are not primary indexable landing pages by default; if they later become indexable, add `seo` then).

### 5.10 `api::author.author` — Author

| Field        | Type                                                                | Notes                       |
| ------------ | ------------------------------------------------------------------- | --------------------------- |
| name         | string                                                              | required                    |
| slug         | uid                                                                 | targetField: name, required |
| bio          | richtext                                                            |                             |
| profileImage | media (single, images)                                              |                             |
| jobTitle     | string                                                              |                             |
| socialLinks  | component (repeatable) → `shared.social-link`                       |                             |
| posts        | relation oneToMany → `api::blog-post.blog-post` (mappedBy `author`) |                             |
| seo          | component (single) → `shared.seo`                                   |                             |

### 5.11 `api::inquiry.inquiry` — Inquiry (Lead)

| Field          | Type                                  | Notes                                          |
| -------------- | ------------------------------------- | ---------------------------------------------- |
| name           | string                                | required                                       |
| email          | email                                 | required                                       |
| phone          | string                                | optional                                       |
| country        | string                                | optional                                       |
| travelDate     | date                                  | optional, tentative                            |
| numberOfPeople | integer                               | min: 1                                         |
| trip           | relation manyToOne → `api::trip.trip` | optional                                       |
| message        | text                                  | required                                       |
| sourcePage     | string                                | free text URL/path the inquiry originated from |
| status         | enumeration                           | see §7, default `new`                          |
| notes          | text                                  | internal-only notes for staff                  |

`options.draftAndPublish`: **false** — this is operational lead data, not editorial content. No booking/payment logic is implemented; this is CMS-side lead capture only.

### 5.12 `api::page.page` — Page (generic static SEO page)

| Field     | Type                              | Notes                                                                                                                          |
| --------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| title     | string                            | required                                                                                                                       |
| slug      | uid                               | targetField: title, required                                                                                                   |
| excerpt   | text                              | optional                                                                                                                       |
| content   | richtext                          | main body content                                                                                                              |
| heroImage | media (single, images)            | optional                                                                                                                       |
| sections  | dynamiczone                       | components: `content.text-section`, `content.image-section`, `content.faq-section` _(minimal, purposeful set only — see §6.9)_ |
| seo       | component (single) → `shared.seo` |                                                                                                                                |

Keep the dynamic zone deliberately small. Do not build a generic page-builder with dozens of block types — that is explicitly out of scope ("do not create an unnecessarily complicated page builder").

### 5.13 `api::site-setting.site-setting` — Site Setting (Single Type)

`kind: "singleType"`, `options.draftAndPublish: false`.

| Field                    | Type                                          | Notes                                                                                            |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| siteName                 | string                                        | required                                                                                         |
| siteDescription          | text                                          |                                                                                                  |
| defaultLogo              | media (single, images)                        |                                                                                                  |
| favicon                  | media (single, images)                        |                                                                                                  |
| defaultSocialImage       | media (single, images)                        |                                                                                                  |
| defaultSeo               | component (single) → `shared.seo`             | fallback SEO used when a page-level SEO field is empty                                           |
| contactEmail             | email                                         |                                                                                                  |
| phone                    | string                                        |                                                                                                  |
| whatsapp                 | string                                        |                                                                                                  |
| address                  | component (single) → `content.location`       |                                                                                                  |
| officeLocation           | component (single) → `content.location`       | duplicate only if HQ vs. visiting address genuinely differ; otherwise remove and reuse `address` |
| socialLinks              | component (repeatable) → `shared.social-link` |                                                                                                  |
| googleBusinessProfileUrl | string                                        | URL validation                                                                                   |
| tripAdvisorUrl           | string                                        | URL validation                                                                                   |
| emergencyContact         | string                                        |                                                                                                  |
| defaultCurrency          | enumeration                                   | same set as Trip.priceCurrency                                                                   |

---

## 6. Components — Full Field Specification

### 6.1 `shared.seo`

| Field              | Type                   | Notes                                                                                                                                                                                                   |
| ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| metaTitle          | string                 | max ~60 chars recommended                                                                                                                                                                               |
| metaDescription    | text                   | max ~160 chars recommended                                                                                                                                                                              |
| keywords           | string                 | comma-separated, optional                                                                                                                                                                               |
| canonicalURL       | string                 | URL validation                                                                                                                                                                                          |
| noIndex            | boolean                | default false                                                                                                                                                                                           |
| noFollow           | boolean                | default false                                                                                                                                                                                           |
| ogTitle            | string                 |                                                                                                                                                                                                         |
| ogDescription      | text                   |                                                                                                                                                                                                         |
| ogImage            | media (single, images) |                                                                                                                                                                                                         |
| twitterTitle       | string                 |                                                                                                                                                                                                         |
| twitterDescription | text                   |                                                                                                                                                                                                         |
| twitterImage       | media (single, images) |                                                                                                                                                                                                         |
| structuredData     | json                   | optional manual JSON-LD override for edge cases only — the frontend should generate structured data dynamically from entity fields by default; this field is an escape hatch, not the primary mechanism |

### 6.2 `shared.social-link`

| Field    | Type        | Notes                    |
| -------- | ----------- | ------------------------ |
| platform | enumeration | see §7                   |
| url      | string      | required, URL validation |
| label    | string      | optional display label   |

### 6.3 `trip.itinerary-day`

| Field          | Type                   | Notes                                                          |
| -------------- | ---------------------- | -------------------------------------------------------------- |
| dayNumber      | integer                | required, min: 0 (0 allowed for "Day 0 / arrival" conventions) |
| title          | string                 | required                                                       |
| description    | richtext               | required                                                       |
| startLocation  | string                 |                                                                |
| endLocation    | string                 |                                                                |
| distance       | string                 | e.g. "12 km"                                                   |
| walkingHours   | string                 | e.g. "5-6 hrs"                                                 |
| altitude       | integer                | meters                                                         |
| elevationGain  | integer                | meters                                                         |
| elevationLoss  | integer                | meters                                                         |
| accommodation  | string                 | e.g. "Teahouse", "Camping"                                     |
| meals          | string                 | e.g. "Breakfast, Lunch, Dinner"                                |
| transportation | string                 | e.g. "Private Jeep", "Domestic Flight"                         |
| highlights     | text                   | optional                                                       |
| image          | media (single, images) | optional                                                       |

### 6.4 `trip.inclusion-item`

| Field       | Type        | Notes    |
| ----------- | ----------- | -------- |
| title       | string      | required |
| description | text        | optional |
| category    | enumeration | see §7   |

### 6.5 `trip.exclusion-item`

| Field       | Type        | Notes                                                                |
| ----------- | ----------- | -------------------------------------------------------------------- |
| title       | string      | required                                                             |
| description | text        | optional                                                             |
| category    | enumeration | reuse the same category set as `trip.inclusion-item` for consistency |

### 6.6 `trip.faq`

| Field    | Type     | Notes                                |
| -------- | -------- | ------------------------------------ |
| question | string   | required                             |
| answer   | richtext | required                             |
| order    | integer  | default 0, used for display ordering |

### 6.7 `trip.highlight`

| Field       | Type                   | Notes    |
| ----------- | ---------------------- | -------- |
| title       | string                 | required |
| description | text                   | optional |
| icon        | media (single, images) | optional |

### 6.8 `trip.permit`

| Field            | Type        | Notes                          |
| ---------------- | ----------- | ------------------------------ |
| name             | string      | required                       |
| description      | text        |                                |
| required         | boolean     | default true                   |
| issuingAuthority | string      | e.g. "Nepal Tourism Board"     |
| estimatedCost    | decimal     | min: 0                         |
| currency         | enumeration | same set as Trip.priceCurrency |
| notes            | text        |                                |
| officialUrl      | string      | URL validation                 |

Permit/TIMS prices are editorial data managed here — never hardcoded in frontend code.

### 6.9 `trip.important-information`

| Field   | Type        | Notes    |
| ------- | ----------- | -------- |
| title   | string      | required |
| content | richtext    | required |
| type    | enumeration | see §7   |

### 6.10 `trip.gallery-item`

| Field   | Type                   | Notes                                         |
| ------- | ---------------------- | --------------------------------------------- |
| image   | media (single, images) | required                                      |
| caption | string                 | optional                                      |
| altText | string                 | required — must not depend solely on filename |
| title   | string                 | optional                                      |
| credit  | string                 | optional photo credit/attribution             |

### 6.11 `content.location`

| Field     | Type    | Notes                              |
| --------- | ------- | ---------------------------------- |
| name      | string  | optional label, e.g. "Head Office" |
| address   | string  |                                    |
| city      | string  |                                    |
| district  | string  |                                    |
| country   | string  | default "Nepal"                    |
| latitude  | decimal |                                    |
| longitude | decimal |                                    |
| mapUrl    | string  | URL validation                     |

### 6.12 `content.text-section` / `content.image-section` / `content.faq-section` (Page dynamic zone only)

Keep minimal:

- `content.text-section`: `heading` (string), `body` (richtext).
- `content.image-section`: `image` (media), `caption` (string), `altText` (string, required).
- `content.faq-section`: `heading` (string), `faqs` (repeatable component → `trip.faq`).

Do not add more block types unless a real editorial need is confirmed later.

---

## 7. Enumerations (Closed Vocabularies)

Define these as `enumeration` attributes with the exact values below. Do not accept free text for any of them.

| Field                                                                                                      | Enum values                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `trip.tripType`                                                                                            | `trekking`, `tour`, `peak-climbing`, `expedition`, `hiking`, `adventure`, `cultural`, `wildlife`, `pilgrimage`, `custom`      |
| `trip.difficulty`                                                                                          | `easy`, `moderate`, `strenuous`, `challenging`, `extreme`                                                                     |
| `trip.status`                                                                                              | `active`, `draft`, `seasonal`, `discontinued`                                                                                 |
| `trip.priceCurrency` / `departure.priceCurrency` / `trip.permit.currency` / `site-setting.defaultCurrency` | `USD`, `NPR`, `EUR`, `GBP`, `AUD`                                                                                             |
| `trip.accommodationType`                                                                                   | `teahouse`, `camping`, `hotel`, `homestay`, `mixed`                                                                           |
| `departure.status`                                                                                         | `open`, `limited`, `guaranteed`, `full`, `cancelled`, `completed`                                                             |
| `review.source`                                                                                            | `website`, `google`, `tripadvisor`, `other`                                                                                   |
| `inquiry.status`                                                                                           | `new`, `contacted`, `qualified`, `converted`, `closed`, `spam`                                                                |
| `trip.inclusion-item.category` / `trip.exclusion-item.category`                                            | `accommodation`, `meals`, `transportation`, `guide`, `porter`, `permit`, `domestic-flight`, `insurance`, `equipment`, `other` |
| `trip.important-information.type`                                                                          | `safety`, `altitude`, `visa`, `permit`, `preparation`, `weather`, `transportation`, `accommodation`, `health`, `other`        |
| `shared.social-link.platform`                                                                              | `facebook`, `instagram`, `youtube`, `linkedin`, `whatsapp`, `tiktok`, `tripadvisor`, `x`, `other`                             |

---

## 8. Relationship Map

```
Trip        N ── 1 Destination           (destination, inversedBy trips)
Trip        N ── N Destination           (destinations, secondary regions — optional)
Trip        N ── N Activity              (activities ⇄ trips)
Trip        1 ── N Departure             (departures ⇄ trip)   [REQUIRED — never JSON]
Trip        N ── N Guide                 (guides ⇄ trips)
Trip        1 ── N Review                (reviews ⇄ trip)
Trip        N ── N Trip                  (relatedTrips, self-relation)

Destination 1 ── N Destination           (parentDestination / childDestinations, self-relation)
Destination N ── N Activity              (activities ⇄ destinations)
Destination N ── N Destination           (relatedDestinations, self-relation)

BlogPost    N ── 1 Author                (author ⇄ posts)
BlogPost    N ── 1 BlogCategory          (category ⇄ posts)
BlogPost    N ── N Tag                   (tags ⇄ posts)
BlogPost    N ── N Trip                  (relatedTrips)
BlogPost    N ── N Destination           (relatedDestinations)
BlogPost    N ── N BlogPost              (relatedPosts, self-relation)

Inquiry     N ── 1 Trip                  (optional trip reference)
Guide       N ── 1 Destination           (homeRegion, optional)
```

Rules:

- Never manually create a mirrored foreign-key field for a relation Strapi already manages via `inversedBy`/`mappedBy`.
- Every bidirectional relation above must declare both sides (owning + inverse) so population works from either entity.
- Self-relations (`relatedTrips`, `relatedPosts`, `relatedDestinations`) are editorial associations, not required to be perfectly symmetric — treat them as `manyToMany` relations to the same content type.

---

## 9. SEO Requirements

Every entity listed below MUST include the `shared.seo` component and a unique `uid` slug:

- Trip
- Destination
- Activity
- BlogPost
- BlogCategory
- Author
- Page

Rules:

- UID fields are globally unique per content type by Strapi default — do not disable this.
- Do not allow two entities of different types to accidentally produce the same frontend URL path; the frontend routing layer (out of scope here) is responsible for namespacing (`/trekking/{slug}`, `/blog/{slug}`, etc.), but the schema must guarantee slug uniqueness within each type.
- `shared.seo.structuredData` is an optional manual override only — the default expectation is that the frontend derives JSON-LD dynamically from entity fields (title, description, images, price, rating, itinerary, FAQs, etc.).
- Do not auto-populate `metaTitle`/`metaDescription` with templated keyword-stuffed text at the schema level; these remain empty by default and are filled editorially.

---

## 10. URL Architecture (Frontend Responsibility — Schema Must Support It)

The schema must NOT hardcode routes. It only needs to expose the data the frontend needs to build URLs such as:

```
/trekking/nepal/
/trekking/{trip-slug}/
/destinations/{destination-slug}/
/activities/{activity-slug}/
/tours/
/peak-climbing/
/blog/
/blog/{post-slug}/
/about/            → Page
/contact/          → Page
```

`tripType` (enum) and `destination`/`activities` relations give the frontend everything needed to build faceted, hierarchical URLs without any URL-related fields stored in the CMS.

---

## 11. Structured Data Support (Data Source Only — No Frontend Generation Here)

The schema must provide enough raw data for the frontend to generate, where appropriate:

| Schema.org type                     | Backed by                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Organization                        | SiteSetting                                                                                                                            |
| WebSite                             | SiteSetting                                                                                                                            |
| BreadcrumbList                      | Destination hierarchy + Activity + Trip relations                                                                                      |
| TouristTrip / Trip-appropriate type | Trip fields (title, description, duration, itinerary)                                                                                  |
| Product/Offer                       | Trip.price, priceCurrency, Departure availability — only when the frontend determines a trip is being presented as a purchasable offer |
| Review / AggregateRating            | Review collection type, aggregated per Trip                                                                                            |
| Article                             | BlogPost                                                                                                                               |
| FAQPage                             | `trip.faq` component (on Trip, Destination, Page)                                                                                      |
| Person                              | Guide, Author                                                                                                                          |

Do not mark every Trip as a `Product` in the schema layer — that decision belongs to the frontend based on context. The backend simply exposes the underlying facts.

---

## 12. Media / Image SEO Rules

- All hero images, gallery images, icons, and profile images use Strapi's `media` type through the Media Library — never plain string URLs for internally-managed images.
- Every gallery item (`trip.gallery-item`) requires editable `altText` — do not rely on filenames for accessibility/SEO.
- `shared.seo.ogImage` / `twitterImage` are separate media fields so social preview images can differ from the on-page hero image.

---

## 13. Internationalization Readiness

- Do not implement translated locales now.
- Ensure `i18n` plugin compatibility is not blocked: avoid attribute configurations that are impossible to localize later (e.g. do not bake language-specific text into non-localizable JSON blobs where a `richtext`/`string` field would do).
- When i18n is enabled in a future phase, `localized: true` can be added per-field in each schema's `pluginOptions.i18n` — no schema redesign should be required.

---

## 14. Validation Rules Summary

| Rule                                           | Applies to                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Required + unique slug (`uid`)                 | Trip, Destination, Activity, Guide, BlogPost, BlogCategory, Tag, Author, Page                     |
| `durationDays` positive integer                | Trip                                                                                              |
| `price` / `estimatedCost` non-negative decimal | Trip, Departure, trip.permit                                                                      |
| `maxAltitude` non-negative integer             | Trip                                                                                              |
| `rating` integer between 1 and 5               | Review                                                                                            |
| `availableSeats` >= 0, `totalSeats` >= 0       | Departure                                                                                         |
| `departureDate` and `returnDate` required      | Departure                                                                                         |
| `email` format validation                      | Inquiry, Author (if email added later)                                                            |
| URL format validation                          | shared.seo.canonicalURL, shared.social-link.url, trip.permit.officialUrl, content.location.mapUrl |
| `dayNumber` non-negative integer               | trip.itinerary-day                                                                                |

Use Strapi's native attribute-level constraints (`required`, `unique`, `min`, `max`, `minLength`, `maxLength`, `regex`) wherever the schema format supports it. For cross-field validation not expressible declaratively (e.g. `availableSeats <= totalSeats`), implement a `lifecycles` hook in the content type's `content-types/{name}/lifecycles.js` (or `src/api/{name}/services` custom logic) — this is schema-adjacent validation, not business/booking logic, and is in scope.

---

## 15. Strapi 5 File Structure to Create

```
src/
├── api/
│   ├── trip/
│   │   ├── content-types/trip/schema.json
│   │   ├── controllers/trip.js|ts
│   │   ├── routes/trip.js|ts
│   │   └── services/trip.js|ts
│   ├── destination/...
│   ├── activity/...
│   ├── departure/...          (draftAndPublish: false)
│   ├── guide/...
│   ├── review/...
│   ├── blog-post/...
│   ├── blog-category/...
│   ├── tag/...
│   ├── author/...
│   ├── inquiry/...             (draftAndPublish: false)
│   ├── page/...
│   └── site-setting/           (singleType, draftAndPublish: false)
│       ├── content-types/site-setting/schema.json
│       ├── controllers/site-setting.js|ts
│       ├── routes/site-setting.js|ts
│       └── services/site-setting.js|ts
└── components/
    ├── shared/
    │   ├── seo.json
    │   └── social-link.json
    ├── trip/
    │   ├── itinerary-day.json
    │   ├── inclusion-item.json
    │   ├── exclusion-item.json
    │   ├── faq.json
    │   ├── highlight.json
    │   ├── permit.json
    │   ├── important-information.json
    │   └── gallery-item.json
    └── content/
        ├── location.json
        ├── text-section.json
        ├── image-section.json
        └── faq-section.json
```

Match `.js`/`.ts` for controllers/routes/services to whatever the existing project already uses (detected in §3). Use Strapi 5's factory helpers (`createCoreController`, `createCoreRouter`, `createCoreService`) for default CRUD — do not hand-roll routes/controllers unless custom behavior is explicitly required (none is, in this phase).

---

## 16. Implementation Instructions (Ordered — Execute Sequentially)

1. Run the pre-implementation inspection in §3. Produce a short findings note before writing any files.
2. Create component JSON files first (§6), grouped by category folder, since content types depend on them.
3. Create collection type schema.json files in this dependency order to avoid referencing not-yet-created targets:
   `activity → destination → guide → author → tag → blog-category → trip → departure → review → blog-post → page → site-setting → inquiry`
4. For each schema.json, use the standard Strapi 5 shape:
   ```json
   {
     "kind": "collectionType",
     "collectionName": "trips",
     "info": {
       "singularName": "trip",
       "pluralName": "trips",
       "displayName": "Trip",
       "description": "Trekking, tour, climbing and expedition products"
     },
     "options": { "draftAndPublish": true },
     "pluginOptions": {},
     "attributes": {}
   }
   ```
   Fill `attributes` per the field tables in §5.
5. For each component JSON, use:
   ```json
   {
     "collectionName": "components_trip_itinerary_days",
     "info": { "displayName": "Itinerary Day", "icon": "calendar" },
     "options": {},
     "attributes": {}
   }
   ```
6. Generate default `controllers/routes/services` for every new content type using the core factories.
7. Wire up relations exactly as specified in §8 — both owning and inverse sides.
8. Add attribute-level validation per §14.
9. Do not touch any existing, unrelated content type, component, plugin config, or frontend code.
10. Do not create seed/demo data. Do not fabricate sample trips, destinations, or reviews.

---

## 17. Verification Instructions (Run After Implementation)

1. Run the project's schema/type validation or a development boot to confirm Strapi loads without schema errors (use whichever script `package.json` defines, e.g. `develop`, `build`, or a dedicated `strapi ts:generate-types` if TypeScript).
2. Confirm no duplicate `collectionName` values across new and existing content types.
3. Confirm every relation target (`target: "api::x.x"`) refers to a content type that actually exists after this implementation.
4. Confirm every `uid` field has a valid `targetField`.
5. Confirm no circular `required` relation chains that would make content uncreatable (e.g. Trip requiring Departure requiring Trip on creation — Departure→Trip is `manyToOne` required, Trip→Departure is the non-required inverse, which is correct and non-circular).
6. Confirm enumerations match §7 exactly (no typos, no extra values).
7. Fix any schema errors surfaced by the boot process.
8. Produce a concise implementation report: content types created, components created, relations wired, any conflicts found and how they were resolved (or left for human review), and any deviations from this document with justification.

---

## 18. Safety Rules (Absolute)

The agent must NEVER:

- Delete the entire `src/api` or `src/components` directory.
- Reset or drop the database.
- Delete existing migrations.
- Overwrite an existing content type without first inspecting and reporting the conflict.
- Modify frontend code (there is no frontend in scope).
- Install packages beyond what Strapi core already provides for this schema work.
- Generate fake/demo production data.
- Hardcode API keys, passwords, permit prices, or business contact information anywhere in code or schema defaults.
- Create unnecessary plugins.
- Implement authentication, payments, booking logic, inventory logic, CRM integration, automated emails, or search — these remain explicitly out of scope for this phase.

If a destructive change appears necessary to satisfy this spec, STOP and explain the issue instead of performing it automatically.

---

## 19. Future Extensibility Notes

- **New trekking regions/activities:** add new `Destination`/`Activity` records — no schema change needed.
- **New travel products (e.g. rafting packages, luxury tours):** representable today via `tripType` enum + `activities` relation. If a genuinely distinct product later needs unique fields, prefer adding optional fields to `Trip` or a new `trip.*` component over creating a parallel content type, to keep querying unified.
- **Multi-language site:** enable `i18n` plugin, mark relevant fields `localized: true` per §13 — no structural redesign required.
- **Wishlist/comparison features, user accounts, online payments, real-time seat locking:** deferred to a later phase; the `Departure` entity's `availableSeats`/`totalSeats` fields are display-only counters in this phase, not a transactional inventory system.
- **Page builder growth:** if editorial needs outgrow the minimal `Page.sections` dynamic zone, extend it with additional narrowly-scoped components rather than a generic block library.

---

_End of AGENTS.md._
