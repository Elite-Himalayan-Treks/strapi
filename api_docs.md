# Booking & Payment API — Frontend Integration

Base URL: `http://localhost:1337/api` (or your deployed Strapi `PUBLIC_URL` + `/api`)

Payment provider: **2C2P Payment Gateway v4.3** (hosted checkout via Payment Token + redirect).

---

## Flow overview

```
1. Customer picks trip (+ optional fixed departure) and fills checkout form
2. Frontend POST /bookings/checkout
3. Backend creates Booking (pending_payment) + a Payment ledger row, then requests 2C2P paymentToken
4. Frontend redirects browser to data.payment.webPaymentUrl
5. Customer pays on 2C2P hosted page
6. 2C2P:
   a. POSTs result to backend /bookings/payment/callback  (server-to-server)
   b. Redirects browser to frontendReturnUrl               (customer return)
7. Frontend page calls POST /bookings/payment/confirm (or polls GET /bookings/status)
8. Show success / failure UI from booking_status + payment_status
```

**Do not trust the browser redirect alone.** Always confirm via `/bookings/payment/confirm` or poll `/bookings/status`. The backend webhook + Payment Inquiry are the source of truth.

---

## Assumptions (product rules)

| Rule | Value |
| ---- | ----- |
| Price source | Fixed departure `price` / `discount` if departure selected; else trip `price` / `discount_price` |
| Amount charged | `full` = subtotal; `deposit` = subtotal × `BOOKING_DEPOSIT_PERCENT` (default **30%**). Remaining balance is `total_amount - amount_paid` and can be collected via `/bookings/pay-balance` |
| Currency | From trip `currency` (e.g. `USD`, `NPR`) — must be enabled on your 2C2P merchant account |
| Seat check | Soft check at checkout; seats increment only after **successful payment** |
| Invoice format | `BK` + `YYYYMMDD` + random, e.g. `BK20260827A1B2C3` |
| Auth | Public role for checkout/status/confirm; no customer login required |
| Admin | Full Booking CRUD in Strapi Admin (notes, refunds, manual confirm) |

Statuses:

- `booking_status`: `pending_payment` → `confirmed` (deposit or full received; seats reserved) | `failed` | `cancelled` | `expired` | `refunded`
- `payment_status`: `unpaid` → `pending` → `partially_paid` (deposit received, remaining > 0) → `paid` (remaining = 0) | `failed` | `refunded`
- Money: `total_amount` is the trip total; `amount_paid` is the sum of succeeded payments; `remaining_balance` / `amount_due` is outstanding. Each 2C2P charge is a Payment row with its own `gateway_invoice_no`.

---

## 1. Get checkout config

```http
GET /api/bookings/config
```

No auth. Use this to show deposit % and whether payments are enabled.

### Response

```json
{
  "data": {
    "configured": true,
    "env": "sandbox",
    "defaultFrontendReturnUrl": "http://localhost:3000/booking/payment-result",
    "depositPercent": 30
  }
}
```

If `configured` is `false`, hide the pay button and show “Contact us to book” (or fall back to Inquiry).

---

## 2. Create booking + start payment

```http
POST /api/bookings/checkout
Content-Type: application/json
```

### Request body

```json
{
  "tripDocumentId": "<trip documentId>",
  "departureDocumentId": "<fixed-departure documentId>",
  "startDate": "2026-10-12",
  "participants": 2,
  "paymentType": "full",
  "customer": {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": "+9779800000000",
    "country": "NP"
  },
  "specialRequests": "Vegetarian meals",
  "sourcePage": "/trips/everest-base-camp",
  "frontendReturnUrl": "http://localhost:3000/booking/payment-result",
  "locale": "en"
}
```

| Field | Required | Notes |
| ----- | -------- | ----- |
| `tripDocumentId` | yes | Published trip `documentId` |
| `departureDocumentId` | no | Prefer for fixed dates; validates seats + trip ownership |
| `startDate` | no | Used when no departure (private / custom date) |
| `participants` | yes | Integer ≥ 1 |
| `paymentType` | no | `full` (default) or `deposit` |
| `customer.name` | yes | |
| `customer.email` | yes | Also used later to look up status |
| `customer.phone` | no | Prefills 2C2P UI when possible |
| `customer.country` | no | ISO-ish country hint |
| `specialRequests` | no | Stored on booking |
| `sourcePage` | no | Analytics / attribution path |
| `frontendReturnUrl` | no | Absolute URL 2C2P redirects to after pay |
| `locale` | no | Default `en` |

Aliases accepted: `trip` / `departure` instead of `*DocumentId`.

### Success response `200`

