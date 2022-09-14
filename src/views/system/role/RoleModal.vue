<template>
  <BasicModal
    v-bind="$attrs"
    @register="roleModal"
    :title="getTitle"
    width="500px"
    @ok="handleSubmit"
    destroyOnClose
  >
    <BasicForm @register="registerForm" />
  </BasicModal>
</template>
<script lang="ts" setup>
  import { ref, computed, unref, useAttrs } from 'vue';
  import { BasicForm, useForm } from '/@/components/Form';
  import { BasicModal, useModalInner } from '/@/components/Modal';
  import { formSchema } from './roleForm';
  import { saveOrUpdateRole } from '/@/api/system/role';
  // 声明Emits
  const emit = defineEmits(['success', 'register']);
  const attrs = useAttrs();
  const isUpdate = ref(true);
  const [registerForm, { setProps, resetFields, setFieldsValue, validate }] = useForm({
    labelWidth: 400,
    schemas: formSchema,
    showActionButtonGroup: false,
  });
  const [roleModal, { setModalProps, closeModal }] = useModalInner(async (data) => {
    resetFields();
    isUpdate.value = !!data?.isUpdate;
    setModalProps({ confirmLoading: false });
    if (unref(isUpdate)) {
      setFieldsValue({
        ...data.record,
      });
    }
    //禁用表单
    setProps({ disabled: !attrs.showFooter });
  });
  /**
   * 标题
   */
  const getTitle = computed(() => (!unref(isUpdate) ? '新增角色' : '编辑角色'));
  /**
   * 提交
   */
  async function handleSubmit() {
    try {
      const values = await validate();
      setModalProps({ confirmLoading: true });
      //提交表单
      await saveOrUpdateRole(values, isUpdate.value);
      closeModal();
      emit('success');
    } finally {
      setModalProps({ confirmLoading: false });
    }
  }
</script>
