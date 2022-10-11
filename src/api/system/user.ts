import { defHttp } from '/@/utils/http/axios';
import { LoginParams, LoginResultModel, GetUserInfoModel } from './model/userModel';

import { ErrorMessageMode } from '/#/axios';

enum Api {
  login = '/login',
  list = '/sys/user/list',
  logout = '/sys/user/logout',
  getUserInfo = '/sys/user/getUserInfo',
  save = '/sys/user/add',
  edit = '/sys/user/edit',
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
 * @description: 登录之后获取用户信息
 */
export function getUserInfo() {
  return defHttp.get<GetUserInfoModel>({ url: Api.getUserInfo }, { errorMessageMode: 'none' });
}

/**
 * 新增或者更新用户信息
 * @param params
 * @param isUpdate
 */
export function saveOrUpdateUser(params, isUpdate: Boolean) {
  if (isUpdate) {
    return defHttp.put({ url: Api.edit, params });
  } else {
    return defHttp.post({ url: Api.save, params });
  }
}

/**
 * 退出登录
 */
export function doLogout() {
  return defHttp.get({ url: Api.logout });
}

/**
 * 获取用户列表
 */
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
