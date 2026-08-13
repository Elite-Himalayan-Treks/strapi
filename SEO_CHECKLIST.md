# SEO_CHECKLIST.md — Pre-launch & Per-content QA

> **Derived from:** `agent.md` §§9–13 (SEO fields, URL architecture, structured data, media/alt text, i18n readiness).
> **Audience:** Editors and QA. Tick items during content entry and before launch.
> **No sample trek copy** — this is a checklist only.

---

## A. Pre-launch (site-wide)

### A1. Global / Site Setting

- [ ] `siteName` and `siteDescription` filled and accurate.
- [ ] `defaultLogo` and `favicon` uploaded via Media Library (not external hotlinked URLs).
- [ ] `defaultSocialImage` set (fallback for pages missing `ogImage` / `twitterImage`).
- [ ] `defaultSeo.metaTitle` / `metaDescription` filled as true fallbacks (not keyword-stuffed templates).
- [ ] Contact fields (`contactEmail`, `phone`, `whatsapp`, address / office location) match real business data.
- [ ] `socialLinks` use correct `platform` enum + valid URLs.
- [ ] `googleBusinessProfileUrl` / `tripAdvisorUrl` valid if used.
- [ ] `defaultCurrency` matches commercial default used on trips.

### A2. URL architecture readiness (frontend + CMS)

Confirm the frontend can build (and that CMS slugs support) paths such as:

- [ ] `/trekking/nepal/`-style destination/region paths (via Destination hierarchy + relations — not hardcoded in schema).
- [ ] `/trekking/{trip-slug}/` (and other `tripType` namespaces such as `/tours/`, `/peak-climbing/` as the frontend maps them).
- [ ] `/destinations/{destination-slug}/`
- [ ] `/activities/{activity-slug}/`
- [ ] `/blog/` and `/blog/{post-slug}/`
- [ ] Static `/about/`, `/contact/` (and similar) via Page slugs.

- [ ] Every public entity slug is unique **within its content type** (UID enforced).
- [ ] Frontend namespaces prevent collisions across types (e.g. same slug string on a Trip and a Page must not share one path).
- [ ] No reliance on CMS-stored full URL path fields (schema does not provide them — by design).

### A3. Structured data capability (frontend generates; CMS supplies facts)

QA should verify the **data exists** so the frontend can emit JSON-LD. Do not require every page to manually fill `shared.seo.structuredData`.

| Schema.org intent | Data present? |
| ----------------- | ------------- |
| Organization / WebSite | [ ] Site Setting complete |
| BreadcrumbList | [ ] Destination parent/child (and trip→destination / activity relations) usable for crumbs |
| TouristTrip / trip-like | [ ] Trip title, description, duration, itinerary days |
| Product/Offer (only when frontend chooses) | [ ] Trip.price + currency; Departure price/availability where offers are shown |
| Review / AggregateRating | [ ] Published Reviews linked to Trip with ratings |
| Article | [ ] BlogPost title, excerpt, content, author, dates, featured image |
| FAQPage | [ ] FAQs on Trip / Destination / Page faq-section with question + answer |
| Person | [ ] Guide and/or Author name, bio, profile image as needed |

- [ ] `shared.seo.structuredData` left empty unless an edge-case override is approved (escape hatch only).

### A4. Media / image SEO

- [ ] All hero, gallery, icon, and profile images live in the Media Library (no raw string URLs for internal assets).
- [ ] Every `trip.gallery-item` has non-empty `altText` (not just filename).
- [ ] Image-section blocks on Pages include required `altText`.
- [ ] Where social previews should differ from hero art, `seo.ogImage` / `seo.twitterImage` are set.

### A5. Indexing controls

- [ ] `noIndex` / `noFollow` used only for intentional exclusions (thank-you, thin, or private-ish pages) — default remains `false`.
- [ ] Canonical URLs set only when needed (duplicates, intentional consolidation); otherwise frontend default canonicals apply.
- [ ] Discontinued / non-active trips excluded from public listings via `status` filters (and Draft & Publish).

### A6. i18n readiness (no translations required yet)

- [ ] No language-specific marketing copy stored only inside non-localizable blobs where a string/richtext field should be used later.
- [ ] Team aware: enabling i18n later means `localized: true` per field — no schema redesign expected (`agent.md` §13).
- [ ] Current launch language content is complete in the default locale only (translations explicitly deferred).

### A7. Technical QA (non-CMS but blocks SEO launch)

- [ ] Public role permissions match `API.md` (published content readable; Inquiry not listable).
- [ ] Meta title/description render in HTML for key templates (home, trip detail, destination, blog post, static page).
- [ ] robots / sitemap strategy agreed for the frontend (not defined in `agent.md` — track as open ops decision).

---

## B. Per content type — SEO entity checklist

