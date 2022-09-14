<template>
  <BasicTable @register="registerTable" :rowSelection="rowSelection">
    <!--插槽:table标题-->
    <template #tableTitle>
      <a-button type="primary" preIcon="ant-design:plus-outlined" @click="handleCreate">
        新增</a-button
      >
      <a-dropdown v-if="selectedRowKeys.length > 0">
        <template #overlay>
          <a-menu>
            <a-menu-item key="1" @click="handleBatchDelete">
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
    <!--操作栏-->
    <template #action="{ record }">
      <TableAction :actions="getTableAction(record)" />
    </template>
  </BasicTable>
  <!--角色编辑-->
  <RoleModal @register="roleModal" @success="reload" :showFooter="showFooter" />
  <!--角色用户表格-->
  <RoleUserDrawer @register="roleUserDrawer" />
  <!--角色菜单授权抽屉-->
  <RolePermissionDrawer @register="rolePermissionDrawer" />
</template>
<script lang="ts" setup>
  //ts语法
  import { BasicTable, TableAction } from '/@/components/Table';
  import { useDrawer } from '/@/components/Drawer';
  import { useModal } from '/@/components/Modal';
  import RoleModal from './RoleModal.vue';
  import RolePermissionDrawer from './RolePermissionDrawer.vue';
  import RoleUserDrawer from './RoleUserDrawer.vue';
  import { columns, searchFormSchema } from './roleForm';
  import { batchDeleteRole, deleteRole, getRoleList } from '/@/api/system/role';
  const showFooter = ref(true);
  const [roleUserDrawer, { openDrawer: openRoleUserDrawer }] = useDrawer();
  const [rolePermissionDrawer, { openDrawer: openRolePermissionDrawer }] = useDrawer();
  const [roleModal, { openModal }] = useModal();
  import { useListPage } from '/@/hooks/system/useListPage';
  import { ref } from 'vue';

  // 列表页面公共参数、方法
  const { prefixCls, tableContext, onExportXls, onImportXls } = useListPage({
    tableProps: {
      title: '数据字典',
      api: getRoleList,
      columns: columns,
      formConfig: {
        schemas: searchFormSchema,
      },
      actionColumn: {
        width: 240,
      },
    },
  });

  //注册table数据
  const [registerTable, { reload, updateTableDataRecord }, { rowSelection, selectedRowKeys }] =
    tableContext;

  /**
   * 新增事件
   */
  function handleCreate() {
    openModal(true, {
      isUpdate: false,
    });
  }
  /**
   * 编辑事件
   */
  async function handleEdit(record: Recordable) {
    openModal(true, {
      record,
      isUpdate: true,
    });
  }
  /**
   * 删除事件
   */
  async function handleDelete(record) {
    await deleteRole({ id: record.id }, reload);
  }

  /**
   * 批量删除
   */
  async function handleBatchDelete() {
    await batchDeleteRole({ ids: selectedRowKeys.value }, reload);
  }

  async function handlePermission(record) {
    openRolePermissionDrawer(true, { roleId: record.id });
  }

  /**
   * 角色用户
   */
  function handleRoleUser(record) {
    openRoleUserDrawer(true, record);
  }
  /**
   * 成功回调
   */
  function handleSuccess({ isUpdate, values }) {
    if (isUpdate) {
      updateTableDataRecord(values.id, values);
    } else {
      reload();
    }
  }
  /**
   * 操作栏
   */
  /**
   * 操作栏
   */
  function getTableAction(record) {
    return [
      {
        label: '用户',
        onClick: handleRoleUser.bind(null, record),
      },
      {
        label: '授权',
        onClick: handlePermission.bind(null, record),
      },
      {
        label: '编辑',
        onClick: handleEdit.bind(null, record),
      },
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

<style scoped></style>
