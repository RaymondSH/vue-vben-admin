import type { UserInfo } from '@vben/types';

import { getAuthStatusApi } from './auth';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const status = await getAuthStatusApi();
  return {
    avatar: '',
    desc: status.authEnabled ? 'Daily Stock Analysis admin' : 'Local admin',
    homePath: '/analytics',
    realName: 'Admin',
    roles: ['admin'],
    token: 'cookie-session',
    userId: 'admin',
    username: 'admin',
  } satisfies UserInfo;
}
