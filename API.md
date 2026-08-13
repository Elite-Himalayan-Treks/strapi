# API.md — Strapi 5 REST Endpoint Contract

> **Grounded in:** `agent.md` content types (§§5–8).
> **Scope:** Documentation of auto-generated REST routes and recommended public populate shapes. No custom controllers are required by Phase 1 (`agent.md` §15).
> **Base path:** `/api`
> **Auth for public site:** Anonymous via **Public** role (Users & Permissions). Admin uses Strapi Admin / Full access.
> **Response envelope (Strapi 5):** `{ data, meta }` for collections; `{ data, meta }` for single documents. Media and relations appear under attributes / populated objects per Strapi 5 document API shape. Below, shapes are **structural** with placeholders (`<string>`, `<number>`, …), not sample marketing content.

### Conventions used in this file

| Placeholder | Meaning |
| ----------- | ------- |
| `<documentId>` | Strapi 5 document id string |
| `<string>` / `<text>` / `<richtext>` | Scalar / long text / richtext HTML or blocks per project config |
| `<number>` / `<integer>` / `<decimal>` | Numeric |
| `<boolean>` | Boolean |
| `<date>` | ISO date |
| `<email>` | Email string |
| `<enum:…>` | One of the closed values from `agent.md` §7 |
| `<media>` | Media object (url, alternativeText, formats, …) or `null` |
| `<seo>` | `shared.seo` component shape (see Shared shapes) |
| `null` | Allowed empty relation/media |

**Draft & Publish:** Editorial collection types only return published entries to Public unless preview auth is added later. Operational types (`departure`, `inquiry`) and `site-setting` have `draftAndPublish: false` per `agent.md`.

---

## Shared shapes

### `shared.seo` (`<seo>`)

```json
{
  "metaTitle": "<string|null>",
  "metaDescription": "<text|null>",
  "keywords": "<string|null>",
  "canonicalURL": "<string|null>",
  "noIndex": "<boolean>",
  "noFollow": "<boolean>",
  "ogTitle": "<string|null>",
  "ogDescription": "<text|null>",
  "ogImage": "<media|null>",
  "twitterTitle": "<string|null>",
  "twitterDescription": "<text|null>",
  "twitterImage": "<media|null>",
  "structuredData": "<json|null>"
}
```

### `shared.social-link`

```json
{
  "platform": "<enum:facebook|instagram|youtube|linkedin|whatsapp|tiktok|tripadvisor|x|other>",
  "url": "<string>",
  "label": "<string|null>"
}
```

### `trip.gallery-item`

```json
{
  "image": "<media>",
  "caption": "<string|null>",
  "altText": "<string>",
  "title": "<string|null>",
  "credit": "<string|null>"
}
```

### `trip.itinerary-day`

```json
{
  "dayNumber": "<integer>",
  "title": "<string>",
  "description": "<richtext>",
  "startLocation": "<string|null>",
  "endLocation": "<string|null>",
  "distance": "<string|null>",
  "walkingHours": "<string|null>",
  "altitude": "<integer|null>",
  "elevationGain": "<integer|null>",
  "elevationLoss": "<integer|null>",
  "accommodation": "<string|null>",
  "meals": "<string|null>",
  "transportation": "<string|null>",
  "highlights": "<text|null>",
  "image": "<media|null>"
}
```

### `trip.faq`

```json
{
  "question": "<string>",
  "answer": "<richtext>",
  "order": "<integer>"
}
```

### Public vs admin field policy (global)

| Class | Public | Admin |
| ----- | ------ | ----- |
| Editorial published fields, media, SEO, relations meant for the site | Expose | Expose |
| `Inquiry.notes`, `Inquiry.status` (workflow) | **Do not expose** on read; **do not accept** from Public on create if possible | Full access |
| Unpublished drafts | Hide (Draft & Publish) | Full access |
| Future booking/payment records | N/A (not in schema) | N/A |

---

## Collection types — auto-generated routes

For each collection type Strapi generates:

