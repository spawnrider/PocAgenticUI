'use strict';

// Seed DEV uniquement (SEED_DEV=true) : token API lecture seule à valeur fixe + écran "home".
module.exports = {
  register() {},
  async bootstrap({ strapi }) {
    if (process.env.SEED_DEV !== 'true') return;

    const accessKey = process.env.STRAPI_API_TOKEN;
    if (accessKey) {
      const tokens = strapi.service('admin::api-token');
      const exists = await strapi.db.query('admin::api-token').findOne({ where: { name: 'bff-read' } });
      if (!exists) {
        await strapi.db.query('admin::api-token').create({
          data: { name: 'bff-read', description: 'BFF (dev)', type: 'read-only', lifespan: null, expiresAt: null, accessKey: tokens.hash(accessKey) },
        });
        strapi.log.info('seed: token API bff-read créé');
      }
    }

    const found = await strapi.documents('api::screen.screen').findMany({ filters: { slug: 'home' } });
    if (found.length === 0) {
      await strapi.documents('api::screen.screen').create({
        status: 'published',
        data: {
          slug: 'home',
          title: 'Accueil',
          sections: [
            { __component: 'sections.text', text: 'Bienvenue sur le POC omnicanal.' },
            { __component: 'sections.banner', title: 'Offre du moment', body: '-20 % sur les cartes gold', flagKey: 'screen.home.offer-banner' },
          ],
        },
      });
      strapi.log.info('seed: écran home créé');
    }
  },
};
