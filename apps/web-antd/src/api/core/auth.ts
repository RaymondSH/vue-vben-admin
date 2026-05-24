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
  await requestClient.post<{ ok: boolean }>('/auth/login', data);
  return {
    accessToken: 'cookie-session',
  };
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  const status = await getAuthStatusApi();
  return status.loggedIn ? 'cookie-session' : '';
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
