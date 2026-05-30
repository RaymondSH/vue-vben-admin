import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:message-square-quote',
      order: 0,
      title: 'Agent 问股',
    },
    name: 'Agent',
    path: '/agent',
    children: [
      {
        name: 'AgentChat',
        path: '/agent/chat',
        component: () => import('#/views/agent/chat/index.vue'),
        meta: {
          icon: 'lucide:bot-message-square',
          title: '问股',
        },
      },
    ],
  },
];

export default routes;
