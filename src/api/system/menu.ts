import { defHttp } from '/@/utils/http/axios';
import { getMenuListResultModel } from '/@/api/system/model/menuModel';
import { Modal } from 'ant-design-vue';

enum Api {
  list = '/sys/permission/list',
  save = '/sys/permission/add',
  edit = '/sys/permission/edit',
  delete = '/sys/permission/delete',
  deleteBatch = '/sys/permission/deleteBatch',
  getMenuList = '/sys/permission/getMenuList',
  getPermCode = '/sys/permission/getPermCode',
}

export function getMenuList() {
  return defHttp.get<getMenuListResultModel>({ url: Api.getMenuList });
}

/**
 * 列表接口
 * @param params
 */
export function getPermissionList() {
  return defHttp.get({ url: Api.list });
}

export function getPermCode() {
  return defHttp.get<string[]>({ url: Api.getPermCode });
}

/**
 * 删除菜单
 */
export function deleteMenu(params, handleSuccess) {
  return defHttp.delete({ url: Api.delete, params }, { joinParamsToUrl: true }).then(() => {
    handleSuccess();
  });
}
/**
 * 批量删除菜单
 * @param params
 */
export function batchDeleteMenu(params, handleSuccess) {
  Modal.confirm({
    title: '确认删除',
    content: '是否删除选中数据',
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      return defHttp
        .delete({ url: Api.deleteBatch, data: params }, { joinParamsToUrl: true })
        .then(() => {
          handleSuccess();
        });
    },
  });
}
/**
 * 保存或者更新菜单
 * @param params
 */
export function saveOrUpdateMenu(params, isUpdate) {
  const url = isUpdate ? Api.edit : Api.save;
  return defHttp.post({ url: url, params });
}
