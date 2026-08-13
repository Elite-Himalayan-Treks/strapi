# IMPLEMENTATION.md — Phased Build Roadmap

> **Source of truth for Phase 1 content model:** `agent.md` (AGENTS.md content-model spec) in this repo.
> **This document:** Planning only. Do not implement code from this file until a phase is explicitly started.
> **Out of scope for all phases below unless a later phase explicitly opens them:** fake/demo content, payment gateways, booking engine business logic, real-time inventory locking, CRM, transactional email, search indexing.

---

## Cross-cutting prerequisites (before Phase 2)

1. Phase 1 content model matches `agent.md` (or a written reconciliation with the current `src/api` tree is approved).
2. Strapi 5 boots cleanly (`develop` / `build` / type generation as applicable).
3. Public vs Authenticated role permissions are understood (see `API.md`).
4. Open decisions listed at the end of this document are resolved or explicitly deferred with owners.

---

## Phase 1 — Backend content model

**Status:** Specified in `agent.md`. Implementation may already be in progress or may diverge from the spec — reconcile before treating Phase 1 as done.

### Goals

- Deliver the Strapi 5 collection types, single types, components, enumerations, and relations defined in `agent.md` §§5–8.
- Enforce attribute-level validation and schema-adjacent lifecycle checks from `agent.md` §14.
- Keep Draft & Publish on editorial types; keep Departure and Inquiry operational (`draftAndPublish: false`).

### Prerequisites

- Strapi `^5.x` confirmed in `package.json`.
- Pre-implementation inspection completed per `agent.md` §3 (existing APIs, components, plugins, migrations).

### Explicit non-goals

- Frontend pages, auth UX, payments, booking flows, seed/demo data.
- Implementing i18n locales (readiness only — `agent.md` §13).
- Expanding the Page dynamic zone into a full page builder.

### Definition of done

- [ ] Schemas/components match `agent.md` (or an approved written diff exists for every intentional deviation).
- [ ] Relations from §8 are wired both ways where specified.
- [ ] Strapi boots without schema errors; verification checklist in `agent.md` §17 passes.
- [ ] No fake production content created.
- [ ] Concise implementation report produced (types created, conflicts, deviations).

**Do not repeat the field tables here** — use `agent.md` as the Phase 1 specification.

---

## Phase 2 — API layer hardening

### Goals

- Define and apply a **population strategy per endpoint** so list views stay shallow and detail views load only what the page needs (`agent.md` principle: avoid deep/circular population).
- Document REST filters, sorts, and pagination conventions (Strapi 5 query syntax).
- Configure Public role permissions for safe anonymous access; lock down operational types (especially Inquiry).
- Decide caching and rate-limiting approach at the edge / reverse proxy / Strapi plugin level (high-level only in this phase).

### Prerequisites

- Phase 1 definition of done met (or temporary API contracts written against the reconciled schema).
- `API.md` reviewed and used as the contract checklist.

### Population strategy (recommended)

| Endpoint use case | Depth | Populate (conceptual) | Avoid |
| ----------------- | ----- | --------------------- | ----- |
| Trip **list** (cards, filters) | Shallow | `heroImage`, `destination` (name, slug), `activities` (name, slug), `seo` (meta only if needed for cards — usually omit), flags (`featured`, `popular`) | Full `itinerary`, `gallery`, nested `reviews`, `relatedTrips` |
| Trip **detail** | Medium | Components: itinerary, highlights, inclusions/exclusions, permits, faqs, gallery, importantInformation; relations: destination, destinations, activities, guides (profile fields + image), departures (open/limited/guaranteed), reviews (published), relatedTrips (card fields only), seo | Deep population of related trip’s full itinerary; circular relatedTrips chains |
| Destination **listing** | Shallow | `heroImage`, `name`, `slug`, `shortDescription`, `featured`, parent slug if needed | Full trip trees, nested child destination trees unbounded |
| Destination **detail** | Medium | hero/gallery/seo/faqs; `trips` as **card fields only**; `childDestinations` one level; `activities` shallow; `relatedDestinations` card fields | Recursive parent/child walks beyond one level |
| Activity listing / detail | Shallow → medium | Listing: icon/hero/slug/name; Detail: + description, seo, related trips/destinations as cards | Full trip payloads |
| Blog listing | Shallow | featuredImage, excerpt, slug, category, author (name/slug/image), publishedAt | Full richtext `content`, galleries |
| Blog post detail | Medium | content, gallery, seo, author, category, tags, relatedTrips/Destinations/Posts as cards | Nested related post bodies |
| Guide listing / detail | Shallow → medium | Listing: profileImage, name, position; Detail: + bio, specialties, socialLinks, trips as cards, seo | Full trip detail under each guide |
| Review (by trip or featured) | Shallow | name, country, rating, title, comment, reviewDate, source, authorImage, trip (slug/title only) | Internal moderation notes (none in schema beyond Draft & Publish) |
| Page detail | Medium | heroImage, content, sections (dynamic zone), seo | Unbounded nested media beyond section needs |
| Site Setting (single) | Full shallow | logo, favicon, defaultSocialImage, defaultSeo, contact fields, address/officeLocation, socialLinks | N/A (single document) |
| Departure (filtered by trip) | Shallow | dates, seats, price, status, bookingDeadline — no nested trip re-populate if already on trip detail | Staff-only notes if ever added |
| Inquiry | **Create only** for Public | No populate for Public | Public find/findOne/update/delete |

