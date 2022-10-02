<template>
  <!--引用表格-->
  <BasicTable @register="registerTable" :rowSelection="rowSelection">
    <!--插槽:table标题-->
    <template #tableTitle>
      <a-button type="primary" preIcon="ant-design:plus-outlined" @click="handleCreate">
        新增</a-button
      >
      <a-button type="primary" @click="handlerRefreshCache" preIcon="ant-design:sync-outlined">
        刷新缓存</a-button
      >
      <a-dropdown v-if="selectedRowKeys.length > 0">
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
    <!--操作栏-->
    <template #action="{ record }">
      <TableAction :actions="getTableAction(record)" />
    </template>
  </BasicTable>
  <!-- 字典弹窗-->
  <DictModal @register="registerModal" @success="handleSuccess" />
  <!--字典配置抽屉-->
  <DictItemList @register="registerDrawer" />
</template>

<script lang="ts" setup>
  //ts语法
  import { BasicTable, TableAction } from '/@/components/Table';
  import DictModal from './DictModal.vue';
  import DictItemList from './DictItemList.vue';
  import { useDrawer } from '/@/components/Drawer';
  import { useModal } from '/@/components/Modal';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { clearAuthCache, setAuthCache } from '/@/utils/auth';
  import { columns, searchFormSchema } from './dictForm';
  import {
    list,
    deleteDict,
    batchDeleteDict,
    refreshCache,
    queryAllDictItems,
  } from '/@/api/system/dict';
  import { DB_DICT_DATA_KEY } from '/@/enums/cacheEnum';

  const { createMessage } = useMessage();
  //字典model
  const [registerModal, { openModal }] = useModal();
  //字典配置drawer
  const [registerDrawer, { openDrawer }] = useDrawer();
  import { useListPage } from '/@/hooks/system/useListPage';

  // 列表页面公共参数、方法
  const { prefixCls, tableContext, onExportXls, onImportXls } = useListPage({
    designScope: 'dict-template',
    tableProps: {
      title: '数据字典',
      api: list,
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
   * 详情
   */
  async function handleDetail(record) {
    openModal(true, {
      record,
      isUpdate: true,
    });
  }
  /**
   * 删除事件
   */
  async function handleDelete(record) {
    await deleteDict(record.id, reload);
  }
  /**
   * 批量删除事件
   */
  async function batchHandleDelete() {
    await batchDeleteDict({ ids: selectedRowKeys.value }, reload);
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
   * 刷新缓存
   */
  async function handlerRefreshCache() {
    const result = await refreshCache();
    if (result.success) {
      const res = await queryAllDictItems();
      clearAuthCache();
      console.log('clearAuthCache');
      setAuthCache(DB_DICT_DATA_KEY, res.result);
      createMessage.success('刷新缓存完成！');
    } else {
      createMessage.error('刷新缓存失败！');
    }
  }
  /**
   * 字典配置
   */
  function handleItem(record) {
    openDrawer(true, {
      id: record.id,
    });
  }
  /**
   * 操作栏
   */
  function getTableAction(record) {
    return [
      {
        label: '编辑',
        onClick: handleEdit.bind(null, record),
      },
      {
        label: '字典配置',
        onClick: handleItem.bind(null, record),
      },
      {
        label: '删除',
        popConfirm: {
          title: '确定删除吗?',
          confirm: handleDelete.bind(null, record),
        },
      },
    ];
  }
</script>

<style scoped></style>
