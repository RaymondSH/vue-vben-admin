import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';
import { t } from '/@/hooks/web/useI18n';

const system: AppRouteModule = {
  path: '/system',
  name: 'System',
  component: LAYOUT,
  redirect: '/system/account',
  meta: {
    orderNo: 2000,
    icon: 'ion:settings-outline',
    title: t('routes.demo.system.moduleName'),
  },
  children: [
    {
      path: 'user',
      name: 'UserManagement',
      meta: {
        title: t('routes.demo.system.account'),
        ignoreKeepAlive: false,
      },
      component: () => import('/@/views/system/user/index.vue'),
    },
    {
      path: 'role',
      name: 'RoleManagement',
      meta: {
        title: t('routes.demo.system.role'),
        ignoreKeepAlive: true,
      },
      component: () => import('/@/views/system/role/index.vue'),
    },
    {
      path: 'menu',
      name: 'MenuManagement',
      meta: {
        title: t('routes.demo.system.menu'),
        ignoreKeepAlive: true,
      },
      component: () => import('/@/views/system/menu/index.vue'),
    },
    {
      path: 'dept',
      name: 'DeptManagement',
      meta: {
        title: t('routes.demo.system.dept'),
        ignoreKeepAlive: true,
      },
      component: () => import('/@/views/system/dept/index.vue'),
    },
    {
      path: 'dict',
      name: 'DictManagement',
      meta: {
        title: t('routes.demo.system.dict'),
        ignoreKeepAlive: true,
      },
      component: () => import('/@/views/system/dict/index.vue'),
    },
  ],
};

export default system;