### REST query examples (Strapi 5)

Populate and filters use Strapi 5 query-string / QS-style nested objects. Exact client encoding may use `qs` or the framework’s fetch helper.

**Trip list — card populate + filters + pagination**

```http
GET /api/trips
  ?filters[status][$eq]=active
  &filters[featured][$eq]=true
  &sort[0]=publishedAt:desc
  &pagination[page]=1
  &pagination[pageSize]=12
  &populate[heroImage]=true
  &populate[destination][fields][0]=name
  &populate[destination][fields][1]=slug
  &populate[activities][fields][0]=name
  &populate[activities][fields][1]=slug
```

**Trip detail by slug**

```http
GET /api/trips
  ?filters[slug][$eq]=<trip-slug>
  &publicationState=live
  &populate[heroImage]=true
  &populate[gallery][populate]=image
  &populate[itinerary][populate]=image
  &populate[highlights][populate]=icon
  &populate[inclusions]=true
  &populate[exclusions]=true
  &populate[permits]=true
  &populate[faqs]=true
  &populate[importantInformation]=true
  &populate[seo][populate][0]=ogImage
  &populate[seo][populate][1]=twitterImage
  &populate[destination][fields][0]=name
  &populate[destination][fields][1]=slug
  &populate[activities][fields][0]=name
  &populate[activities][fields][1]=slug
  &populate[guides][populate][0]=profileImage
  &populate[departures]=true
  &populate[reviews][populate][0]=authorImage
  &populate[relatedTrips][populate][0]=heroImage
  &populate[relatedTrips][fields][0]=title
  &populate[relatedTrips][fields][1]=slug
  &populate[relatedTrips][fields][2]=shortDescription
  &populate[relatedTrips][fields][3]=price
  &populate[relatedTrips][fields][4]=priceCurrency
  &populate[relatedTrips][fields][5]=durationDays
  &populate[relatedTrips][fields][6]=difficulty
```

Prefer returning a single entry (or use a custom route later). Until then, take `data[0]` after slug filter.

**Destination listing**

```http
GET /api/destinations
  ?filters[featured][$eq]=true
  &sort[0]=name:asc
  &pagination[page]=1
  &pagination[pageSize]=24
  &populate[heroImage]=true
```

**Departures for a trip**

```http
GET /api/departures
  ?filters[trip][documentId][$eq]=<trip-document-id>
  &filters[status][$in][0]=open
  &filters[status][$in][1]=limited
  &filters[status][$in][2]=guaranteed
  &sort[0]=departureDate:asc
  &pagination[pageSize]=50
```

**Blog listing**

```http
GET /api/blog-posts
  ?sort[0]=publishedAt:desc
  &pagination[page]=1
  &pagination[pageSize]=10
  &populate[featuredImage]=true
  &populate[category][fields][0]=name
  &populate[category][fields][1]=slug
  &populate[author][fields][0]=name
  &populate[author][fields][1]=slug
  &populate[author][populate][0]=profileImage
```

**Inquiry create (Public)**

```http
POST /api/inquiries
Content-Type: application/json

{
  "data": {
    "name": "<string>",
    "email": "<email>",
    "message": "<string>",
    "trip": "<trip-document-id>",
    "sourcePage": "<path-or-url>",
    "numberOfPeople": "<number>",
    "travelDate": "<date>",
    "phone": "<string>",
    "country": "<string>"
  }
}
```

Do **not** accept or expose `status` / `notes` from Public clients — set `status` default server-side (`new`); keep `notes` admin-only (see `API.md`).

### Pagination strategy

- Default `pageSize` for public list endpoints: **12** (trips/destinations/activities) or **10** (blog). Cap `pageSize` (e.g. max **50**) at proxy or custom middleware if abuse is a concern.
- Use `pagination[page]` + `pagination[pageSize]`; prefer `page` over `start`/`limit` for UI pages.
- Return and honor Strapi meta (`pagination.page`, `pageSize`, `pageCount`, `total`) in the frontend.
- For infinite scroll, still use page-based pagination against the same caps.

