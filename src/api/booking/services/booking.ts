/**
 * booking service — pricing, checkout, payment confirmation
 */

import { factories } from '@strapi/strapi';
import twoc2p from './twoc2p';
import {
  amountsMatch,
  chargeNowAmount,
  remainingBalance,
  roundMoney,
  settlementStatus,
} from './money';

const UID = 'api::booking.booking' as const;
const PAYMENT_UID = 'api::payment.payment' as const;
const TRIP_UID = 'api::trip.trip' as const;
const DEPARTURE_UID = 'api::fixed-departure.fixed-departure' as const;

type PaymentRecord = Record<string, unknown>;

const BOOKING_POPULATE = {
  trip: {
    fields: ['documentId', 'title', 'slug'] as Array<
      'documentId' | 'title' | 'slug'
    >,
  },
  departure: true as const,
};

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

export type PayBalanceInput = {
  invoiceNo: string;
  email: string;
  frontendReturnUrl?: string;
  locale?: string;
};

type PaymentKind = 'deposit' | 'full' | 'balance' | 'manual';

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
  kind: string,
): string {
  const safeTitle = String(title || 'Trip')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return `${safeTitle} x ${participants} pax (${kind})`.slice(0, 250);
}

function httpStatusError(message: string, status: number): Error {
  const err = new Error(message);
  (err as Error & { status: number }).status = status;
  return err;
}

function toPublicBooking(booking: Record<string, unknown>) {
  const trip = booking.trip as Record<string, unknown> | null | undefined;
  const departure = booking.departure as
    | Record<string, unknown>
    | null
    | undefined;

  const total = Number(booking.total_amount ?? 0);
  const paid = Number(booking.amount_paid ?? 0);
  const remaining = remainingBalance(total, paid);
  let paymentStatus = String(booking.payment_status || 'pending');
  if (paymentStatus !== 'refunded' && paymentStatus !== 'failed') {
    const derived = settlementStatus(paid, remaining);
    if (derived === 'paid' || derived === 'partially_paid') {
      paymentStatus = derived;
    } else if (remaining > 0 && paid <= 0 && paymentStatus === 'paid') {
      paymentStatus = 'pending';
    }
  }

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
    total_amount: total,
    amount_due: remaining,
    amount_paid: paid,
    remaining_balance: remaining,
    currency: booking.currency,
    payment_type: booking.payment_type,
    deposit_percent: booking.deposit_percent,
    booking_status: booking.booking_status,
    payment_status: paymentStatus,
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
  return !['0000', '0001', '2000', '2001'].includes(respCode);
}

function nextBalanceGatewayInvoice(
  bookingInvoice: string,
  payments: Array<{ gateway_invoice_no?: string }>,
): string {
  const used = new Set(
    payments.map((item) => String(item.gateway_invoice_no || '')).filter(Boolean),
  );
  let n = Math.max(payments.length + 1, 2);
  let candidate = `${bookingInvoice}B${n}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${bookingInvoice}B${n}`;
  }
  return candidate;
}

function checkoutPaymentPayload(
  bookingInvoice: string,
  gateway: {
    webPaymentUrl?: string;
    paymentToken?: string;
  },
  amount: number,
  currency: string,
) {
  return {
    webPaymentUrl: gateway.webPaymentUrl,
    paymentToken: gateway.paymentToken || null,
    invoiceNo: bookingInvoice,
    amount,
    currency,
  };
}

