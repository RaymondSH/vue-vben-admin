<template>
  <div>
    <!--引用表格-->
    <BasicTable @register="registerTable" :rowSelection="rowSelection">
      <!--插槽:table标题-->
      <template #tableTitle>
        <a-button type="primary" preIcon="ant-design:plus-outlined" @click="handleCreate">
          新增</a-button
        >
        <a-dropdown v-if="selectedRowKeys.length > 0">
          <template #overlay>
            <a-menu>
              <a-menu-item key="1" @click="batchHandleDelete">
                <Icon icon="ant-design:delete-outlined" />
                删除
              </a-menu-item>
              <a-menu-item key="2" @click="batchFrozen(2)">
                <Icon icon="ant-design:lock-outlined" />
                冻结
              </a-menu-item>
              <a-menu-item key="3" @click="batchFrozen(1)">
                <Icon icon="ant-design:unlock-outlined" />
                解冻
              </a-menu-item>
            </a-menu>
          </template>
          <a-button
            >批量操作
            <Icon icon="mdi:chevron-down" />
          </a-button>
        </a-dropdown>
      </template>
      <!--操作栏-->
      <template #action="{ record }">
        <TableAction
          :actions="getTableAction(record)"
          :dropDownActions="getDropDownAction(record)"
        />
      </template>
    </BasicTable>
    <!--用户抽屉-->
    <UserDrawer @register="userDrawer" @success="handleSuccess" />
  </div>
</template>
<script lang="ts">
  export default {
    name: 'SystemUser',
  };
</script>
<script lang="ts" setup>
  //ts语法
  import { BasicTable, TableAction, ActionItem } from '/@/components/Table';
  import UserDrawer from './UserDrawer.vue';
  import { useDrawer } from '/@/components/Drawer';
  import { useListPage } from '/@/hooks/system/useListPage';
  import { columns, searchFormSchema } from './userForm';
  import { getUserList } from '/@/api/system/user';

  //注册drawer
  const [userDrawer, { openDrawer }] = useDrawer();

  // 列表页面公共参数、方法
  const { prefixCls, tableContext, onExportXls, onImportXls } = useListPage({
    designScope: 'user-list',
    tableProps: {
      title: '用户列表',
      api: getUserList,
      columns: columns,
      size: 'small',
      formConfig: {
        labelWidth: 200,
        schemas: searchFormSchema,
      },
      actionColumn: {
        width: 120,
      },
      beforeFetch: (params) => {
        console.log(params);
        return Object.assign({ column: 'createTime', order: 'desc' }, params);
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
    openDrawer(true, {
      isUpdate: false,
      showFooter: true,
    });
  }
  /**
   * 编辑事件
   */
  async function handleEdit(record: Recordable) {
    openDrawer(true, {
      record,
      isUpdate: true,
      showFooter: true,
    });
  }
  /**
   * 详情
   */
  async function handleDetail(record: Recordable) {
    openDrawer(true, {
      record,
      isUpdate: true,
      showFooter: false,
    });
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
  function getTableAction(record): ActionItem[] {
    return [
      {
        label: '编辑',
        onClick: handleEdit.bind(null, record),
        // ifShow: () => hasPermission('user:edit'),
      },
    ];
  }
  /**
   * 下拉操作栏
   */
  function getDropDownAction(record): ActionItem[] {
    return [
      {
        label: '详情',
        onClick: handleDetail.bind(null, record),
      },
      // {
      //   label: '密码',
      //   onClick: handleChangePassword.bind(null, record.username),
      // },
      {
        label: '删除',
      },
      {
        label: '冻结',
        ifShow: record.status == 1,
        // popConfirm: {
        //   title: '确定冻结吗?',
        //   confirm: handleFrozen.bind(null, record, 2),
        // },
      },
      {
        label: '解冻',
        // ifShow: record.status == 2,
        // popConfirm: {
        //   title: '确定解冻吗?',
        //   confirm: handleFrozen.bind(null, record, 1),
        // },
      },
      {
        label: '代理人',
        // onClick: handleAgentSettings.bind(null, record.username),
      },
    ];
  }
</script>

<style scoped></style>
