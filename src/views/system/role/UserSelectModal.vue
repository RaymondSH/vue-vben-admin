<template>
  <BasicModal
    v-bind="$attrs"
    @register="userSelectModal"
    title="用户选择列表"
    width="1000px"
    @ok="handleSubmit"
  >
    <BasicTable @register="userListTable" :rowSelection="rowSelection" style="padding: 0px" />
  </BasicModal>
</template>
<script lang="ts" setup>
  import { ref, unref, toRaw } from 'vue';
  import { BasicModal, useModalInner } from '/@/components/Modal';
  import { BasicTable, useTable } from '/@/components/Table';
  import { userColumns, searchUserFormSchema } from './roleForm';
  import { getUserListByRole } from '/@/api/system/user';
  // 声明Emits
  const emit = defineEmits(['select', 'register']);
  const checkedKeys = ref<Array<string | number>>([]);
  const [userSelectModal, { setModalProps, closeModal }] = useModalInner();
  //注册table数据
  const [userListTable] = useTable({
    api: getUserListByRole,
    rowKey: 'id',
    columns: userColumns,
    formConfig: {
      labelWidth: 60,
      schemas: searchUserFormSchema,
      baseRowStyle: { maxHeight: '20px' },
      autoSubmitOnEnter: true,
    },
    striped: true,
    useSearchForm: true,
    showTableSetting: false,
    bordered: true,
    showIndexColumn: false,
    canResize: false,
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

  //提交事件
  function handleSubmit() {
    setModalProps({ confirmLoading: true });
    //关闭弹窗
    closeModal();
    //刷新列表
    emit('select', toRaw(unref(checkedKeys)));
    setModalProps({ confirmLoading: false });
  }
</script>