export default factories.createCoreService(UID, ({ strapi }) => ({
  toPublicBooking,

  async listPayments(bookingDocumentId: string): Promise<PaymentRecord[]> {
    const result = await strapi.documents(PAYMENT_UID).findMany({
      filters: { booking: { documentId: { $eq: bookingDocumentId } } },
      sort: 'createdAt:asc',
      limit: 200,
    });
    return (Array.isArray(result) ? result : []) as PaymentRecord[];
  },

  async findPaymentByGatewayInvoice(gatewayInvoiceNo: string) {
    const payment = await strapi.documents(PAYMENT_UID).findFirst({
      filters: { gateway_invoice_no: gatewayInvoiceNo },
      populate: {
        booking: {
          populate: BOOKING_POPULATE,
        },
      },
    });
    return (payment as Record<string, unknown> | null) || null;
  },

  async persistSettlement(booking: Record<string, unknown>) {
    const documentId = String(booking.documentId);
    const payments: PaymentRecord[] = await this.listPayments(documentId);
    const succeeded = payments.filter((item) => item.status === 'succeeded');
    const pending = payments.filter((item) => item.status === 'pending');
    const failed = payments.filter((item) => item.status === 'failed');

    const total = Number(booking.total_amount ?? 0);
    const paidFromLedger = payments.length
      ? roundMoney(
          succeeded.reduce(
            (sum: number, item: PaymentRecord) =>
              sum + Number(item.amount || 0),
            0,
          ),
        )
      : roundMoney(Number(booking.amount_paid || 0));
    if (paidFromLedger > total) {
      strapi.log.warn(
        `[booking] amount_paid ${paidFromLedger} exceeds total ${total} for ${booking.invoice_no}`,
      );
    }
    const remaining = remainingBalance(total, paidFromLedger);

    const terminal = ['refunded', 'cancelled', 'expired'].includes(
      String(booking.booking_status),
    );
    const paymentTerminal = ['refunded'].includes(String(booking.payment_status));

    let paymentStatus = String(booking.payment_status || 'pending');
    let bookingStatus = String(booking.booking_status || 'pending_payment');

    if (!terminal && !paymentTerminal) {
      if (paidFromLedger > 0) {
        paymentStatus = settlementStatus(paidFromLedger, remaining);
        bookingStatus = 'confirmed';
      } else if (pending.length > 0) {
        paymentStatus = 'pending';
        bookingStatus = 'pending_payment';
      } else if (failed.length > 0 && succeeded.length === 0) {
        paymentStatus = 'failed';
        bookingStatus = 'failed';
      }
    }

    const latestSuccess = [...succeeded].reverse()[0];
    const patch: Record<string, unknown> = {
      amount_paid: paidFromLedger,
      remaining_balance: remaining,
      amount_due: remaining,
    };

    if (!terminal) {
      patch.booking_status = bookingStatus;
    }
    if (!paymentTerminal) {
      patch.payment_status = paymentStatus;
    }
    if (latestSuccess) {
      patch.paid_at = latestSuccess.paid_at || booking.paid_at;
      patch.tran_ref = latestSuccess.tran_ref || booking.tran_ref;
      patch.reference_no = latestSuccess.reference_no || booking.reference_no;
      patch.approval_code = latestSuccess.approval_code || booking.approval_code;
      patch.payment_channel =
        latestSuccess.payment_channel || booking.payment_channel;
      patch.payment_token =
        latestSuccess.payment_token || booking.payment_token;
      patch.payment_raw = latestSuccess.payment_raw || booking.payment_raw;
    }

    const unchanged =
      Number(booking.amount_paid || 0) === paidFromLedger &&
      Number(booking.remaining_balance ?? -1) === remaining &&
      Number(booking.amount_due || 0) === remaining &&
      String(booking.payment_status) === String(patch.payment_status) &&
      String(booking.booking_status) === String(patch.booking_status);

    if (unchanged) {
      return booking;
    }

    return (await strapi.documents(UID).update({
      documentId,
      data: patch,
      populate: BOOKING_POPULATE,
    })) as Record<string, unknown>;
  },

  async createPaymentRecord(options: {
    bookingDocumentId: string;
    kind: PaymentKind;
    amount: number;
    currency: string;
    gatewayInvoiceNo: string;
  }) {
    return (await strapi.documents(PAYMENT_UID).create({
      data: {
        booking: options.bookingDocumentId,
        kind: options.kind,
        amount: options.amount,
        currency: options.currency,
        status: 'pending',
        gateway_invoice_no: options.gatewayInvoiceNo,
        payment_provider: '2c2p',
      },
    })) as Record<string, unknown>;
  },

  async requestGatewayToken(options: {
    booking: Record<string, unknown>;
    payment: Record<string, unknown>;
    amount: number;
    kind: string;
    frontendReturnUrl: string;
    locale?: string;
  }) {
    const booking = options.booking;
    const countryCode = toIsoCountryCode(
      String(booking.customer_country || '') || undefined,
    );
    const mobileNo =
      String(booking.customer_phone || '').replace(/\D/g, '') || undefined;

    let gateway: Awaited<ReturnType<typeof twoc2p.requestPaymentToken>>;
    try {
      gateway = await twoc2p.requestPaymentToken({
        invoiceNo: String(options.payment.gateway_invoice_no),
        description: paymentDescription(
          String(booking.trip_title || ''),
          Number(booking.participants || 1),
          options.kind,
        ),
        amount: options.amount,
        currencyCode: String(booking.currency || 'USD'),
        frontendReturnUrl: options.frontendReturnUrl,
        locale: options.locale || 'en',
        userInfo: {
          name: String(booking.customer_name || ''),
          email: String(booking.customer_email || ''),
          ...(mobileNo ? { mobileNo } : {}),
          ...(countryCode ? { countryCode } : {}),
        },
      });
    } catch (e) {
      await strapi.documents(PAYMENT_UID).update({
        documentId: String(options.payment.documentId),
        data: {
          status: 'failed',
          payment_raw: { error: (e as Error).message },
        },
      });
      throw e;
    }

    if (gateway.respCode !== '0000') {
      await strapi.documents(PAYMENT_UID).update({
        documentId: String(options.payment.documentId),
        data: {
          status: 'failed',
          payment_raw: gateway,
        },
      });
      throw httpStatusError(
        `Payment init failed: ${gateway.respDesc || gateway.respCode}`,
        502,
      );
    }

    await strapi.documents(PAYMENT_UID).update({
      documentId: String(options.payment.documentId),
      data: {
        payment_token: gateway.paymentToken,
        payment_raw: gateway,
      },
    });

    await strapi.documents(UID).update({
      documentId: String(booking.documentId),
      data: {
        payment_token: gateway.paymentToken,
        payment_raw: gateway,
        frontend_return_url: options.frontendReturnUrl,
      },
    });

    return gateway;
  },

  async createCheckout(input: CheckoutInput) {
    if (!twoc2p.isTwoc2pConfigured()) {
      throw httpStatusError(
        'Payment gateway is not configured. Set TWOC2P_MERCHANT_ID and TWOC2P_SECRET_KEY.',
        503,
      );
    }

    const participants = Number(input.participants);
    if (!Number.isFinite(participants) || participants < 1) {
      throw httpStatusError('participants must be a positive integer', 400);
    }

    if (!input.customer?.name?.trim() || !input.customer?.email?.trim()) {
      throw httpStatusError('customer.name and customer.email are required', 400);
    }

    const trip = await strapi.documents(TRIP_UID).findOne({
      documentId: input.tripDocumentId,
      status: 'published',
    });

    if (!trip) {
      throw httpStatusError('Trip not found or not published', 404);
    }

    let departure: Record<string, unknown> | null = null;
    if (input.departureDocumentId) {
      departure = (await strapi.documents(DEPARTURE_UID).findOne({
        documentId: input.departureDocumentId,
        populate: { trip: { fields: ['documentId'] } },
      })) as Record<string, unknown> | null;

      if (!departure) {
        throw httpStatusError('Fixed departure not found', 404);
      }

      const depTrip = departure.trip as { documentId?: string } | null;
      if (depTrip?.documentId && depTrip.documentId !== trip.documentId) {
        throw httpStatusError(
          'Departure does not belong to the selected trip',
          400,
        );
      }

      const status = String(departure.departure_status || '');
      if (['full', 'cancelled'].includes(status)) {
        throw httpStatusError(`Departure is not bookable (status: ${status})`, 409);
      }

      const totalSeats = Number(departure.total_seats ?? 0);
      const bookedSeats = Number(departure.booked_seats ?? 0);
      if (totalSeats > 0 && bookedSeats + participants > totalSeats) {
        throw httpStatusError(
          `Not enough seats. Available: ${Math.max(totalSeats - bookedSeats, 0)}`,
          409,
        );
      }
    }

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
      throw httpStatusError('Trip price is not set; cannot create paid booking', 400);
    }

    const subtotal = roundMoney(unitNet * participants);
    const paymentType = input.paymentType === 'deposit' ? 'deposit' : 'full';
    const depositPercent = Number(process.env.BOOKING_DEPOSIT_PERCENT || 30);
    const chargeAmount = chargeNowAmount(subtotal, paymentType, depositPercent);
    if (chargeAmount <= 0) {
      throw httpStatusError('Charge amount must be greater than zero', 400);
    }

    const currency = String(trip.currency || 'USD').toUpperCase();
    const invoiceNo = generateInvoiceNo();
    const frontendReturnUrl =
      input.frontendReturnUrl ||
      twoc2p.getTwoc2pPublicConfig().defaultFrontendReturnUrl;

    const booking = (await strapi.documents(UID).create({
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
        amount_due: subtotal,
        amount_paid: 0,
        remaining_balance: subtotal,
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
    })) as Record<string, unknown>;

    const paymentKind: PaymentKind =
      paymentType === 'deposit' ? 'deposit' : 'full';
    let paymentRecord: Record<string, unknown>;
    try {
      paymentRecord = await this.createPaymentRecord({
        bookingDocumentId: String(booking.documentId),
        kind: paymentKind,
        amount: chargeAmount,
        currency,
        gatewayInvoiceNo: invoiceNo,
      });
    } catch (e) {
      await strapi.documents(UID).update({
        documentId: String(booking.documentId),
        data: {
          booking_status: 'failed',
          payment_status: 'failed',
          admin_notes: `Payment record failed: ${(e as Error).message}`,
        },
      });
      throw e;
    }

    try {
      const gateway = await this.requestGatewayToken({
        booking,
        payment: paymentRecord,
        amount: chargeAmount,
        kind: paymentKind,
        frontendReturnUrl,
        locale: input.locale,
      });

      const updated = (await strapi.documents(UID).findOne({
        documentId: String(booking.documentId),
        populate: BOOKING_POPULATE,
      })) as Record<string, unknown>;

      return {
        booking: toPublicBooking(updated),
        payment: checkoutPaymentPayload(
          invoiceNo,
          gateway,
          chargeAmount,
          currency,
        ),
      };
    } catch (e) {
      await strapi.documents(UID).update({
        documentId: String(booking.documentId),
        data: {
          booking_status: 'failed',
          payment_status: 'failed',
          admin_notes: `2C2P paymentToken failed: ${(e as Error).message}`,
        },
      });
      throw e;
    }
  },

  async payBalance(input: PayBalanceInput) {
    if (!twoc2p.isTwoc2pConfigured()) {
      throw httpStatusError(
        'Payment gateway is not configured. Set TWOC2P_MERCHANT_ID and TWOC2P_SECRET_KEY.',
        503,
      );
    }

    const booking = await this.findByInvoice(input.invoiceNo, input.email);
    if (!booking) {
      throw httpStatusError('Booking not found', 404);
    }

    let settled = await this.persistSettlement(booking);
    const existing: PaymentRecord[] = await this.listPayments(
      String(settled.documentId),
    );
    for (const item of existing) {
      if (item.status !== 'pending' || !item.gateway_invoice_no) continue;
      try {
        const inquiry = await twoc2p.inquirePayment(
          String(item.gateway_invoice_no),
        );
        if (inquiry) {
          await this.applyPaymentResult(
            String(item.gateway_invoice_no),
            inquiry,
          );
        }
      } catch (e) {
        strapi.log.warn(
          `[booking] retry inquiry failed for ${item.gateway_invoice_no}: ${(e as Error).message}`,
        );
      }
    }
    settled =
      (await this.findByInvoice(String(settled.invoice_no))) || settled;
    settled = await this.persistSettlement(settled);

    const total = Number(settled.total_amount ?? 0);
    const paid = Number(settled.amount_paid ?? 0);
    const remaining = remainingBalance(total, paid);
    const bookingStatus = String(settled.booking_status || '');

    if (['cancelled', 'expired', 'refunded'].includes(bookingStatus)) {
      throw httpStatusError(
        `This booking cannot accept further payment (status: ${bookingStatus})`,
        409,
      );
    }

    if (remaining <= 0) {
      throw httpStatusError('This booking has no remaining balance', 400);
    }

    const payments: PaymentRecord[] = await this.listPayments(
      String(settled.documentId),
    );
    const pendingOpen = payments.find((item) => item.status === 'pending');
    if (pendingOpen) {
      throw httpStatusError(
        'A payment for this booking is already in progress',
        409,
      );
    }

    let kind: PaymentKind;
    let amount: number;
    if (paid > 0) {
      if (!['confirmed', 'paid'].includes(bookingStatus)) {
        throw httpStatusError(
          `This booking cannot accept further payment (status: ${bookingStatus})`,
          409,
        );
      }
      kind = 'balance';
      amount = remaining;
    } else {
      if (!['pending_payment', 'failed'].includes(bookingStatus)) {
        throw httpStatusError(
          'Pay the deposit first before collecting the remaining balance',
          409,
        );
      }
      const paymentType =
        String(settled.payment_type) === 'deposit' ? 'deposit' : 'full';
      kind = paymentType;
      amount = chargeNowAmount(
        total,
        paymentType,
        Number(settled.deposit_percent || 30),
      );
    }

    if (amount <= 0) {
      throw httpStatusError('Charge amount must be greater than zero', 400);
    }

    if (bookingStatus === 'failed') {
      await strapi.documents(UID).update({
        documentId: String(settled.documentId),
        data: {
          booking_status: 'pending_payment',
          payment_status: 'pending',
        },
      });
    }

    const gatewayInvoiceNo = nextBalanceGatewayInvoice(
      String(settled.invoice_no),
      payments,
    );
    const currency = String(settled.currency || 'USD').toUpperCase();
    const frontendReturnUrl =
      input.frontendReturnUrl ||
      String(settled.frontend_return_url || '') ||
      twoc2p.getTwoc2pPublicConfig().defaultFrontendReturnUrl;

    const paymentRecord = await this.createPaymentRecord({
      bookingDocumentId: String(settled.documentId),
      kind,
      amount,
      currency,
      gatewayInvoiceNo,
    });

    const gateway = await this.requestGatewayToken({
      booking: settled,
      payment: paymentRecord,
      amount,
      kind,
      frontendReturnUrl,
      locale: input.locale,
    });

    const updated = (await strapi.documents(UID).findOne({
      documentId: String(settled.documentId),
      populate: BOOKING_POPULATE,
    })) as Record<string, unknown>;

    return {
      booking: toPublicBooking(updated),
      payment: checkoutPaymentPayload(
        String(settled.invoice_no),
        gateway,
        amount,
        currency,
      ),
    };
  },

  async findByInvoice(invoiceNo: string, email?: string) {
    const booking = await strapi.documents(UID).findFirst({
      filters: { invoice_no: invoiceNo },
      populate: BOOKING_POPULATE,
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

  async resolveBooking(invoiceNo: string, email?: string) {
    const byBooking = await this.findByInvoice(invoiceNo, email);
    if (byBooking) return byBooking;

    const payment = await this.findPaymentByGatewayInvoice(invoiceNo);
    if (!payment) return null;

    const related = payment.booking as Record<string, unknown> | null | undefined;
    if (!related?.documentId) return null;

    const booking = await this.findByInvoice(
      String(related.invoice_no || ''),
      email,
    );
    return booking;
  },

  async applyPaymentResult(
    invoiceNo: string,
    result: Record<string, unknown>,
    opts: { reserveSeats?: boolean } = {},
  ) {
    let payment = await this.findPaymentByGatewayInvoice(invoiceNo);
    let booking: Record<string, unknown> | null =
      (payment?.booking as Record<string, unknown> | undefined) || null;

    if (!booking) {
      booking = await this.findByInvoice(invoiceNo);
    }

    if (!booking) {
      return { ok: false, reason: 'booking_not_found' as const };
    }

    if (!payment) {
      const payments: PaymentRecord[] = await this.listPayments(
        String(booking.documentId),
      );
      payment =
        payments.find(
          (item) =>
            String(item.gateway_invoice_no) === invoiceNo ||
            (item.status === 'pending' &&
              amountsMatch(Number(item.amount), result.amount)),
        ) ||
        payments.find((item) => item.status === 'pending') ||
        null;

      if (!payment) {
        const charge =
          Number(result.amount) ||
          remainingBalance(
            Number(booking.total_amount ?? 0),
            Number(booking.amount_paid ?? 0),
          ) ||
          Number(booking.amount_due ?? 0);
        const kind: PaymentKind =
          String(booking.payment_type) === 'deposit' ? 'deposit' : 'full';
        payment = await this.createPaymentRecord({
          bookingDocumentId: String(booking.documentId),
          kind,
          amount: roundMoney(charge),
          currency: String(booking.currency || 'USD'),
          gatewayInvoiceNo: invoiceNo,
        });
      }
    }

    if (payment.status === 'succeeded') {
      const fresh = await this.persistSettlement(booking);
      return {
        ok: true,
        booking: toPublicBooking(fresh),
        alreadyProcessed: true,
      };
    }

    const respCode = String(result.respCode || '');
    const paymentPatch: Record<string, unknown> = {
      payment_raw: result,
      tran_ref: result.tranRef || payment.tran_ref || null,
      reference_no: result.referenceNo || payment.reference_no || null,
      approval_code: result.approvalCode || payment.approval_code || null,
      payment_channel: result.channelCode || payment.payment_channel || null,
    };

    if (isPaymentSuccess(respCode)) {
      const resultCurrency = String(result.currencyCode || '').toUpperCase();
      const paymentCurrency = String(payment.currency || '').toUpperCase();
      const sameCurrency =
        !resultCurrency || !paymentCurrency || resultCurrency === paymentCurrency;
      if (
        sameCurrency &&
        !amountsMatch(Number(payment.amount), result.amount)
      ) {
        strapi.log.warn(
          `[booking] amount mismatch for ${invoiceNo}: expected ${payment.amount} ${paymentCurrency} got ${result.amount} ${resultCurrency}`,
        );
        await strapi.documents(PAYMENT_UID).update({
          documentId: String(payment.documentId),
          data: {
            ...paymentPatch,
            payment_raw: {
              ...result,
              amountMismatch: true,
              expectedAmount: payment.amount,
            },
          },
        });
        const fresh = await this.persistSettlement(booking);
        return {
          ok: false,
          reason: 'amount_mismatch' as const,
          booking: toPublicBooking(fresh),
        };
      }

      await strapi.documents(PAYMENT_UID).update({
        documentId: String(payment.documentId),
        data: {
          ...paymentPatch,
          status: 'succeeded',
          paid_at: new Date().toISOString(),
        },
      });

      const updated = await this.persistSettlement(booking);

      if (opts.reserveSeats !== false && !updated.seats_reserved) {
        await this.reserveSeats(updated);
      }

      const fresh = await this.findByInvoice(String(booking.invoice_no));
      return {
        ok: true,
        booking: toPublicBooking((fresh || updated) as Record<string, unknown>),
        alreadyProcessed: false,
      };
    }

    if (respCode === '0001' || respCode === '2001' || respCode === '2000') {
      paymentPatch.status = 'pending';
    } else if (isPaymentFailed(respCode)) {
      paymentPatch.status = 'failed';
    }

    await strapi.documents(PAYMENT_UID).update({
      documentId: String(payment.documentId),
      data: paymentPatch,
    });

    const updated = await this.persistSettlement(booking);
    return {
      ok: true,
      booking: toPublicBooking(updated),
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

  async confirmFromFrontend(
    invoiceNo: string,
    email?: string,
    gatewayInvoiceNo?: string,
  ) {
    const booking = await this.resolveBooking(invoiceNo, email);
    if (!booking) {
      throw httpStatusError('Booking not found', 404);
    }

    const settled = await this.persistSettlement(booking);
    const payments: PaymentRecord[] = await this.listPayments(
      String(settled.documentId),
    );
    const pending = payments.filter((item) => item.status === 'pending');
    const remaining = remainingBalance(
      Number(settled.total_amount ?? 0),
      Number(settled.amount_paid ?? 0),
    );

    if (remaining <= 0 && pending.length === 0) {
      return {
        booking: toPublicBooking(settled),
        inquiry: null,
        source: 'local',
      };
    }

    const invoicesToInquire = new Set<string>();
    if (gatewayInvoiceNo) invoicesToInquire.add(gatewayInvoiceNo);
    for (const item of pending) {
      if (item.gateway_invoice_no) {
        invoicesToInquire.add(String(item.gateway_invoice_no));
      }
    }
    if (invoicesToInquire.size === 0) {
      invoicesToInquire.add(String(settled.invoice_no));
    }

    let lastInquiry: Record<string, unknown> | null = null;
    for (const gatewayInvoice of invoicesToInquire) {
      try {
        lastInquiry = await twoc2p.inquirePayment(gatewayInvoice);
        if (lastInquiry) {
          await this.applyPaymentResult(gatewayInvoice, lastInquiry);
        }
      } catch (e) {
        strapi.log.warn(
          `[booking] payment inquiry failed for ${gatewayInvoice}: ${(e as Error).message}`,
        );
      }
    }

    const fresh = await this.findByInvoice(String(settled.invoice_no));
    return {
      booking: toPublicBooking((fresh || settled) as Record<string, unknown>),
      inquiry: lastInquiry,
      source: lastInquiry ? '2c2p_inquiry' : 'local',
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

    return this.applyPaymentResult(invoiceNo, result);
  },
}));