### Rate limiting / caching considerations

| Concern | Recommendation (decide in Phase 2; do not implement blindly) |
| ------- | ------------------------------------------------------------ |
| Public GET caching | Cache trip/destination/blog/site-setting GETs at CDN/edge with short TTL; purge on publish webhook if available |
| Inquiry POST | No cache; rate-limit by IP at reverse proxy / WAF |
| Departure availability | Short TTL or no-store — seats are display-only but should not look stale for hours |
| Auth’d admin API | Never cache at CDN |
| Strapi Users & Permissions | Default plugin is present; rate limits are **not** specified in `agent.md` — treat as open infrastructure decision |

### Explicit non-goals

- Custom GraphQL schema redesign (REST is the documented contract in `API.md`; GraphQL may exist but is not required by `agent.md`).
- Booking/payment endpoints.
- Real-time WebSocket seat locking.
- Implementing auth for end users of the public site.

### Definition of done

- [ ] Population matrices above (or revised equivalents) documented and used consistently by any consuming client.
- [ ] Public role permissions match `API.md` (Inquiry create-only; no public read of internal Inquiry fields; Draft & Publish respected).
- [ ] Pagination defaults/caps agreed and documented.
- [ ] Caching/rate-limit approach chosen and noted (even if “defer to hosting defaults”).
- [ ] Spot-check: list vs detail payloads stay within agreed populate depth (no accidental deep graphs).

---

## Phase 3 — Frontend consumption

### Goals

- Map each public page type to the Strapi endpoints and populate shapes it needs.
- Implement SEO-friendly routes per `agent.md` §10 using CMS slugs and relations (routing is frontend responsibility).
- Generate JSON-LD on the frontend from entity fields (`agent.md` §§9, 11) — use `shared.seo.structuredData` only as an escape hatch.

### Prerequisites

- Phase 2 API contracts stable enough for page data requirements.
- Frontend repo/location and stack known (see below).

### Detected frontend (repo fact — not assumed by `agent.md`)

`agent.md` states the frontend is built separately and is out of its scope. In the monorepo there **is** a frontend at `frontend/web`:

- **Framework:** Next.js (`next` 16.x) + React 19
- **UI:** Chakra UI, Tailwind-related tooling, Base UI / shadcn-related packages

Phase 3 work should target that app unless a new open decision chooses otherwise. Do not invent a second frontend stack.

### Page → data requirements

| Page type | Primary endpoints | Needs (fields / relations) |
| --------- | ----------------- | -------------------------- |
| Home | `GET /api/trips` (featured/popular/recommended), `GET /api/destinations` (featured), `GET /api/blog-posts` (featured/latest), `GET /api/site-setting`, optional reviews | Card-level trip/destination/blog fields; site name/logo/contact/social; no full itineraries |
| Trip detail `/trekking/{slug}/` (and analogous type URLs) | `GET /api/trips?filters[slug][$eq]=…` (+ populate per Phase 2 detail), optional separate `GET /api/departures` | Full commercial/editorial trip payload, SEO, FAQs, departures for Offer/availability UI, reviews for AggregateRating |
| Destination listing `/destinations/` | `GET /api/destinations` | Cards: name, slug, shortDescription, heroImage, featured |
| Destination detail `/destinations/{slug}/` | `GET /api/destinations?filters[slug]…` | Description, gallery, FAQs, SEO, child destinations, related activities, trips as cards, hierarchy for breadcrumbs |
| Activity listing / detail | `GET /api/activities` | Listing cards; detail + related trips/destinations cards + SEO |
| Blog index `/blog/` | `GET /api/blog-posts`, optional categories | Listing fields + pagination |
| Blog post `/blog/{slug}/` | `GET /api/blog-posts?filters[slug]…` | Full content, author, category, tags, related entities, SEO/Article JSON-LD |
| Static pages `/about/`, `/contact/`, etc. | `GET /api/pages?filters[slug]…` | title, content, sections, heroImage, seo |
| Global chrome (nav/footer) | `GET /api/site-setting` | siteName, logo, contact, socialLinks, defaultSeo fallbacks |

URL namespaces (`/trekking/`, `/tours/`, `/peak-climbing/`, etc.) are derived from `tripType` and relations — not stored as CMS route fields (`agent.md` §10).

### Explicit non-goals

- Auth-gated member areas, booking checkout UI, payment widgets.
- Implementing i18n UI (locale switcher) until a later phase enables Strapi i18n.
- Growing the CMS page builder beyond the minimal dynamic zone.

### Definition of done