Entities that **must** have `shared.seo` + unique `uid` slug (`agent.md` §9):

Trip · Destination · Activity · BlogPost · BlogCategory · Author · Page

Use this block for each entry of those types:

### B-common (every §9 entity)

- [ ] `slug` final, lowercase, hyphenated, stable (changing slugs needs redirect plan on the frontend).
- [ ] `seo.metaTitle` filled editorially (~60 characters recommended) — not auto keyword stuffing.
- [ ] `seo.metaDescription` filled editorially (~160 characters recommended).
- [ ] `ogTitle` / `ogDescription` set if they should differ from meta; else acceptable to leave blank if frontend falls back.
- [ ] `ogImage` (and twitter fields/images if used) set when hero is a poor social crop.
- [ ] `noIndex` / `noFollow` correct for this URL.
- [ ] `canonicalURL` only if deliberately overriding.
- [ ] `structuredData` empty unless override approved.
- [ ] Primary visual has meaningful alt (hero media alt and/or gallery `altText`).

### B1. Trip

- [ ] B-common complete.
- [ ] `title`, `shortDescription`, `description` present and publishable.
- [ ] `tripType`, `difficulty`, `status` set (`status` appropriate for public listing).
- [ ] `heroImage` required image present.
- [ ] Primary `destination` set (canonical for URL building); secondary `destinations` only if trek spans regions.
- [ ] `itinerary` days have `dayNumber`, `title`, `description` (supports trip structured data).
- [ ] `faqs` filled where FAQPage markup is expected on the trip URL.
- [ ] `price` + `priceCurrency` accurate (Offer data if frontend surfaces offers).
- [ ] Departures linked if fixed dates are advertised (availability display-only).
- [ ] Published reviews exist if AggregateRating is claimed on-page.

### B2. Destination

- [ ] B-common complete.
- [ ] Hierarchy (`parentDestination` / children) correct for breadcrumbs.
- [ ] `heroImage` / gallery alt text complete if used.
- [ ] Destination-level `faqs` if FAQ block is shown.
- [ ] Featured flag only if intentionally promoted.

### B3. Activity

- [ ] B-common complete.
- [ ] `icon` / `heroImage` appropriate; icon not used as sole SEO image without alt strategy.
- [ ] Relations to trips/destinations populated for internal linking / breadcrumbs.

### B4. Blog Post

- [ ] B-common complete.
- [ ] `excerpt`, `content`, `featuredImage` present.
- [ ] `author` and `category` set (Article JSON-LD / bylines).
- [ ] Tags used consistently (tags themselves are not required SEO landing pages).
- [ ] Relies on Draft & Publish `publishedAt` (no duplicate custom publish field).

### B5. Blog Category

- [ ] B-common complete.
- [ ] Description/image support category landing intent if the frontend indexes category URLs.

### B6. Author

- [ ] B-common complete.
- [ ] `bio` / `profileImage` adequate for Person markup if author pages are public.

### B7. Page (static)

- [ ] B-common complete.
- [ ] `slug` matches agreed frontend path (`about`, `contact`, etc.).
- [ ] Dynamic zone sections: image blocks have `altText`; FAQ sections have real Q&A pairs if FAQPage is intended.

---

## C. Related types (not in §9 SEO-required list)

### C1. Guide

- [ ] Unique `slug`; profile content publishable.
- [ ] If guide pages are public indexable, confirm whether `seo` is present in the implemented schema and complete B-common. (`agent.md` §5.5 includes `seo` on Guide even though §9’s short list omits Guide — treat Guide SEO as required when guide pages are indexed.)
- [ ] `profileImage` alt strategy handled in frontend/Media Library.

### C2. Tag

- [ ] Slug unique; description optional.
- [ ] Confirm frontend does **not** index tag URLs unless product later adds `seo` (`agent.md` §5.9).

### C3. Review

- [ ] Published only after moderation.
- [ ] `rating` 1–5; `reviewDate` set; `source` / `sourceUrl` rules respected.
- [ ] Linked to the correct Trip.

### C4. Departure

- [ ] Dates, seats, status accurate for display.
- [ ] Not treated as an SEO landing entity.

### C5. Inquiry / Site Setting

- [ ] Inquiry: not public-readable (SEO N/A).
- [ ] Site Setting: covered in §A1.

---

## D. Launch sign-off

- [ ] Spot-check at least one URL per template: home, trip detail, destination detail, activity, blog post, static page.
- [ ] View-source / rich-results test: title, description, canonical, primary JSON-LD types present as designed.
- [ ] Image alts checked on hero + one gallery on a flagship trip.
- [ ] `noIndex` pages confirmed excluded from sitemap (frontend responsibility).
- [ ] Open decisions logged (sitemap tool, preview drafts, schema name reconciliation) do not block correct meta on published URLs.

---

_End of SEO_CHECKLIST.md._