| Method | Path | Typical Public use |
| ------ | ---- | ------------------ |
| `GET` | `/api/{pluralName}` | List / filter |
| `GET` | `/api/{pluralName}/:documentId` | Detail by id |
| `POST` | `/api/{pluralName}` | Create (usually **admin only**, except Inquiry) |
| `PUT` | `/api/{pluralName}/:documentId` | Update — **admin only** |
| `DELETE` | `/api/{pluralName}/:documentId` | Delete — **admin only** |

Slug-based pages should prefer `GET /api/{plural}?filters[slug][$eq]=…` until a custom slug route exists.

---

## 1. Trip — `api::trip.trip`

**Plural path:** `/api/trips`  
**draftAndPublish:** `true`

### Recommended Public permissions

`find`, `findOne` — yes. `create` / `update` / `delete` — no.

### List example

```http
GET /api/trips?filters[status][$eq]=active&pagination[page]=1&pagination[pageSize]=12&populate[heroImage]=true&populate[destination][fields][0]=name&populate[destination][fields][1]=slug&populate[activities][fields][0]=name&populate[activities][fields][1]=slug
```

### Detail example (by slug)

```http
GET /api/trips?filters[slug][$eq]=<trip-slug>&populate[heroImage]=true&populate[gallery][populate]=image&populate[itinerary][populate]=image&populate[highlights][populate]=icon&populate[inclusions]=true&populate[exclusions]=true&populate[permits]=true&populate[faqs]=true&populate[importantInformation]=true&populate[seo][populate][0]=ogImage&populate[seo][populate][1]=twitterImage&populate[destination][fields][0]=name&populate[destination][fields][1]=slug&populate[destinations][fields][0]=name&populate[destinations][fields][1]=slug&populate[activities][fields][0]=name&populate[activities][fields][1]=slug&populate[guides][populate][0]=profileImage&populate[departures]=true&populate[reviews][populate][0]=authorImage&populate[relatedTrips][fields][0]=title&populate[relatedTrips][fields][1]=slug&populate[relatedTrips][fields][2]=shortDescription&populate[relatedTrips][fields][3]=price&populate[relatedTrips][fields][4]=priceCurrency&populate[relatedTrips][populate][0]=heroImage
```

### Response shape (detail attributes — structure)

```json
{
  "data": [
    {
      "documentId": "<documentId>",
      "title": "<string>",
      "slug": "<string>",
      "shortDescription": "<text>",
      "description": "<richtext>",
      "tripCode": "<string|null>",
      "tripType": "<enum:trekking|tour|peak-climbing|expedition|hiking|adventure|cultural|wildlife|pilgrimage|custom>",
      "durationDays": "<integer>",
      "durationNights": "<integer>",
      "price": "<decimal>",
      "priceCurrency": "<enum:USD|NPR|EUR|GBP|AUD>",
      "priceLabel": "<string|null>",
      "maxAltitude": "<integer|null>",
      "distance": "<string|null>",
      "difficulty": "<enum:easy|moderate|strenuous|challenging|extreme>",
      "groupSizeMin": "<integer|null>",
      "groupSizeMax": "<integer|null>",
      "bestSeason": "<json:array of season strings>",
      "accommodationType": "<enum:teahouse|camping|hotel|homestay|mixed|null>",
      "transportSummary": "<text|null>",
      "featured": "<boolean>",
      "popular": "<boolean>",
      "recommended": "<boolean>",
      "status": "<enum:active|draft|seasonal|discontinued>",
      "heroImage": "<media>",
      "gallery": ["<trip.gallery-item>"],
      "itinerary": ["<trip.itinerary-day>"],
      "highlights": [{ "title": "<string>", "description": "<text|null>", "icon": "<media|null>" }],
      "inclusions": [{ "title": "<string>", "description": "<text|null>", "category": "<enum:…>" }],
      "exclusions": [{ "title": "<string>", "description": "<text|null>", "category": "<enum:…>" }],
      "importantInformation": [{ "title": "<string>", "content": "<richtext>", "type": "<enum:…>" }],
      "permits": [{
        "name": "<string>",
        "description": "<text|null>",
        "required": "<boolean>",
        "issuingAuthority": "<string|null>",
        "estimatedCost": "<decimal|null>",
        "currency": "<enum:USD|NPR|EUR|GBP|AUD|null>",
        "notes": "<text|null>",
        "officialUrl": "<string|null>"
      }],
      "faqs": ["<trip.faq>"],
      "destination": { "documentId": "<documentId>", "name": "<string>", "slug": "<string>" },
      "destinations": [{ "documentId": "<documentId>", "name": "<string>", "slug": "<string>" }],
      "activities": [{ "documentId": "<documentId>", "name": "<string>", "slug": "<string>" }],
      "departures": ["<departure card fields>"],
      "guides": ["<guide card fields>"],
      "reviews": ["<review public fields>"],
      "relatedTrips": ["<trip card fields>"],
      "seo": "<seo>",
      "createdAt": "<datetime>",
      "updatedAt": "<datetime>",
      "publishedAt": "<datetime|null>"
    }
  ],
  "meta": { "pagination": { "page": "<integer>", "pageSize": "<integer>", "pageCount": "<integer>", "total": "<integer>" } }
}
```

