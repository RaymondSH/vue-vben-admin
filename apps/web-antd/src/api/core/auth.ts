import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    user: {
      id: number;
      isActive: boolean;
      mustChangePassword: boolean;
      role: string;
      username: string;
    };
  }

  export interface RefreshTokenResult {
    accessToken: string;
    refreshToken: string;
  }

  export interface AuthStatus {
    authEnabled: boolean;
    loggedIn: boolean;
    passwordChangeable: boolean;
    passwordSet: boolean;
    setupState: 'enabled' | 'no_password' | 'password_retained';
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  const accessStore = useAccessStore();
  if (!accessStore.refreshToken) {
    return '';
  }
  const result = await requestClient.post<AuthApi.RefreshTokenResult>(
    '/auth/refresh',
    {
      refreshToken: accessStore.refreshToken,
    },
  );
  accessStore.setRefreshToken(result.refreshToken);
  return result.accessToken;
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post<{ ok: boolean }>('/auth/logout');
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  const status = await getAuthStatusApi();
  return status.loggedIn || !status.authEnabled ? ['admin'] : [];
}

/**
 * 获取认证状态
 */
export async function getAuthStatusApi() {
  return requestClient.get<AuthApi.AuthStatus>('/auth/status');
}
