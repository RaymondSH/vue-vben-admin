import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

interface BackendUser {
  id: number;
  isActive: boolean;
  mustChangePassword: boolean;
  role: string;
  username: string;
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const user = await requestClient.get<BackendUser>('/auth/me');
  return {
    avatar: '',
    desc: 'Daily Stock Analysis admin',
    homePath: '/workspace',
    realName: user.username,
    roles: [user.role],
    token: '',
    userId: String(user.id),
    username: user.username,
  } satisfies UserInfo;
}
