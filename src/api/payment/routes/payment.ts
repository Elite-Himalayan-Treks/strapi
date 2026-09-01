/**
 * payment core router — admin CRUD only (no public find/create)
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::payment.payment', {
  config: {
    find: {},
    findOne: {},
    create: {},
    update: {},
    delete: {},
  },
  only: ['find', 'findOne', 'create', 'update', 'delete'],
});
