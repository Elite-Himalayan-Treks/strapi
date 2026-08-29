/**
 * booking service — pricing, checkout, payment confirmation
 */

import { factories } from '@strapi/strapi';
import twoc2p from './twoc2p';

const UID = 'api::booking.booking' as const;
const TRIP_UID = 'api::trip.trip' as const;
const DEPARTURE_UID = 'api::fixed-departure.fixed-departure' as const;

export type CheckoutInput = {
  tripDocumentId: string;
  departureDocumentId?: string;
  startDate?: string;
  participants: number;
  paymentType?: 'full' | 'deposit';
  customer: {
    name: string;
    email: string;
    phone?: string;
    country?: string;
  };
  specialRequests?: string;
  sourcePage?: string;
  frontendReturnUrl?: string;
  locale?: string;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateInvoiceNo(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK${y}${m}${d}${rand}`;
}

/** 2C2P expects ISO 3166-1 alpha-2 (e.g. NP). Free-text like "Nepal" causes 9993. */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  nepal: 'NP',
  india: 'IN',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  australia: 'AU',
  canada: 'CA',
  singapore: 'SG',
  thailand: 'TH',
  china: 'CN',
  japan: 'JP',
  germany: 'DE',
  france: 'FR',
};

function toIsoCountryCode(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()];
}

function paymentDescription(
  title: string,
  participants: number,
  paymentType: string,
): string {
  // Keep ASCII — some gateway UIs choke on unicode in description.
  const safeTitle = String(title || 'Trip')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return `${safeTitle} x ${participants} pax (${paymentType})`.slice(0, 250);
}

function toPublicBooking(booking: Record<string, unknown>) {
  const trip = booking.trip as Record<string, unknown> | null | undefined;
  const departure = booking.departure as
    | Record<string, unknown>
    | null
    | undefined;

  return {
    documentId: booking.documentId,
    invoice_no: booking.invoice_no,
    trip_title: booking.trip_title,
    trip: trip
      ? {
          documentId: trip.documentId,
          title: trip.title,
          slug: trip.slug,
        }
      : null,
    departure: departure
      ? {
          documentId: departure.documentId,
          start_date: departure.start_date,
          end_date: departure.end_date,
          departure_status:
            departure.departure_status ?? departure.status ?? null,
          status: departure.departure_status ?? departure.status ?? null,
        }
      : null,
    start_date: booking.start_date,
    end_date: booking.end_date,
    customer_name: booking.customer_name,
    customer_email: booking.customer_email,
    customer_phone: booking.customer_phone,
    customer_country: booking.customer_country,
    participants: booking.participants,
    unit_price: booking.unit_price,
    discount_per_person: booking.discount_per_person,
    subtotal: booking.subtotal,
    total_amount: booking.total_amount,
    amount_due: booking.amount_due,
    amount_paid: booking.amount_paid,
    currency: booking.currency,
    payment_type: booking.payment_type,
    deposit_percent: booking.deposit_percent,
    booking_status: booking.booking_status,
    payment_status: booking.payment_status,
    payment_channel: booking.payment_channel,
    paid_at: booking.paid_at,
    special_requests: booking.special_requests,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function isPaymentSuccess(respCode?: string): boolean {
  return respCode === '0000';
}

function isPaymentFailed(respCode?: string): boolean {
  if (!respCode) return false;
  // 0000 success, 0001 pending, 2000 frontend "completed please inquiry"
  return !['0000', '0001', '2000'].includes(respCode);
}

export default factories.createCoreService(UID, ({ strapi }) => ({
  toPublicBooking,

  async createCheckout(input: CheckoutInput) {
    if (!twoc2p.isTwoc2pConfigured()) {
      const err = new Error(
        'Payment gateway is not configured. Set TWOC2P_MERCHANT_ID and TWOC2P_SECRET_KEY.',
      );
      (err as Error & { status: number }).status = 503;
      throw err;
    }

    const participants = Number(input.participants);
    if (!Number.isFinite(participants) || participants < 1) {
      const err = new Error('participants must be a positive integer');
      (err as Error & { status: number }).status = 400;
      throw err;
    }

    if (!input.customer?.name?.trim() || !input.customer?.email?.trim()) {
      const err = new Error('customer.name and customer.email are required');
      (err as Error & { status: number }).status = 400;
      throw err;
    }

    const trip = await strapi.documents(TRIP_UID).findOne({
      documentId: input.tripDocumentId,
      status: 'published',
    });

    if (!trip) {
      const err = new Error('Trip not found or not published');
      (err as Error & { status: number }).status = 404;
      throw err;
    }

    let departure: Record<string, unknown> | null = null;
    if (input.departureDocumentId) {
      departure = (await strapi.documents(DEPARTURE_UID).findOne({
        documentId: input.departureDocumentId,
        populate: { trip: { fields: ['documentId'] } },
      })) as Record<string, unknown> | null;

      if (!departure) {
        const err = new Error('Fixed departure not found');
        (err as Error & { status: number }).status = 404;
        throw err;
      }

      const depTrip = departure.trip as { documentId?: string } | null;
      if (depTrip?.documentId && depTrip.documentId !== trip.documentId) {
        const err = new Error('Departure does not belong to the selected trip');
        (err as Error & { status: number }).status = 400;
        throw err;
      }

      const status = String(departure.departure_status || '');
      if (['full', 'cancelled'].includes(status)) {
        const err = new Error(`Departure is not bookable (status: ${status})`);
        (err as Error & { status: number }).status = 409;
        throw err;
      }

      const totalSeats = Number(departure.total_seats ?? 0);
      const bookedSeats = Number(departure.booked_seats ?? 0);
      if (totalSeats > 0 && bookedSeats + participants > totalSeats) {
        const err = new Error(
          `Not enough seats. Available: ${Math.max(totalSeats - bookedSeats, 0)}`,
        );
        (err as Error & { status: number }).status = 409;
        throw err;
      }
    }

    // `discount` / `discount_price` store the promotional sale price (not amount-off).
    const listPrice = Number(
      departure?.price != null ? departure.price : trip.price ?? 0,
    );
    const salePrice = Number(
      departure?.discount != null
        ? departure.discount
        : trip.discount_price != null
          ? trip.discount_price
          : listPrice,
    );
    const unitNet = roundMoney(Math.max(salePrice, 0));
    const discount = roundMoney(Math.max(listPrice - unitNet, 0));
    if (unitNet <= 0) {
      const err = new Error('Trip price is not set; cannot create paid booking');
      (err as Error & { status: number }).status = 400;
      throw err;
    }

    const subtotal = roundMoney(unitNet * participants);
    const paymentType = input.paymentType === 'deposit' ? 'deposit' : 'full';
    const depositPercent = Number(process.env.BOOKING_DEPOSIT_PERCENT || 30);
    const amountDue =
      paymentType === 'deposit'
        ? roundMoney(subtotal * (depositPercent / 100))
        : subtotal;

    const currency = String(trip.currency || 'USD').toUpperCase();
    const invoiceNo = generateInvoiceNo();
    const frontendReturnUrl =
      input.frontendReturnUrl ||
      twoc2p.getTwoc2pPublicConfig().defaultFrontendReturnUrl;

    const booking = await strapi.documents(UID).create({
      data: {
        invoice_no: invoiceNo,
        trip: trip.documentId,
        ...(departure?.documentId
          ? { departure: String(departure.documentId) }
          : {}),
        trip_title: trip.title || undefined,
        start_date:
          (departure?.start_date as string | undefined) ||
          input.startDate ||
          undefined,
        end_date: (departure?.end_date as string | undefined) || undefined,
        customer_name: input.customer.name.trim(),
        customer_email: input.customer.email.trim().toLowerCase(),
        customer_phone: input.customer.phone?.trim() || undefined,
        customer_country: input.customer.country?.trim() || undefined,
        participants,
        unit_price: unitNet,
        discount_per_person: discount,
        subtotal,
        total_amount: subtotal,
        amount_due: amountDue,
        amount_paid: 0,
        currency,
        payment_type: paymentType,
        deposit_percent: paymentType === 'deposit' ? depositPercent : undefined,
        booking_status: 'pending_payment',
        payment_status: 'pending',
        payment_provider: '2c2p',
        special_requests: input.specialRequests || undefined,
        source_page: input.sourcePage || undefined,
        frontend_return_url: frontendReturnUrl,
        seats_reserved: false,
      },
    });

    const countryCode = toIsoCountryCode(input.customer.country);
    const mobileNo = input.customer.phone?.replace(/\D/g, '') || undefined;

    let payment: Awaited<ReturnType<typeof twoc2p.requestPaymentToken>>;
    try {
      payment = await twoc2p.requestPaymentToken({
        invoiceNo,
        description: paymentDescription(
          String(trip.title || ''),
          participants,
          paymentType,
        ),
        amount: amountDue,
        currencyCode: currency,
        frontendReturnUrl,
        locale: input.locale || 'en',
        userInfo: {
          name: input.customer.name.trim(),
          email: input.customer.email.trim(),
          ...(mobileNo ? { mobileNo } : {}),
          ...(countryCode ? { countryCode } : {}),
        },
      });
    } catch (e) {
      await strapi.documents(UID).update({
        documentId: booking.documentId,
        data: {
          booking_status: 'failed',
          payment_status: 'failed',
          admin_notes: `2C2P paymentToken failed: ${(e as Error).message}`,
        },
      });
      throw e;
    }

    if (payment.respCode !== '0000') {
      await strapi.documents(UID).update({
        documentId: booking.documentId,
        data: {
          booking_status: 'failed',
          payment_status: 'failed',
          payment_raw: payment,
          admin_notes: `2C2P paymentToken error: ${payment.respCode} ${payment.respDesc}`,
        },
      });
      const err = new Error(
        `Payment init failed: ${payment.respDesc || payment.respCode}`,
      );
      (err as Error & { status: number }).status = 502;
      throw err;
    }

    const updated = await strapi.documents(UID).update({
      documentId: booking.documentId,
      data: {
        payment_token: payment.paymentToken,
        payment_raw: payment,
      },
      populate: {
        trip: { fields: ['documentId', 'title', 'slug'] },
        departure: true,
      },
    });

    return {
      booking: toPublicBooking(updated as Record<string, unknown>),
      payment: {
        webPaymentUrl: payment.webPaymentUrl,
        paymentToken: payment.paymentToken,
        invoiceNo,
        amount: amountDue,
        currency,
      },
    };
  },

  async findByInvoice(invoiceNo: string, email?: string) {
    const booking = await strapi.documents(UID).findFirst({
      filters: { invoice_no: invoiceNo },
      populate: {
        trip: { fields: ['documentId', 'title', 'slug'] },
        departure: true,
      },
    });

    if (!booking) return null;

    if (
      email &&
      String(booking.customer_email).toLowerCase() !== email.trim().toLowerCase()
    ) {
      return null;
    }

    return booking as Record<string, unknown>;
  },

  async applyPaymentResult(
    invoiceNo: string,
    result: Record<string, unknown>,
    opts: { reserveSeats?: boolean } = {},
  ) {
    const booking = await strapi.documents(UID).findFirst({
      filters: { invoice_no: invoiceNo },
      populate: { departure: true },
    });

    if (!booking) {
      return { ok: false, reason: 'booking_not_found' as const };
    }

    // Idempotent: already paid
    if (
      booking.payment_status === 'paid' &&
      ['paid', 'confirmed'].includes(String(booking.booking_status))
    ) {
      return {
        ok: true,
        booking: toPublicBooking(booking as Record<string, unknown>),
        alreadyProcessed: true,
      };
    }

    const respCode = String(result.respCode || '');
    const patch: Record<string, unknown> = {
      payment_raw: result,
      tran_ref: result.tranRef || booking.tran_ref || null,
      reference_no: result.referenceNo || booking.reference_no || null,
      approval_code: result.approvalCode || booking.approval_code || null,
      payment_channel: result.channelCode || booking.payment_channel || null,
    };

    if (isPaymentSuccess(respCode)) {
      patch.payment_status = 'paid';
      patch.booking_status = 'confirmed';
      patch.amount_paid = booking.amount_due;
      patch.paid_at = new Date().toISOString();

      const updated = await strapi.documents(UID).update({
        documentId: booking.documentId,
        data: patch,
        populate: {
          trip: { fields: ['documentId', 'title', 'slug'] },
          departure: true,
        },
      });

      if (opts.reserveSeats !== false && !booking.seats_reserved) {
        await this.reserveSeats(updated as Record<string, unknown>);
      }

      const fresh = await this.findByInvoice(invoiceNo);
      return {
        ok: true,
        booking: toPublicBooking(fresh as Record<string, unknown>),
        alreadyProcessed: false,
      };
    }

    if (respCode === '0001') {
      patch.payment_status = 'pending';
      patch.booking_status = 'pending_payment';
    } else if (isPaymentFailed(respCode)) {
      patch.payment_status = 'failed';
      patch.booking_status = 'failed';
    }

    const updated = await strapi.documents(UID).update({
      documentId: booking.documentId,
      data: patch,
      populate: {
        trip: { fields: ['documentId', 'title', 'slug'] },
        departure: true,
      },
    });

    return {
      ok: true,
      booking: toPublicBooking(updated as Record<string, unknown>),
      alreadyProcessed: false,
    };
  },

  async reserveSeats(booking: Record<string, unknown>) {
    const departure = booking.departure as
      | Record<string, unknown>
      | null
      | undefined;
    if (!departure?.documentId || booking.seats_reserved) {
      return;
    }

    const participants = Number(booking.participants || 1);
    const totalSeats = Number(departure.total_seats ?? 0);
    const bookedSeats = Number(departure.booked_seats ?? 0);
    const nextBooked = bookedSeats + participants;

    const depPatch: Record<string, unknown> = {
      booked_seats: nextBooked,
    };
    if (totalSeats > 0 && nextBooked >= totalSeats) {
      depPatch.departure_status = 'full';
    } else if (
      totalSeats > 0 &&
      nextBooked >= Math.ceil(totalSeats * 0.7) &&
      departure.departure_status === 'open'
    ) {
      depPatch.departure_status = 'limited';
    }

    await strapi.documents(DEPARTURE_UID).update({
      documentId: String(departure.documentId),
      data: depPatch,
    });

    await strapi.documents(UID).update({
      documentId: String(booking.documentId),
      data: { seats_reserved: true },
    });
  },

  async confirmFromFrontend(invoiceNo: string, email?: string) {
    const booking = await this.findByInvoice(invoiceNo, email);
    if (!booking) {
      const err = new Error('Booking not found');
      (err as Error & { status: number }).status = 404;
      throw err;
    }

    // Already final
    if (booking.payment_status === 'paid') {
      return {
        booking: toPublicBooking(booking),
        inquiry: null,
        source: 'local',
      };
    }

    let inquiryResult: Record<string, unknown> | null = null;
    try {
      inquiryResult = await twoc2p.inquirePayment(invoiceNo);
    } catch (e) {
      strapi.log.warn(
        `[booking] payment inquiry failed for ${invoiceNo}: ${(e as Error).message}`,
      );
    }

    if (inquiryResult) {
      const applied = await this.applyPaymentResult(invoiceNo, inquiryResult);
      return {
        booking: applied.booking,
        inquiry: inquiryResult,
        source: '2c2p_inquiry',
      };
    }

    return {
      booking: toPublicBooking(booking),
      inquiry: null,
      source: 'local',
    };
  },

  async handlePaymentCallback(body: unknown) {
    const result = twoc2p.decodeIncomingPayload(
      body as string | Record<string, unknown>,
    );
    const invoiceNo = String(result.invoiceNo || '');
    if (!invoiceNo) {
      return { ok: false, reason: 'missing_invoice' as const };
    }

    const applied = await this.applyPaymentResult(invoiceNo, result);
    return applied;
  },
}));
