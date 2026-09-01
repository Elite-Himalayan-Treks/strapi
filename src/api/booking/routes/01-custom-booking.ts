/**
 * booking custom routes (public checkout + 2C2P callbacks)
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/bookings/config',
      handler: 'booking.config',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/bookings/checkout',
      handler: 'booking.checkout',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/bookings/status',
      handler: 'booking.status',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/bookings/payment/confirm',
      handler: 'booking.confirmPayment',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/bookings/pay-balance',
      handler: 'booking.payBalance',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/bookings/payment/callback',
      handler: 'booking.paymentCallback',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
