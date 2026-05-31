import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 5,
      title: '设置',
    },
    name: 'Settings',
    path: '/settings',
    children: [
      {
        name: 'SystemSettings',
        path: '/settings/system',
        component: () => import('#/views/settings/system/index.vue'),
        meta: {
          icon: 'lucide:sliders-horizontal',
          title: '配置管理',
        },
      },
    ],
  },
];

export default routes;
