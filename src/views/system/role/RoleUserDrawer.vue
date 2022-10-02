<template>
  <BasicDrawer @register="registerBaseDrawer" title="角色用户" width="800" destroyOnClose>
    <BasicTable @register="registerTable" :rowSelection="rowSelection">
      <template #tableTitle>
        <a-button type="primary" @click="handleSelect"> 已有用户</a-button>
        <a-dropdown v-if="checkedKeys.length > 0">
          <template #overlay>
            <a-menu>
              <a-menu-item key="1" @click="batchHandleDelete">
                <Icon icon="ant-design:delete-outlined" />
                删除
              </a-menu-item>
            </a-menu>
          </template>
          <a-button
            >批量操作
            <Icon icon="ant-design:down-outlined" />
          </a-button>
        </a-dropdown>
      </template>
      <template #action="{ record }">
        <TableAction :actions="getTableAction(record)" />
      </template>
    </BasicTable>
    <!--用户选择弹窗-->
    <UserSelectModal @register="userSelectModal" @select="selectOk" />
  </BasicDrawer>
</template>
<script lang="ts" setup>
  import { ref } from 'vue';
  import { BasicTable, useTable, TableAction } from '/@/components/Table';
  import { BasicDrawer, useDrawerInner } from '/@/components/Drawer';
  import { useModal } from '/@/components/Modal';
  import UserSelectModal from './UserSelectModal.vue';
  import {
    getRoleUserList,
    deleteUserRole,
    batchDeleteUserRole,
    addUserRole,
  } from '/@/api/system/role';
  import { userColumns, searchUserFormSchema } from './roleForm';

  const checkedKeys = ref<Array<string | number>>([]);
  const roleId = ref('');
  const [registerBaseDrawer] = useDrawerInner(async (data) => {
    roleId.value = data.id;
    setProps({ searchInfo: { roleId: data.id } });
    reload();
  });
  //注册drawer
  const [userSelectModal, { openModal }] = useModal();
  const [registerTable, { reload, setProps }] = useTable({
    title: '用户列表',
    api: getRoleUserList,
    columns: userColumns,
    formConfig: {
      labelWidth: 120,
      schemas: searchUserFormSchema,
      autoSubmitOnEnter: true,
      actionColOptions: { pull: 1 },
    },
    striped: true,
    useSearchForm: true,
    showTableSetting: true,
    clickToRowSelect: false,
    bordered: true,
    showIndexColumn: false,
    tableSetting: { fullScreen: true },
    canResize: false,
    rowKey: 'id',
    actionColumn: {
      width: 50,
      title: '操作',
      dataIndex: 'action',
      slots: { customRender: 'action' },
      fixed: undefined,
    },
  });

  /**
   * 选择列配置
   */
  const rowSelection = {
    type: 'checkbox',
    columnWidth: 50,
    selectedRowKeys: checkedKeys,
    onChange: onSelectChange,
  };

  /**
   * 选择事件
   */
  function onSelectChange(selectedRowKeys: (string | number)[]) {
    checkedKeys.value = selectedRowKeys;
  }
  /**
   * 删除事件
   */
  async function handleDelete(record) {
    await deleteUserRole({ userId: record.id, roleId: roleId.value }, reload);
  }

  /**
   * 批量删除事件
   */
  async function batchHandleDelete() {
    await batchDeleteUserRole(
      { userIds: checkedKeys.value.join(','), roleId: roleId.value },
      reload,
    );
  }

  /**
   * 选择已有用户
   */
  function handleSelect() {
    openModal(true);
  }
  /**
   * 添加已有用户
   */
  async function selectOk(userIds) {
    await addUserRole({ roleId: roleId.value, userIds: userIds }, reload);
  }
  /**
   * 操作栏
   */
  function getTableAction(record) {
    return [
      {
        label: '删除',
        popConfirm: {
          title: '是否确认删除',
          confirm: handleDelete.bind(null, record),
        },
      },
    ];
  }
</script>