### Field exposure notes

| Safe public | Prefer admin / care |
| ----------- | ------------------- |
| All commercial/editorial trip fields intended for the site, including permit estimated costs (editorial) | Product lifecycle `status=draft` should not appear on Public if you also use CMS Draft & Publish — filter `status=active` (and similar) in queries; `discontinued` typically hidden from listings |

---

## 2. Destination — `api::destination.destination`

**Path:** `/api/destinations`  
**draftAndPublish:** `true`  
**Public:** `find`, `findOne` only.

### Example

```http
GET /api/destinations?filters[slug][$eq]=<destination-slug>&populate[heroImage]=true&populate[gallery][populate]=image&populate[faqs]=true&populate[seo][populate][0]=ogImage&populate[parentDestination][fields][0]=name&populate[parentDestination][fields][1]=slug&populate[childDestinations][fields][0]=name&populate[childDestinations][fields][1]=slug&populate[childDestinations][populate][0]=heroImage&populate[trips][fields][0]=title&populate[trips][fields][1]=slug&populate[trips][fields][2]=shortDescription&populate[trips][fields][3]=price&populate[trips][populate][0]=heroImage&populate[activities][fields][0]=name&populate[activities][fields][1]=slug&populate[relatedDestinations][fields][0]=name&populate[relatedDestinations][fields][1]=slug
```

### Response shape (attributes)

```json
{
  "name": "<string>",
  "slug": "<string>",
  "shortDescription": "<text|null>",
  "description": "<richtext|null>",
  "regionCode": "<string|null>",
  "country": "<string>",
  "province": "<string|null>",
  "district": "<string|null>",
  "latitude": "<decimal|null>",
  "longitude": "<decimal|null>",
  "elevation": "<integer|null>",
  "bestSeason": "<json|null>",
  "heroImage": "<media|null>",
  "gallery": ["<trip.gallery-item>"],
  "featured": "<boolean>",
  "parentDestination": { "name": "<string>", "slug": "<string>" },
  "childDestinations": [{ "name": "<string>", "slug": "<string>", "heroImage": "<media|null>" }],
  "trips": ["<trip card fields>"],
  "activities": [{ "name": "<string>", "slug": "<string>" }],
  "faqs": ["<trip.faq>"],
  "relatedDestinations": [{ "name": "<string>", "slug": "<string>" }],
  "seo": "<seo>"
}
```

**Public:** all of the above are safe. Avoid unbounded recursive population of `parentDestination` / `childDestinations`.

---

## 3. Activity — `api::activity.activity`

**Path:** `/api/activities`  
**draftAndPublish:** `true`  
**Public:** `find`, `findOne` only.

### Example

```http
GET /api/activities?filters[slug][$eq]=<activity-slug>&populate[icon]=true&populate[heroImage]=true&populate[seo][populate][0]=ogImage&populate[trips][fields][0]=title&populate[trips][fields][1]=slug&populate[trips][populate][0]=heroImage&populate[destinations][fields][0]=name&populate[destinations][fields][1]=slug
```

