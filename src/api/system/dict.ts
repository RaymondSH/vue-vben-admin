import { defHttp } from '/@/utils/http/axios';
import { getAuthCache } from '/@/utils/auth';
import { DB_DICT_DATA_KEY } from '/@/enums/cacheEnum';

enum Api {
  duplicateCheck = '/sys/duplicate/check',
  dictItemCheck = '/sys/dictItem/dictItemCheck',
  list = '/sys/dict/list',
  add = '/sys/dict/add',
  edit = '/sys/dict/edit',
  getDictItems = '/sys/dict/getDictItem',
  deleteDict = '',
  batchDeleteDict = '',
  refreshCache = '',
  queryAllDictItems = '',
  itemList = '/sys/dictItem/list',
  itemAdd = '/sys/dictItem/add',
  itemEdit = '/sys/dictItem/edit',
  itemDelete = '/sys/dictItem/delete',
}
export function list() {
  return defHttp.get({ url: Api.list });
}

export function deleteDict() {
  return defHttp.get({ url: Api.deleteDict });
}

export function batchDeleteDict() {
  return defHttp.get({ url: Api.batchDeleteDict });
}

export function refreshCache() {
  return defHttp.get({ url: Api.refreshCache });
}

export function queryAllDictItems() {
  return defHttp.get({ url: Api.queryAllDictItems });
}

/**
 * 保存或者更新字典
 * @param params
 */
export const saveOrUpdateDict = (params, isUpdate: Boolean) => {
  const url = isUpdate ? Api.edit : Api.add;
  return defHttp.post({ url: url, params });
};

/**
 * 保存或者更新字典
 * @param params
 */
export const saveOrUpdateDictItem = (params, isUpdate: Boolean) => {
  const url = isUpdate ? Api.itemEdit : Api.itemAdd;
  return defHttp.post({ url: url, params });
};

export function itemList(params) {
  return defHttp.get({ url: Api.itemList, params });
}

export function deleteItem(id: any, reload?: any) {
  return defHttp.get({ url: Api.itemDelete, params: { id, reload } });
}

export function duplicateCheck(params: any) {
  return defHttp.post({ url: Api.duplicateCheck, params }, { isTransformResponse: false });
}

export function dictItemCheck(params: any) {
  return defHttp.post({ url: Api.dictItemCheck, params }, { isTransformResponse: false });
}

/**
 * 从缓存中获取字典配置
 * @param code
 */
export const getDictItemsByCode = (code) => {
  if (getAuthCache(DB_DICT_DATA_KEY) && getAuthCache<String>(DB_DICT_DATA_KEY)[code]) {
    return getAuthCache<String>(DB_DICT_DATA_KEY)[code];
  }
};
/**
 * 获取字典数组
 * @param dictCode 字典Code
 * @return List<Map>
 */
export const initDictOptions = (code) => {
  //1.优先从缓存中读取字典配置
  if (getDictItemsByCode(code)) {
    return new Promise((resolve) => {
      resolve(getDictItemsByCode(code));
    });
  }
  //2.获取字典数组
  return defHttp.get({ url: Api.getDictItems + '/' + code });
};
