import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:activity',
      order: 3,
      title: '回测',
    },
    name: 'Backtest',
    path: '/backtest',
    children: [
      {
        name: 'BacktestOverview',
        path: '/backtest/overview',
        component: () => import('#/views/backtest/overview/index.vue'),
        meta: {
          icon: 'lucide:chart-no-axes-combined',
          title: '回测',
        },
      },
    ],
  },
];

export default routes;
