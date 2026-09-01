import type { Core } from '@strapi/strapi';

type CmSettingsPatch = {
  mainField: string;
  defaultSortBy: string;
  defaultSortOrder: 'ASC' | 'DESC';
  nonSortableFields?: string[];
};

/**
 * Content Manager crashes when defaultSortBy / list sorting uses a relation
 * (Strapi parses `trip:ASC` incorrectly → "Attribute asc not found").
 * Keep scalar mainField + defaultSortBy for the affected types.
 */
const CONTENT_MANAGER_FIXES: Record<string, CmSettingsPatch> = {
  'api::inquiry.inquiry': {
    mainField: 'name',
    defaultSortBy: 'name',
    defaultSortOrder: 'ASC',
    nonSortableFields: ['trip'],
  },
  'api::fixed-departure.fixed-departure': {
    mainField: 'start_date',
    defaultSortBy: 'start_date',
    defaultSortOrder: 'ASC',
    nonSortableFields: ['trip'],
  },
  'api::booking.booking': {
    mainField: 'invoice_no',
    defaultSortBy: 'invoice_no',
    defaultSortOrder: 'DESC',
    nonSortableFields: ['trip', 'departure', 'payments'],
  },
  'api::payment.payment': {
    mainField: 'gateway_invoice_no',
    defaultSortBy: 'gateway_invoice_no',
    defaultSortOrder: 'DESC',
    nonSortableFields: ['booking'],
  },
  'api::newsletter.newsletter': {
    mainField: 'email',
    defaultSortBy: 'email',
    defaultSortOrder: 'ASC',
  },
  'api::office.office': {
    mainField: 'city',
    defaultSortBy: 'city',
    defaultSortOrder: 'ASC',
  },
  'api::review.review': {
    mainField: 'reviewer_name',
    defaultSortBy: 'reviewer_name',
    defaultSortOrder: 'ASC',
  },
};

async function ensureContentManagerConfigs(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'content_manager' });

  for (const [uid, patch] of Object.entries(CONTENT_MANAGER_FIXES)) {
    const key = `configuration_content_types::${uid}`;
    const current = (await store.get({ key })) as Record<string, unknown> | null;
    if (!current || typeof current !== 'object') {
      continue;
    }

    const settings = {
      ...((current.settings as Record<string, unknown>) || {}),
      mainField: patch.mainField,
      defaultSortBy: patch.defaultSortBy,
      defaultSortOrder: patch.defaultSortOrder,
    };

    const metadatas = {
      ...((current.metadatas as Record<string, Record<string, unknown>>) || {}),
    };

    for (const field of patch.nonSortableFields || []) {
      const meta = metadatas[field] || {};
      const list = {
        ...((meta.list as Record<string, unknown>) || {}),
        sortable: false,
        searchable: false,
      };
      metadatas[field] = { ...meta, list };
    }

    const next = { ...current, settings, metadatas };
    const changed = JSON.stringify(current) !== JSON.stringify(next);
    if (changed) {
      await store.set({ key, value: next });
      strapi.log.info(`[bootstrap] Fixed Content Manager config for ${uid}`);
    }
  }
}

async function ensureBookingPublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    return;
  }

  const actions = [
    'api::booking.booking.checkout',
    'api::booking.booking.status',
    'api::booking.booking.confirmPayment',
    'api::booking.booking.payBalance',
    'api::company.company.find',
  ];

  const existing = await strapi
    .query('plugin::users-permissions.permission')
    .findMany({ where: { role: publicRole.id } });
  const existingActions = new Set(existing.map((p: { action: string }) => p.action));

  for (const action of actions) {
    if (existingActions.has(action)) continue;
    await strapi.query('plugin::users-permissions.permission').create({
      data: { action, role: publicRole.id },
    });
    strapi.log.info(`[bootstrap] Granted Public permission: ${action}`);
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureContentManagerConfigs(strapi);
    await ensureBookingPublicPermissions(strapi);
  },
};
