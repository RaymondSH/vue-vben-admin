import { defHttp } from '/@/utils/http/axios';
import { Modal } from 'ant-design-vue';

enum Api {
  list = '/sys/role/list',
  save = '/sys/role/add',
  edit = '/sys/role/edit',
  delete = 'sys/role/delete',
  isRoleExist = '/sys/role/checkRoleCode',
  deleteBatch = '/sys/role/deleteBatch',
  getAllRoles = '/sys/role/getAllRoles',
  getRoleUserList = '/sys/userRole/getRoleUserList',
  getUserListByRole = '/sys/userRole/getUserListByRole',
  addUserRole = '/sys/userRole/addUserRole',
  deleteUserRole = '/sys/userRole/deleteUserRole',
  batchDeleteUserRole = '/sys/userRole/batchDeleteUserRole',
  getRolePermissionTreeList = '/sys/rolePermission/getRolePermissionTreeList',
  getRolePermission = '/sys/rolePermission/getRolePermission',
  saveRolePermission = '/sys/rolePermission/saveRolePermission',
}

/**
 * 获取角色列表
 */
export function getRoleList(params?: any) {
  return defHttp.get({ url: Api.list, params });
}

export function getAllRoles() {
  return defHttp.get({ url: Api.getAllRoles });
}

/**
 * 检查角色编码是否存在
 * @param params
 */
export function isRoleExist(params) {
  return defHttp.get({ url: Api.isRoleExist, params }, { isTransformResponse: false });
}

/**
 * 新增或者保存角色
 * @param params
 * @param isUpdate
 */
export function saveOrUpdateRole(params, isUpdate) {
  const url = isUpdate ? Api.edit : Api.save;
  return defHttp.post({ url: url, params });
}

/**
 * 删除角色
 */
export function deleteRole(params, handleSuccess) {
  return defHttp.delete({ url: Api.delete, params }, { joinParamsToUrl: true }).then(() => {
    handleSuccess();
  });
}

/**
 * 批量删除角色
 * @param params
 */
export function batchDeleteRole(params, handleSuccess) {
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
 * 获取该角色下的用户
 * @param params
 */
export function getRoleUserList(params?: any) {
  return defHttp.get({ url: Api.getRoleUserList, params });
}

export function getUserListByRole(params?: any) {
  return defHttp.get({ url: Api.getUserListByRole, params });
}

/**
 * 将多个用户和某个角色进行绑定
 * @param params
 * @param handleSuccess
 */
export function addUserRole(params, reload) {
  return defHttp.post({ url: Api.addUserRole, params }, { joinParamsToUrl: true }).then(() => {
    reload();
  });
}

/**
 * 删除某个角色下的某个用户
 * @param params
 */
export function deleteUserRole(params, reload) {
  return defHttp.delete({ url: Api.deleteUserRole, params }, { joinParamsToUrl: true }).then(() => {
    reload();
  });
}

/**
 * 同时删除某个角色下的多个用户
 * @param params
 */
export function batchDeleteUserRole(params, reload) {
  return defHttp
    .delete({ url: Api.batchDeleteUserRole, params }, { joinParamsToUrl: true })
    .then(() => {
      reload();
    });
}

/**
 * 获取该角色的权限列表
 * @param params
 */
export function getRolePermissionTreeList(params?: any) {
  return defHttp.get({ url: Api.getRolePermissionTreeList, params });
}

/**
 * 查询当前角色拥有的菜单
 * @param params
 */
export function getRolePermission(params?: any) {
  return defHttp.get({ url: Api.getRolePermission, params });
}

/**
 * 保存角色和权限关系
 * @param params
 */
export function saveRolePermission(params?: any) {
  return defHttp.post({ url: Api.saveRolePermission, params });
}
