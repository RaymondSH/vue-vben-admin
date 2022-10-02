import { defHttp } from '/@/utils/http/axios';
import { LoginParams, LoginResultModel, GetUserInfoModel } from './model/userModel';

import { ErrorMessageMode } from '/#/axios';

enum Api {
  login = '/login',
  list = '/sys/user/list',
  logout = '/sys/user/logout',
  getUserInfo = '/sys/user/getUserInfo',
  testRetry = '/testRetry',
}

/**
 * @description: user login api
 */
export function loginApi(params: LoginParams, mode: ErrorMessageMode = 'modal') {
  return defHttp.post<LoginResultModel>(
    {
      url: Api.login,
      params,
    },
    {
      errorMessageMode: mode,
    },
  );
}

/**
 * @description: getUserInfo
 */
export function getUserInfo() {
  return defHttp.get<GetUserInfoModel>({ url: Api.getUserInfo }, { errorMessageMode: 'none' });
}

export function doLogout() {
  return defHttp.get({ url: Api.logout });
}

export function getUserList() {
  return defHttp.get({ url: Api.list });
}

export function testRetry() {
  return defHttp.get(
    { url: Api.testRetry },
    {
      retryRequest: {
        isOpenRetry: true,
        count: 5,
        waitTime: 1000,
      },
    },
  );
}
