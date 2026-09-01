/**
 * booking controller — public checkout + payment webhooks
 */

import { factories } from '@strapi/strapi';
import twoc2p from '../services/twoc2p';

function httpError(
  ctx: {
    status: number;
    body: unknown;
  },
  err: unknown,
) {
  const e = err as Error & { status?: number };
  const status =
    typeof e.status === 'number' && e.status >= 400 && e.status < 600
      ? e.status
      : 500;
  const message = e.message || 'Unexpected error';
  ctx.status = status;
  ctx.body = {
    data: null,
    error: {
      status,
      name: status === 502 ? 'BadGatewayError' : 'ApplicationError',
      message,
    },
  };
}

export default factories.createCoreController(
  'api::booking.booking',
  ({ strapi }) => ({
    /**
     * POST /api/bookings/checkout
     * Create booking + request 2C2P payment token.
     */
    async checkout(ctx) {
      try {
        const body = (ctx.request.body?.data ?? ctx.request.body ?? {}) as Record<
          string,
          unknown
        >;

        const customer = (body.customer || {}) as Record<string, unknown>;
        const result = await strapi.service('api::booking.booking').createCheckout({
          tripDocumentId: String(body.tripDocumentId || body.trip || ''),
          departureDocumentId: body.departureDocumentId
            ? String(body.departureDocumentId)
            : body.departure
              ? String(body.departure)
              : undefined,
          startDate: body.startDate ? String(body.startDate) : undefined,
          participants: Number(body.participants ?? 1),
          paymentType:
            body.paymentType === 'deposit' ? 'deposit' : 'full',
          customer: {
            name: String(customer.name || ''),
            email: String(customer.email || ''),
            phone: customer.phone ? String(customer.phone) : undefined,
            country: customer.country ? String(customer.country) : undefined,
          },
          specialRequests: body.specialRequests
            ? String(body.specialRequests)
            : undefined,
          sourcePage: body.sourcePage ? String(body.sourcePage) : undefined,
          frontendReturnUrl: body.frontendReturnUrl
            ? String(body.frontendReturnUrl)
            : undefined,
          locale: body.locale ? String(body.locale) : undefined,
        });

        ctx.body = { data: result };
      } catch (err) {
        httpError(ctx, err);
      }
    },

    /**
     * GET /api/bookings/status?invoiceNo=&email=
     */
    async status(ctx) {
      try {
        const invoiceNo = String(
          ctx.query.invoiceNo || ctx.query.invoice_no || '',
        );
        const email = ctx.query.email
          ? String(ctx.query.email)
          : undefined;

        if (!invoiceNo || !email) {
          return ctx.badRequest('invoiceNo and email are required');
        }

        const booking = await strapi
          .service('api::booking.booking')
          .findByInvoice(invoiceNo, email);

        if (!booking) {
          return ctx.notFound('Booking not found');
        }

        const settled = await strapi
          .service('api::booking.booking')
          .persistSettlement(booking);

        ctx.body = {
          data: strapi.service('api::booking.booking').toPublicBooking(settled),
        };
      } catch (err) {
        httpError(ctx, err);
      }
    },

    /**
     * POST /api/bookings/payment/confirm
     * After frontend return from 2C2P — inquire and sync status.
     */
    async confirmPayment(ctx) {
      try {
        const body = (ctx.request.body?.data ?? ctx.request.body ?? {}) as Record<
          string,
          unknown
        >;

        let gatewayInvoiceNo: string | undefined;

        // Frontend may forward the JWT paymentResponse from 2C2P redirect
        if (body.paymentResponse || body.payload) {
          try {
            const decoded = twoc2p.decodeIncomingPayload(
              body as Record<string, unknown>,
            );
            if (decoded.invoiceNo) {
              gatewayInvoiceNo = String(decoded.invoiceNo);
              // Frontend codes like 2000 mean "inquire for full info"
              if (decoded.respCode && decoded.respCode !== '2000') {
                await strapi
                  .service('api::booking.booking')
                  .applyPaymentResult(gatewayInvoiceNo, decoded);
              }
            }
          } catch (e) {
            strapi.log.warn(
              `[booking] frontend paymentResponse decode failed: ${(e as Error).message}`,
            );
          }
        }

        const invoiceNo = String(
          body.invoiceNo || body.invoice_no || ctx.query.invoiceNo || '',
        );
        const email = body.email
          ? String(body.email)
          : ctx.query.email
            ? String(ctx.query.email)
            : undefined;

        if (!invoiceNo) {
          return ctx.badRequest('invoiceNo is required');
        }

        const result = await strapi
          .service('api::booking.booking')
          .confirmFromFrontend(invoiceNo, email, gatewayInvoiceNo);

        ctx.body = { data: result };
      } catch (err) {
        httpError(ctx, err);
      }
    },

    /**
     * POST /api/bookings/pay-balance
     * Start a 2C2P checkout for remaining balance on a deposit booking.
     */
    async payBalance(ctx) {
      try {
        const body = (ctx.request.body?.data ?? ctx.request.body ?? {}) as Record<
          string,
          unknown
        >;
        const invoiceNo = String(
          body.invoiceNo || body.invoice_no || '',
        ).trim();
        const email = String(body.email || '').trim();

        if (!invoiceNo || !email) {
          return ctx.badRequest('invoiceNo and email are required');
        }

        const result = await strapi.service('api::booking.booking').payBalance({
          invoiceNo,
          email,
          frontendReturnUrl: body.frontendReturnUrl
            ? String(body.frontendReturnUrl)
            : undefined,
          locale: body.locale ? String(body.locale) : undefined,
        });

        ctx.body = { data: result };
      } catch (err) {
        httpError(ctx, err);
      }
    },

    /**
     * POST /api/bookings/payment/callback
     * 2C2P backend notification (auth: false).
     */
    async paymentCallback(ctx) {
      try {
        const body = ctx.request.body;
        const applied = await strapi
          .service('api::booking.booking')
          .handlePaymentCallback(body);

        // 2C2P expects HTTP 200
        ctx.status = 200;
        ctx.body = { ok: Boolean(applied?.ok) };
      } catch (err) {
        strapi.log.error(
          `[booking] payment callback error: ${(err as Error).message}`,
        );
        // Still 200 to avoid endless retries for bad payloads in some cases;
        // return 400 for clearly invalid payloads.
        ctx.status = 400;
        ctx.body = { ok: false, error: (err as Error).message };
      }
    },

    /**
     * GET /api/bookings/config
     * Public payment config for the checkout UI (no secrets).
     */
    async config(ctx) {
      ctx.body = { data: twoc2p.getTwoc2pPublicConfig() };
    },
  }),
);
