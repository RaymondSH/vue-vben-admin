<template>
  <a-row :class="['p-4', `${prefixCls}--box`]" type="flex" :gutter="10">
    <a-col :xl="12" :lg="24" :md="24" style="margin-bottom: 10px">
      <DepartLeftTree ref="leftTree" @select="onTreeSelect" @rootTreeData="onRootTreeData" />
    </a-col>
    <a-col :xl="12" :lg="24" :md="24" style="margin-bottom: 10px">
      <div style="height: 100%; background-color: white">
        <div style="padding: 20px">
          <DepartFormTab :data="departData" :rootTreeData="rootTreeData" @success="onSuccess" />
        </div>
        <div v-show="departData == null" style="padding-top: 40px">
          <a-empty description="尚未选择部门" />
        </div>
      </div>
    </a-col>
  </a-row>
</template>

<script lang="ts" setup>
  import { provide, ref } from 'vue';
  import { useDesign } from '/@/hooks/web/useDesign';
  import DepartLeftTree from './DepartLeftTree.vue';
  import DepartFormTab from './DepartFormTab.vue';

  const { prefixCls } = useDesign('depart-manage');
  provide('prefixCls', prefixCls);

  // 给子组件定义一个ref变量
  const leftTree = ref();

  // 当前选中的部门信息
  const departData = ref({});
  const rootTreeData = ref<any[]>([]);

  // 左侧树选择后触发
  function onTreeSelect(data) {
    departData.value = data;
  }

  // 左侧树rootTreeData触发
  function onRootTreeData(data) {
    console.log(data);
    rootTreeData.value = data;
  }

  function onSuccess() {
    leftTree.value.loadRootTreeData();
  }
</script>

<style lang="less">
  @import './index.less';
</style>
