/**
 * fixed-departure controller
 *
 * `status` is reserved in Strapi 5, so the real attribute is `departure_status`.
 * We alias it back to `status` in REST responses so the frontend contract stays stable.
 */

import { factories } from '@strapi/strapi';

type Entity = Record<string, unknown> | null | undefined;

function withStatusAlias(entity: Entity): Entity {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }

  return {
    ...entity,
    status: entity.departure_status ?? entity.status ?? null,
  };
}

export default factories.createCoreController(
  'api::fixed-departure.fixed-departure',
  () => ({
    async find(ctx) {
      const result = await super.find(ctx);
      if (Array.isArray(result?.data)) {
        result.data = result.data.map((item: Record<string, unknown>) =>
          withStatusAlias(item),
        );
      }
      return result;
    },

    async findOne(ctx) {
      const result = await super.findOne(ctx);
      if (result?.data) {
        result.data = withStatusAlias(result.data);
      }
      return result;
    },
  }),
);