```json
{
  "data": {
    "booking": {
      "documentId": "abc123",
      "invoice_no": "BK20260827A1B2C3",
      "trip_title": "Everest Base Camp Trek",
      "trip": {
        "documentId": "…",
        "title": "Everest Base Camp Trek",
        "slug": "everest-base-camp-trek"
      },
      "departure": {
        "documentId": "…",
        "start_date": "2026-10-12",
        "end_date": "2026-10-26",
        "departure_status": "open",
        "status": "open"
      },
      "start_date": "2026-10-12",
      "end_date": "2026-10-26",
      "customer_name": "Ada Lovelace",
      "customer_email": "ada@example.com",
      "customer_phone": "+9779800000000",
      "customer_country": "NP",
      "participants": 2,
      "unit_price": 1499,
      "discount_per_person": 100,
      "subtotal": 2798,
      "total_amount": 2798,
      "amount_due": 2798,
      "amount_paid": 0,
      "remaining_balance": 2798,
      "currency": "USD",
      "payment_type": "full",
      "deposit_percent": null,
      "booking_status": "pending_payment",
      "payment_status": "pending",
      "payment_channel": null,
      "paid_at": null,
      "special_requests": "Vegetarian meals",
      "createdAt": "2026-08-27T04:00:00.000Z",
      "updatedAt": "2026-08-27T04:00:00.000Z"
    },
    "payment": {
      "webPaymentUrl": "https://sandbox-pgw-ui.2c2p.com/payment/4.3/#/token/…",
      "paymentToken": "…",
      "invoiceNo": "BK20260827A1B2C3",
      "amount": 2798,
      "currency": "USD"
    }
  }
}
```

### Frontend action

```ts
const res = await fetch(`${API}/bookings/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const { data } = await res.json();
// Persist for the return page
sessionStorage.setItem(
  'pendingBooking',
  JSON.stringify({
    invoiceNo: data.payment.invoiceNo,
    email: payload.customer.email,
  }),
);
window.location.href = data.payment.webPaymentUrl;
```

### Error codes

| HTTP | When |
| ---- | ---- |
| `400` | Validation / missing price / bad payload |
| `404` | Trip or departure not found |
| `409` | Departure full/cancelled or not enough seats |
| `502` | 2C2P rejected paymentToken |
| `503` | Gateway env vars not configured |

---

## 3. Payment return page (frontend)

Recommended route: `/booking/payment-result` (must match `frontendReturnUrl`).

2C2P redirects the browser here after payment. Query/body may include a JWT `paymentResponse` — forward it when confirming.

### Confirm payment (preferred)

```http
POST /api/bookings/payment/confirm
Content-Type: application/json
```

```json
{
  "invoiceNo": "BK20260827A1B2C3",
  "email": "ada@example.com",
  "paymentResponse": "<optional JWT from 2C2P redirect>"
}
```

### Response

```json
{
  "data": {
    "booking": { "...": "public booking object" },
    "inquiry": { "respCode": "0000", "respDesc": "…" },
    "source": "2c2p_inquiry"
  }
}
```

UI mapping:

| `booking.payment_status` | `booking.booking_status` | UI |
| ------------------------ | ------------------------ | --- |
| `paid` (remaining 0) | `confirmed` | Fully paid — show invoice, trip, dates, amount paid |
| `partially_paid` (remaining > 0) | `confirmed` | Deposit received — show amount paid **and remaining balance**; offer pay remaining |
| `pending` | `pending_payment` | “Payment processing…” — poll status every 3–5s |
| `failed` | `failed` | Failure — offer retry / contact (a failed **balance** payment does not un-confirm a deposit) |
| other | other | Generic pending / contact support |

### Poll status (alternative / while pending)

```http
GET /api/bookings/status?invoiceNo=BK20260827A1B2C3&email=ada%40example.com
```

```json
{
  "data": {
    "invoice_no": "BK20260827A1B2C3",
    "booking_status": "confirmed",
    "payment_status": "paid",
    "amount_paid": 2798,
    "currency": "USD"
  }
}
```

Both `invoiceNo` and `email` are required (lookup key so invoices are not public).

---

## 4. Backend webhook (no frontend work)

```http
POST /api/bookings/payment/callback
```

Called by 2C2P server-to-server. Auth disabled. Looks up the **Payment** by `gateway_invoice_no` (falls back to booking `invoice_no`). On `respCode=0000`:

1. Marks that payment `succeeded` (idempotent per payment)
2. Recalculates `amount_paid`, `remaining_balance`, `amount_due`
3. Sets `payment_status` to `paid` or `partially_paid`, `booking_status=confirmed`
4. Increments fixed-departure `booked_seats` (once, idempotent)

Ensure this URL is publicly reachable in non-local environments (`TWOC2P_BACKEND_RETURN_URL`).

---

## 5. Pricing examples

**Full payment** — 2 pax, unit net $1,399:

- `subtotal` / `total_amount` / `amount_due` = `2798`

**Deposit 30%** — same booking, `paymentType: "deposit"`:

- `total_amount` = `2798` (full trip value)
- First Payment `amount` = `839.4` (charged now)
- After deposit succeeds: `amount_paid` = `839.4`, `remaining_balance` / `amount_due` = `1958.6`, `payment_status` = `partially_paid`
- Collect the rest with `POST /api/bookings/pay-balance` (new 2C2P invoice `{invoice_no}B2`)

---

## 5b. Pay remaining balance

```http
POST /api/bookings/pay-balance
Content-Type: application/json
```

```json
{
  "invoiceNo": "BK20260827A1B2C3",
  "email": "ada@example.com",
  "frontendReturnUrl": "http://localhost:3000/booking/payment-result",
  "locale": "en"
}
```

Allowed only when `remaining_balance > 0` and `booking_status` is `confirmed`. Creates a new Payment (`kind: balance`) with a unique 2C2P invoice (`{invoice_no}B2`, `B3`, …) and returns the same `{ booking, payment }` shape as checkout. Persist the **booking** `invoice_no` in sessionStorage (not the gateway invoice).

---

## 6. Related content APIs (for checkout UI)

### Trip detail (with departures)

```http
GET /api/trips?filters[slug][$eq]=everest-base-camp-trek&populate[departures]=true&populate[gallery]=true
```

Use `documentId`, `price`, `discount_price`, `currency`, and nested `departures`.

### Open departures for a trip

```http
GET /api/fixed-departures?filters[trip][documentId][$eq]=<tripId>&filters[departure_status][$ne]=cancelled&sort=start_date:asc
```

Compute available seats client-side:

```ts
const available =
  (dep.total_seats ?? 0) > 0
    ? Math.max((dep.total_seats ?? 0) - (dep.booked_seats ?? 0), 0)
    : null; // null = unlimited / not tracked