### Response shape

```json
{
  "name": "<string>",
  "slug": "<string>",
  "shortDescription": "<text|null>",
  "description": "<richtext|null>",
  "icon": "<media|null>",
  "heroImage": "<media|null>",
  "featured": "<boolean>",
  "trips": ["<trip card fields>"],
  "destinations": [{ "name": "<string>", "slug": "<string>" }],
  "seo": "<seo>"
}
```

**Public:** safe. **Admin-only mutations.**

---

## 4. Departure — `api::departure.departure`

**Path:** `/api/departures`  
**draftAndPublish:** `false` (operational)  
**Public:** `find`, `findOne` recommended for availability display. No create/update/delete for Public.

### Example

```http
GET /api/departures?filters[trip][documentId][$eq]=<trip-document-id>&filters[status][$in][0]=open&filters[status][$in][1]=limited&filters[status][$in][2]=guaranteed&sort[0]=departureDate:asc&pagination[pageSize]=50
```

### Response shape

```json
{
  "documentId": "<documentId>",
  "departureDate": "<date>",
  "returnDate": "<date>",
  "price": "<decimal>",
  "priceCurrency": "<enum:USD|NPR|EUR|GBP|AUD>",
  "totalSeats": "<integer>",
  "availableSeats": "<integer>",
  "minimumParticipants": "<integer|null>",
  "confirmedParticipants": "<integer>",
  "status": "<enum:open|limited|guaranteed|full|cancelled|completed>",
  "bookingDeadline": "<date|null>",
  "notes": "<text|null>",
  "trip": { "documentId": "<documentId>", "slug": "<string>", "title": "<string>" }
}
```

### Exposure notes

| Field | Public | Admin |
| ----- | ------ | ----- |
| Dates, price, currency, seats, status, bookingDeadline | Yes (display-only availability per `agent.md`) | Yes |
| `notes` | Prefer **hide** from Public (operational commentary) — if permissions cannot field-level strip, avoid populating or clear via custom controller in Phase 2 | Yes |
| Seat mutations | Never Public | Future booking phase only |

---

## 5. Guide — `api::guide.guide`

**Path:** `/api/guides`  
**draftAndPublish:** `true`  
**Public:** `find`, `findOne` only.

### Example

```http
GET /api/guides?filters[slug][$eq]=<guide-slug>&populate[profileImage]=true&populate[specialties][fields][0]=name&populate[specialties][fields][1]=slug&populate[homeRegion][fields][0]=name&populate[homeRegion][fields][1]=slug&populate[socialLinks]=true&populate[seo][populate][0]=ogImage&populate[trips][fields][0]=title&populate[trips][fields][1]=slug&populate[trips][populate][0]=heroImage
```

### Response shape

```json
{
  "name": "<string>",
  "slug": "<string>",
  "position": "<string|null>",
  "shortBio": "<text|null>",
  "biography": "<richtext|null>",
  "yearsExperience": "<integer|null>",
  "languages": "<json|null>",
  "specialties": [{ "name": "<string>", "slug": "<string>" }],
  "certifications": "<component[]|text|null>",
  "homeRegion": { "name": "<string>", "slug": "<string>" },
  "profileImage": "<media|null>",
  "featured": "<boolean>",
  "trips": ["<trip card fields>"],
  "socialLinks": ["<shared.social-link>"],
  "seo": "<seo>"
}
```

**Public:** safe profile/editorial fields. **Admin-only mutations.**

---

## 6. Review — `api::review.review`

**Path:** `/api/reviews`  
**draftAndPublish:** `true` (moderation)  
**Public:** `find`, `findOne` only (published). No public create unless a future moderated submission flow is designed (not in `agent.md`).

### Example

```http
GET /api/reviews?filters[trip][documentId][$eq]=<trip-document-id>&filters[featured][$eq]=true&sort[0]=reviewDate:desc&populate[authorImage]=true&populate[trip][fields][0]=title&populate[trip][fields][1]=slug
```

