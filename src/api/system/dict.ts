import { defHttp } from '/@/utils/http/axios';
import { getAuthCache } from '/@/utils/auth';
import { DB_DICT_DATA_KEY } from '/@/enums/cacheEnum';

enum Api {
  duplicateCheck = '/sys/duplicate/check',
  dictItemCheck = '/sys/dictItem/dictItemCheck',
  list = '/sys/dict/list',
  save = '/sys/dict/add',
  edit = '/sys/dict/edit',
  getDictItems = '/sys/dict/getDictItem',
  deleteDict = '/sys/dict/delete',
  batchDeleteDict = '/sys/dict/batchDelete',
  refreshCache = '/sys/dict/refreshCache',
  queryAllDictItems = '/sys/dict/queryAllDictItems',
  itemList = '/sys/dictItem/list',
  itemAdd = '/sys/dictItem/add',
  itemEdit = '/sys/dictItem/edit',
  itemDelete = '/sys/dictItem/delete',
}
export function list() {
  return defHttp.get({ url: Api.list });
}

export function deleteDict(id: String, handleSuccess) {
  return defHttp
    .delete({ url: Api.deleteDict, params: { id: id } }, { joinParamsToUrl: true })
    .then(() => handleSuccess());
}

export function batchDeleteDict(params, handleSuccess) {
  return defHttp
    .delete({ url: Api.batchDeleteDict, params }, { joinParamsToUrl: true })
    .then(() => handleSuccess());
}

export function refreshCache() {
  return defHttp.get({ url: Api.refreshCache }, { isTransformResponse: false });
}

export function queryAllDictItems() {
  return defHttp.get({ url: Api.queryAllDictItems }, { isTransformResponse: false });
}

/**
 * 保存或者更新字典
 * @param params
 */
export function saveOrUpdateDict(params, isUpdate: Boolean) {
  if (isUpdate) {
    return defHttp.put({ url: Api.edit, params });
  } else {
    return defHttp.post({ url: Api.save, params });
  }
}

/**
 * 保存或者更新字典
 * @param params
 */
export function saveOrUpdateDictItem(params, isUpdate: Boolean) {
  if (isUpdate) {
    return defHttp.put({ url: Api.itemEdit, params });
  } else {
    return defHttp.post({ url: Api.itemAdd, params });
  }
}

export function itemList(params) {
  return defHttp.get({ url: Api.itemList, params });
}

export function deleteItem(itemId: String, handleSuccess) {
  return defHttp
    .delete({ url: Api.itemDelete, params: { id: itemId } }, { joinParamsToUrl: true })
    .then(() => {
      handleSuccess();
    });
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
export function getDictItemsByCode(code) {
  if (getAuthCache(DB_DICT_DATA_KEY) && getAuthCache<String>(DB_DICT_DATA_KEY)[code]) {
    return getAuthCache<String>(DB_DICT_DATA_KEY)[code];
  }
}
/**
 * 获取字典数组
 * @param dictCode 字典Code
 * @return List<Map>
 */
export function initDictOptions(code) {
  //1.优先从缓存中读取字典配置
  if (getDictItemsByCode(code)) {
    return new Promise((resolve) => {
      resolve(getDictItemsByCode(code));
    });
  }
  //2.获取字典数组
  return defHttp.get({ url: Api.getDictItems + '/' + code });
}