```

Disable book when `status` / `departure_status` is `full` or `cancelled`, or `available < participants`.

### Inquiry fallback (no payment)

```http
POST /api/inquiries
Content-Type: application/json

{
  "data": {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": "+977…",
    "message": "Please hold 2 seats for EBC Oct 12",
    "trip": "<trip documentId>",
    "group_size": 2,
    "preferred_date": "2026-10-12"
  }
}
```

---

## 7. Suggested frontend pages

| Page | Purpose |
| ---- | ------- |
| `/trips/[slug]` | Book CTA → checkout |
| `/booking/checkout` | Form: departure, pax, customer, full/deposit |
| `/booking/payment-result` | Return URL — confirm + show result |
| `/booking/[invoiceNo]` | Optional receipt view via status API + email gate |

### Minimal React return-page sketch

```tsx
useEffect(() => {
  const pending = JSON.parse(sessionStorage.getItem('pendingBooking') || '{}');
  const params = new URLSearchParams(window.location.search);
  const paymentResponse =
    params.get('paymentResponse') || params.get('payload') || undefined;

  fetch(`${API}/bookings/payment/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceNo: pending.invoiceNo,
      email: pending.email,
      paymentResponse,
    }),
  })
    .then((r) => r.json())
    .then(({ data }) => setResult(data));
}, []);
```

---

## 8. Environment (backend)

Set in Strapi `.env` (see `.env.example`):

```env
PUBLIC_URL=https://api.example.com
FRONTEND_URL=https://www.example.com
BOOKING_DEPOSIT_PERCENT=30

TWOC2P_ENV=sandbox
TWOC2P_MERCHANT_ID=your_merchant_id
TWOC2P_SECRET_KEY=your_secret_key
TWOC2P_FRONTEND_RETURN_URL=https://www.example.com/booking/payment-result
TWOC2P_BACKEND_RETURN_URL=https://api.example.com/api/bookings/payment/callback
```

Sandbox PGW: `https://sandbox-pgw.2c2p.com/payment/4.3`  
Production PGW: `https://pgw.2c2p.com/payment/4.3`

Public permissions (auto-granted on Strapi bootstrap):

- `booking.checkout`
- `booking.status`
- `booking.confirmPayment`
- `booking.payBalance`

`config` and `payment/callback` are `auth: false`.

Payments appear under **Content Manager → Payment**. Do not expose Payment CRUD publicly.

---

## 9. Admin / ops notes

- Bookings appear under **Content Manager → Booking**
- Internal fields not returned to the public API: `admin_notes`, `payment_token`, `payment_raw`, `seats_reserved`
- Refunds / cancellations: update statuses manually in Admin for now (no auto-refund API in this phase)
- Idempotent payment handling: duplicate 2C2P callbacks will not double-count seats

---

## 10. Quick test checklist

1. Set sandbox `TWOC2P_*` credentials and restart Strapi
2. `GET /api/bookings/config` → `configured: true`
3. `POST /api/bookings/checkout` with a real trip `documentId`
4. Open `webPaymentUrl`, complete sandbox payment with:
   - Visa `4111111111111111`
   - CVV `123`
   - Any future expiry
   Sandbox sets `request3DS: N` by default so Demo Merchant SG does not fail with **4081**. Real cards and OTP challenges are not used here. After a failed invoice, retry issues a new 2C2P invoice (`…B2`). Override with `TWOC2P_REQUEST_3DS=Y` if you need to test 3DS (`OTP 123456`).
5. `GET /api/bookings/status?invoiceNo=…&email=…` → `payment_status: paid`
6. Confirm departure `booked_seats` increased in Admin