### Response shape

```json
{
  "name": "<string>",
  "country": "<string|null>",
  "rating": "<integer 1-5>",
  "title": "<string|null>",
  "comment": "<text>",
  "reviewDate": "<date>",
  "source": "<enum:website|google|tripadvisor|other>",
  "sourceUrl": "<string|null>",
  "verified": "<boolean>",
  "featured": "<boolean>",
  "trip": { "title": "<string>", "slug": "<string>" },
  "authorImage": "<media|null>",
  "publishedAt": "<datetime|null>"
}
```

**Public:** all listed fields are intended for display. Unpublished reviews must not appear for Public.

---

## 7. Blog Post — `api::blog-post.blog-post`

**Path:** `/api/blog-posts`  
**draftAndPublish:** `true`  
**Public:** `find`, `findOne` only.

### List example

```http
GET /api/blog-posts?sort[0]=publishedAt:desc&pagination[page]=1&pagination[pageSize]=10&populate[featuredImage]=true&populate[category][fields][0]=name&populate[category][fields][1]=slug&populate[author][fields][0]=name&populate[author][fields][1]=slug&populate[author][populate][0]=profileImage
```

### Detail example

```http
GET /api/blog-posts?filters[slug][$eq]=<post-slug>&populate[featuredImage]=true&populate[gallery][populate]=image&populate[author][populate][0]=profileImage&populate[author][populate][1]=socialLinks&populate[category]=true&populate[tags]=true&populate[relatedTrips][fields][0]=title&populate[relatedTrips][fields][1]=slug&populate[relatedTrips][populate][0]=heroImage&populate[relatedDestinations][fields][0]=name&populate[relatedDestinations][fields][1]=slug&populate[relatedPosts][fields][0]=title&populate[relatedPosts][fields][1]=slug&populate[relatedPosts][populate][0]=featuredImage&populate[seo][populate][0]=ogImage&populate[seo][populate][1]=twitterImage
```

### Response shape (detail)

```json
{
  "title": "<string>",
  "slug": "<string>",
  "excerpt": "<text>",
  "content": "<richtext>",
  "featuredImage": "<media>",
  "gallery": ["<trip.gallery-item>"],
  "author": { "name": "<string>", "slug": "<string>", "profileImage": "<media|null>" },
  "category": { "name": "<string>", "slug": "<string>" },
  "tags": [{ "name": "<string>", "slug": "<string>" }],
  "readingTime": "<integer|null>",
  "featured": "<boolean>",
  "relatedTrips": ["<trip card fields>"],
  "relatedDestinations": [{ "name": "<string>", "slug": "<string>" }],
  "relatedPosts": ["<blog card fields>"],
  "seo": "<seo>",
  "publishedAt": "<datetime|null>"
}
```

**Public:** safe. Use built-in `publishedAt` (no duplicate custom field per `agent.md`).

---

## 8. Blog Category — `api::blog-category.blog-category`

**Path:** `/api/blog-categories`  
**draftAndPublish:** `true`  
**Public:** `find`, `findOne` only.

### Example

```http
GET /api/blog-categories?populate[image]=true&populate[seo][populate][0]=ogImage&populate[posts][fields][0]=title&populate[posts][fields][1]=slug&populate[posts][populate][0]=featuredImage
```

Prefer listing posts via `/api/blog-posts?filters[category][slug][$eq]=…` to control pagination, rather than embedding unbounded `posts` on the category.

### Response shape

```json
{
  "name": "<string>",
  "slug": "<string>",
  "description": "<text|null>",
  "image": "<media|null>",
  "posts": ["<blog card fields>"],
  "seo": "<seo>"
}
```

---

## 9. Tag — `api::tag.tag`

**Path:** `/api/tags`  
**draftAndPublish:** `true` (unless changed later)  
**Public:** `find`, `findOne` only.  
**Note (`agent.md` §5.9):** No SEO component by default — tags are not primary indexable landing pages unless that decision changes.

### Example

