import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:briefcase-business',
      order: 2,
      title: '持仓',
    },
    name: 'Portfolio',
    path: '/portfolio',
    children: [
      {
        name: 'PortfolioOverview',
        path: '/portfolio/overview',
        component: () => import('#/views/portfolio/overview/index.vue'),
        meta: {
          icon: 'lucide:wallet-cards',
          title: '持仓',
        },
      },
    ],
  },
];

export default routes;