- [ ] Each page type above fetches only its documented fields/endpoints.
- [ ] Slug-based routing works for Trip, Destination, Activity, BlogPost, Page without collisions across namespaces.
- [ ] Meta tags + JSON-LD generated from CMS data; images use Media Library URLs with alt text from gallery/`altText` fields.
- [ ] Inquiry form posts to `POST /api/inquiries` successfully under Public permissions.
- [ ] No hardcoded permit prices or contact info in frontend — read from CMS (`agent.md` §2.10).

---

## Phase 4 — Authentication

### Goals

- Keep the **public marketing site anonymous** (Public role for content GETs + Inquiry create).
- Document where authentication would plug in for a **future** staff dashboard / booking portal — without implementing it in this phase.

### Prerequisites

- Phase 2 permissions model understood.
- `@strapi/plugin-users-permissions` is already a dependency in this Strapi app (confirm version aligns with Strapi 5.x).

### Where auth would plug in later (notes only)

| Surface | Auth approach (future) | Touches |
| ------- | ---------------------- | ------- |
| Strapi Admin | Built-in admin users (already) | Content editing, Inquiry triage (`status`, `notes`) |
| Future customer accounts / wishlist | Users & Permissions or external IdP | New collection types not in `agent.md`; not Phase 4 implementation |
| Future booking dashboard | Authenticated API tokens or user JWT | Departure seat mutations, booking records (new types), payment webhooks |
| Server-to-server (frontend SSR → Strapi) | Optional API token for preview of drafts | Draft preview — open decision; live site should use `publicationState=live` / published content only |

### Explicit non-goals

- Implementing login/signup UI, JWT flows, OAuth, or role redesign beyond Public permission matrix in `API.md`.
- Customer accounts, wishlists, or member-only pricing.

### Definition of done

- [ ] Written decision: public site remains anonymous.
- [ ] Documented integration points above accepted as the future auth boundary.
- [ ] No auth code shipped for the public site in this phase.

---

## Phase 5 — Booking / payment integration points (future / out of scope)

> Explicitly **future**. Do not implement booking or payment logic here. This phase only records connection points so later work does not fight the content model.

### Goals

- Identify where `Departure` and `Inquiry` (and future Booking entities) connect to payments and seat changes.

### Connection points (notes)

| Data | Role today (`agent.md`) | Future connection |
| ---- | ----------------------- | ----------------- |
| `Departure.availableSeats` / `totalSeats` / `status` | Display-only availability | Updated by booking service after confirmed payment / staff confirmation — not by anonymous clients |
| `Departure.price` / `priceCurrency` | Per-date override of trip price | Passed to payment intent / quote engine |
| `Inquiry` | Lead capture only | CRM handoff or conversion into a Booking record; `status` workflow (`new` → `converted`, etc.) |
| `Trip.price` | Base commercial price | Fallback when departure has no override |
| New types (not in schema yet) | — | e.g. `Booking`, `Payment`, `Customer` — require a new design phase |

### Explicit non-goals

- Payment gateways, PCI flows, real-time seat locking, inventory transactions, automated emails, CRM sync.

### Definition of done (for this planning phase only)

- [ ] Stakeholders agree Departure counters remain display-only until a booking phase starts.
- [ ] No payment or booking code is introduced under the guise of “just wiring Inquiry.”

---

## Open decisions (resolve before or at the start of Phase 2)

1. **Schema reconciliation:** Current `src/api` includes names that differ from `agent.md` (e.g. `fixed-departure` vs `departure`, `team-member` vs `guide`, `blog` vs `blog-post`, `blog-catagory` typo, `static-page` vs `page`, plus extras like `region`, `homepage`, `header`, `footer`, `newsletter`, `partner`, `video-review`, `office`, `faq`, `about`, `global`). Approve a non-destructive reconciliation plan before hardening API contracts.
2. **API ID freeze:** Final plural REST paths (`/api/trips`, `/api/blog-posts`, etc.) after reconciliation.
3. **GraphQL:** Use REST only, or also expose/document GraphQL?
4. **Draft preview:** How (if at all) the Next.js app previews unpublished content.
5. **Rate limiting / CDN caching:** Owner and tooling (hosting edge vs Strapi middleware).
6. **Inquiry field hardening:** Strip or ignore Public writes to `status` / `notes` (custom controller vs permissions-only).
7. **Frontend ownership:** Confirm Phase 3 targets `frontend/web` (Next.js) exclusively.
8. **bestSeason / languages storage:** Confirm `json` + validation approach vs repeatable season component (`agent.md` §5.1 note).
9. **Guide certifications:** Component vs plain text (`agent.md` §5.5).
10. **Site Setting dual address:** Keep both `address` and `officeLocation` or collapse to one (`agent.md` §5.13).

---

_End of IMPLEMENTATION.md._