```http
GET /api/tags?filters[slug][$eq]=<tag-slug>
```

### Response shape

```json
{
  "name": "<string>",
  "slug": "<string>",
  "description": "<text|null>",
  "posts": ["<blog card fields>"]
}
```

---

## 10. Author — `api::author.author`

**Path:** `/api/authors`  
**draftAndPublish:** `true`  
**Public:** `find`, `findOne` only.

### Example

```http
GET /api/authors?filters[slug][$eq]=<author-slug>&populate[profileImage]=true&populate[socialLinks]=true&populate[seo][populate][0]=ogImage&populate[posts][fields][0]=title&populate[posts][fields][1]=slug&populate[posts][populate][0]=featuredImage
```

### Response shape

```json
{
  "name": "<string>",
  "slug": "<string>",
  "bio": "<richtext|null>",
  "profileImage": "<media|null>",
  "jobTitle": "<string|null>",
  "socialLinks": ["<shared.social-link>"],
  "posts": ["<blog card fields>"],
  "seo": "<seo>"
}
```

---

## 11. Inquiry — `api::inquiry.inquiry`

**Path:** `/api/inquiries`  
**draftAndPublish:** `false`  
**Critical permissions (Settings → Users & Permissions → Roles → Public):**

| Action | Public | Authenticated (if used) | Admin |
| ------ | ------ | ----------------------- | ----- |
| `create` | **Yes** | Optional | Yes |
| `find` | **No** | **No** (unless staff API role) | Yes |
| `findOne` | **No** | **No** | Yes |
| `update` | **No** | **No** | Yes |
| `delete` | **No** | **No** | Yes |

### Create example

```http
POST /api/inquiries
Content-Type: application/json

{
  "data": {
    "name": "<string>",
    "email": "<email>",
    "phone": "<string|null>",
    "country": "<string|null>",
    "travelDate": "<date|null>",
    "numberOfPeople": "<integer|null>",
    "trip": "<trip-document-id|null>",
    "message": "<text>",
    "sourcePage": "<string|null>"
  }
}
```

### Response shape (create — returned body may include fields Public should not re-read later)

```json
{
  "data": {
    "documentId": "<documentId>",
    "name": "<string>",
    "email": "<email>",
    "phone": "<string|null>",
    "country": "<string|null>",
    "travelDate": "<date|null>",
    "numberOfPeople": "<integer|null>",
    "trip": "<relation|null>",
    "message": "<text>",
    "sourcePage": "<string|null>",
    "status": "<enum:new|contacted|qualified|converted|closed|spam>",
    "notes": "<text|null>"
  }
}
```

### Exposure / hardening notes

| Field | Public create | Public read | Admin |
| ----- | ------------- | ----------- | ----- |
| name, email, phone, country, travelDate, numberOfPeople, trip, message, sourcePage | Allow | Deny list endpoints | Full |
| `status` | Default `new` server-side; reject client-supplied values if possible | Deny | Full |
| `notes` | Reject / ignore | Deny | Full |

Phase 2 should enforce ignore/reject for `status` and `notes` on Public create (permissions alone may not field-strip).

---

## 12. Page — `api::page.page`

**Path:** `/api/pages`  
**draftAndPublish:** `true`  
**Public:** `find`, `findOne` only.

### Example

```http
GET /api/pages?filters[slug][$eq]=<page-slug>&populate[heroImage]=true&populate[seo][populate][0]=ogImage&populate[sections][on][content.text-section]=true&populate[sections][on][content.image-section][populate]=image&populate[sections][on][content.faq-section][populate]=faqs
```

(Exact dynamic-zone populate syntax should be verified against the installed Strapi 5.x docs during Phase 2.)

### Response shape

```json
{
  "title": "<string>",
  "slug": "<string>",
  "excerpt": "<text|null>",
  "content": "<richtext|null>",
  "heroImage": "<media|null>",
  "sections": [
    {
      "__component": "content.text-section",
      "heading": "<string|null>",
      "body": "<richtext|null>"
    },
    {
      "__component": "content.image-section",
      "image": "<media|null>",
      "caption": "<string|null>",
      "altText": "<string>"
    },
    {
      "__component": "content.faq-section",
      "heading": "<string|null>",
      "faqs": ["<trip.faq>"]
    }
  ],
  "seo": "<seo>"
}
```

