import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:bell-ring',
      order: 3,
      title: '告警中心',
    },
    name: 'Alerts',
    path: '/alerts',
    children: [
      {
        name: 'AlertsCenter',
        path: '/alerts/center',
        component: () => import('#/views/alerts/center/index.vue'),
        meta: {
          icon: 'lucide:radar',
          title: '告警',
        },
      },
    ],
  },
];

export default routes;
