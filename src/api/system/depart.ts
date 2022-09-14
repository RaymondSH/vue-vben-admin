import { defHttp } from '/@/utils/http/axios';
import { useMessage } from '/@/hooks/web/useMessage';
const { createConfirm } = useMessage();

enum Api {
  listAllDepart = '/sys/depart/listAllDepart',
  save = '/sys/depart/add',
  edit = '/sys/depart/edit',
  deleteBatch = '/sys/depart/deleteDeparts',
}

/**
 * 保存或者更新部门角色
 */
export const saveOrUpdateDepart = (params, isUpdate) => {
  if (isUpdate) {
    return defHttp.put({ url: Api.edit, params });
  } else {
    return defHttp.post({ url: Api.save, params });
  }
};


/**
 * 获取全部部门树列表
 */
export const listAllDepart = () => {
  return defHttp.get({ url: Api.listAllDepart });
};

/**
 * 批量删除部门角色
 */
export const deleteDeparts = (params, confirm = false) => {
  return new Promise((resolve, reject) => {
    const doDelete = () => {
      resolve(defHttp.delete({ url: Api.deleteBatch, params }, { joinParamsToUrl: true }));
    };
    if (confirm) {
      createConfirm({
        iconType: 'warning',
        title: '删除',
        content: '确定要删除吗？',
        onOk: () => doDelete(),
        onCancel: () => reject(),
      });
    } else {
      doDelete();
    }
  });
};