---

## Single type — auto-generated routes

## 13. Site Setting — `api::site-setting.site-setting`

**Kind:** `singleType`  
**Path:** `/api/site-setting`  
**draftAndPublish:** `false`

| Method | Path | Public |
| ------ | ---- | ------ |
| `GET` | `/api/site-setting` | Yes |
| `PUT` | `/api/site-setting` | **No** (admin only) |

### Example

```http
GET /api/site-setting?populate[defaultLogo]=true&populate[favicon]=true&populate[defaultSocialImage]=true&populate[defaultSeo][populate][0]=ogImage&populate[defaultSeo][populate][1]=twitterImage&populate[address]=true&populate[officeLocation]=true&populate[socialLinks]=true
```

### Response shape

```json
{
  "siteName": "<string>",
  "siteDescription": "<text|null>",
  "defaultLogo": "<media|null>",
  "favicon": "<media|null>",
  "defaultSocialImage": "<media|null>",
  "defaultSeo": "<seo>",
  "contactEmail": "<email|null>",
  "phone": "<string|null>",
  "whatsapp": "<string|null>",
  "address": {
    "name": "<string|null>",
    "address": "<string|null>",
    "city": "<string|null>",
    "district": "<string|null>",
    "country": "<string>",
    "latitude": "<decimal|null>",
    "longitude": "<decimal|null>",
    "mapUrl": "<string|null>"
  },
  "officeLocation": "<same as address|null>",
  "socialLinks": ["<shared.social-link>"],
  "googleBusinessProfileUrl": "<string|null>",
  "tripAdvisorUrl": "<string|null>",
  "emergencyContact": "<string|null>",
  "defaultCurrency": "<enum:USD|NPR|EUR|GBP|AUD|null>"
}
```

**Public:** intended for site chrome and Organization/WebSite JSON-LD. Treat `emergencyContact` as public only if the business wants it on-site; otherwise restrict in a later hardening pass (not specified as private in `agent.md`).

---

## Permissions checklist (Settings → Roles → Public)

| Content type | find | findOne | create | update | delete |
| ------------ | ---- | ------- | ------ | ------ | ------ |
| Trip | ✓ | ✓ | ✗ | ✗ | ✗ |
| Destination | ✓ | ✓ | ✗ | ✗ | ✗ |
| Activity | ✓ | ✓ | ✗ | ✗ | ✗ |
| Departure | ✓ | ✓ | ✗ | ✗ | ✗ |
| Guide | ✓ | ✓ | ✗ | ✗ | ✗ |
| Review | ✓ | ✓ | ✗ | ✗ | ✗ |
| Blog Post | ✓ | ✓ | ✗ | ✗ | ✗ |
| Blog Category | ✓ | ✓ | ✗ | ✗ | ✗ |
| Tag | ✓ | ✓ | ✗ | ✗ | ✗ |
| Author | ✓ | ✓ | ✗ | ✗ | ✗ |
| Inquiry | ✗ | ✗ | ✓ | ✗ | ✗ |
| Page | ✓ | ✓ | ✗ | ✗ | ✗ |
| Site Setting | ✓ (find) | — | — | ✗ | — |

Upload plugin: Public typically needs **no** upload permission (media served via existing files URLs). Do not grant Public upload unless a future feature requires it.

---

## Open API decisions

1. Final plural API IDs after schema reconciliation with existing `src/api` (see `IMPLEMENTATION.md`).
2. Whether `Departure.notes` is stripped for Public responses.
3. Whether Inquiry create responses omit `status`/`notes`.
4. Dynamic-zone populate syntax verification on Strapi **5.51.x** (installed in this repo).
5. Optional custom `GET …/slug/:slug` routes — not required by `agent.md`; filters-by-slug are sufficient initially.

---

_End of API.md._
