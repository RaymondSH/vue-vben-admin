<script lang="ts" setup>
import type {
  AlertDirection,
  AlertNotificationItem,
  AlertRuleCreateRequest,
  AlertRuleItem,
  AlertRuleParameters,
  AlertRuleTestResponse,
  AlertSeverity,
  AlertTargetScope,
  AlertTriggerItem,
  AlertType,
  MarketLightStatus,
  PortfolioStopLossMode,
} from '#/api';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createAlertRuleApi,
  deleteAlertRuleApi,
  disableAlertRuleApi,
  enableAlertRuleApi,
  listAlertNotificationsApi,
  listAlertRulesApi,
  listAlertTriggersApi,
  testAlertRuleApi,
} from '#/api';

defineOptions({ name: 'AlertsCenter' });

type EnabledFilter = 'all' | 'disabled' | 'enabled';
type AlertTypeFilter = 'all' | AlertType;

const PAGE_SIZE = 20;

const alertTypeOptions = [
  { label: '价格突破', value: 'price_cross' },
  { label: '涨跌幅', value: 'price_change_percent' },
  { label: '成交量放大', value: 'volume_spike' },
  { label: '价格均线穿越', value: 'ma_price_cross' },
  { label: 'RSI 阈值', value: 'rsi_threshold' },
  { label: 'MACD 金叉/死叉', value: 'macd_cross' },
  { label: 'KDJ 金叉/死叉', value: 'kdj_cross' },
  { label: 'CCI 阈值', value: 'cci_threshold' },
  { label: '组合止损', value: 'portfolio_stop_loss' },
  { label: '组合集中度', value: 'portfolio_concentration' },
  { label: '组合回撤', value: 'portfolio_drawdown' },
  { label: '组合价格状态', value: 'portfolio_price_stale' },
  { label: '大盘红绿灯状态', value: 'market_light_status' },
  { label: '大盘红绿灯分数下降', value: 'market_light_score_drop' },
];

const targetScopeOptions = [
  { label: '单标的', value: 'single_symbol' },
  { label: '自选股', value: 'watchlist' },
  { label: '持仓标的', value: 'portfolio_holdings' },
  { label: '持仓账户', value: 'portfolio_account' },
  { label: '大盘市场', value: 'market' },
];

const severityOptions = [
  { label: '提示', value: 'info' },
  { label: '警告', value: 'warning' },
  { label: '严重', value: 'critical' },
];

const rulesColumns = [
  { dataIndex: 'name', key: 'name', title: '规则' },
  { dataIndex: 'target', key: 'target', title: '目标' },
  { dataIndex: 'alertType', key: 'alertType', title: '类型' },
  { dataIndex: 'parameters', key: 'parameters', title: '参数' },
  { dataIndex: 'enabled', key: 'enabled', title: '状态' },
  { dataIndex: 'cooldownUntil', key: 'cooldown', title: '冷却' },
  { key: 'action', title: '操作', width: 220 },
];

const triggerColumns = [
  { dataIndex: 'status', key: 'status', title: '状态' },
  { dataIndex: 'target', key: 'target', title: '目标' },
  { dataIndex: 'observedValue', key: 'observedValue', title: '观察值' },
  { dataIndex: 'threshold', key: 'threshold', title: '阈值' },
  { dataIndex: 'dataSource', key: 'dataSource', title: '数据源' },
  { dataIndex: 'triggeredAt', key: 'triggeredAt', title: '时间' },
  { dataIndex: 'reason', key: 'reason', title: '原因' },
];

const notificationColumns = [
  { dataIndex: 'channel', key: 'channel', title: '渠道' },
  { dataIndex: 'success', key: 'success', title: '状态' },
  { dataIndex: 'errorCode', key: 'errorCode', title: '错误码' },
  { dataIndex: 'latencyMs', key: 'latencyMs', title: '耗时' },
  { dataIndex: 'createdAt', key: 'createdAt', title: '时间' },
  { dataIndex: 'diagnostics', key: 'diagnostics', title: '诊断' },
];

const form = reactive({
  alertType: 'price_cross' as AlertType,
  changePct: undefined as number | undefined,
  dPeriod: 3,
  direction: 'above' as AlertDirection,
  enabled: true,
  fastPeriod: 12,
  kPeriod: 3,
  marketStatuses: ['red', 'yellow'] as MarketLightStatus[],
  minDrop: 10,
  mode: 'near' as PortfolioStopLossMode,
  multiplier: undefined as number | undefined,
  name: '',
  period: 14,
  price: undefined as number | undefined,
  severity: 'warning' as AlertSeverity,
  signalPeriod: 9,
  slowPeriod: 26,
  target: '',
  targetScope: 'single_symbol' as AlertTargetScope,
  threshold: undefined as number | undefined,
  window: 20,
});

const filters = reactive({
  alertType: 'all' as AlertTypeFilter,
  enabled: 'all' as EnabledFilter,
  page: 1,
});

const rules = ref<AlertRuleItem[]>([]);
const triggers = ref<AlertTriggerItem[]>([]);
const notifications = ref<AlertNotificationItem[]>([]);
const rulesTotal = ref(0);
const loadingRules = ref(false);
const loadingTriggers = ref(false);
const loadingNotifications = ref(false);
const submitting = ref(false);
const busyRuleId = ref<null | number>(null);
const testResult = ref<AlertRuleTestResponse | null>(null);
const errorMessage = ref('');

const selectedAlertTypeLabel = computed(() => typeLabel(form.alertType));

watch(
  () => form.targetScope,
  (scope) => {
    switch (scope) {
      case 'market': {
        form.alertType = 'market_light_status';
        form.target = 'cn';
        break;
      }
      case 'portfolio_account':
      case 'portfolio_holdings': {
        form.alertType = 'portfolio_stop_loss';
        form.target = 'all';
        break;
      }
      case 'watchlist': {
        form.alertType = 'price_change_percent';
        form.target = 'default';
        break;
      }
      default: {
        form.alertType = 'price_cross';
        form.target = '';
      }
    }
  },
);

function typeLabel(value: string) {
  return alertTypeOptions.find((item) => item.value === value)?.label || value;
}

function scopeLabel(value: string) {
  return (
    targetScopeOptions.find((item) => item.value === value)?.label || value
  );
}

function severityTone(value: AlertSeverity) {
  if (value === 'critical') return 'error';
  if (value === 'warning') return 'warning';
  return 'blue';
}

function statusTone(value: string) {
  if (value === 'triggered') return 'success';
  if (value === 'failed' || value === 'evaluation_error') return 'error';
  if (
    value === 'skipped' ||
    value === 'degraded' ||
    value === 'not_triggered'
  ) {
    return 'warning';
  }
  return 'default';
}

function formatDateTime(value?: null | string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatTarget(rule: AlertRuleItem) {
  if (rule.targetScope === 'watchlist') return 'default';
  if (
    rule.targetScope === 'portfolio_account' ||
    rule.targetScope === 'portfolio_holdings'
  ) {
    return rule.target === 'all' ? '全部账户' : `账户 ${rule.target}`;
  }
  if (rule.targetScope === 'market') {
    return { cn: 'A 股', hk: '港股', us: '美股' }[rule.target] || rule.target;
  }
  return rule.target;
}

function formatParameters(rule: AlertRuleItem) {
  const params = rule.parameters || {};
  if (rule.alertType === 'price_cross') {
    return `${params.direction === 'below' ? '下破' : '上破'} ${params.price ?? '-'}`;
  }
  if (rule.alertType === 'price_change_percent') {
    return `${params.direction === 'down' ? '下跌' : '上涨'} ${params.changePct ?? '-'}%`;
  }
  if (rule.alertType === 'volume_spike') return `${params.multiplier ?? '-'}x`;
  if (rule.alertType === 'ma_price_cross') {
    return `${params.direction === 'below' ? '下穿' : '上穿'} MA${params.window ?? '-'}`;
  }
  if (
    rule.alertType === 'rsi_threshold' ||
    rule.alertType === 'cci_threshold'
  ) {
    const name = rule.alertType === 'rsi_threshold' ? 'RSI' : 'CCI';
    return `${name}${params.period ?? '-'} ${params.direction === 'below' ? '下穿' : '上穿'} ${params.threshold ?? '-'}`;
  }
  if (rule.alertType === 'macd_cross') {
    return `MACD(${params.fastPeriod ?? '-'},${params.slowPeriod ?? '-'},${params.signalPeriod ?? '-'}) ${params.direction === 'bearish_cross' ? '死叉' : '金叉'}`;
  }
  if (rule.alertType === 'kdj_cross') {
    return `KDJ(${params.period ?? '-'},${params.kPeriod ?? '-'},${params.dPeriod ?? '-'}) ${params.direction === 'bearish_cross' ? '死叉' : '金叉'}`;
  }
  if (rule.alertType === 'portfolio_stop_loss') {
    return params.mode === 'breach' ? '已触发止损' : '接近止损';
  }
  if (rule.alertType === 'market_light_status') {
    return (params.statuses || []).join(' / ') || '-';
  }
  if (rule.alertType === 'market_light_score_drop') {
    return `Score 下降 >= ${params.minDrop ?? '-'}`;
  }
  if (rule.alertType === 'portfolio_concentration') return 'top_weight_pct';
  if (rule.alertType === 'portfolio_drawdown') return 'max_drawdown_pct';
  if (rule.alertType === 'portfolio_price_stale') return 'price_stale';
  return '-';
}

function buildParameters(): AlertRuleParameters | null {
  const type = form.alertType;
  if (type === 'price_cross') {
    if (!form.price) return null;
    return { direction: form.direction, price: form.price };
  }
  if (type === 'price_change_percent') {
    if (!form.changePct) return null;
    return { changePct: form.changePct, direction: form.direction };
  }
  if (type === 'volume_spike') {
    if (!form.multiplier) return null;
    return { multiplier: form.multiplier };
  }
  if (type === 'ma_price_cross') {
    return { direction: form.direction, window: form.window };
  }
  if (type === 'rsi_threshold' || type === 'cci_threshold') {
    if (form.threshold === undefined) return null;
    return {
      direction: form.direction,
      period: form.period,
      threshold: form.threshold,
    };
  }
  if (type === 'macd_cross') {
    return {
      direction: form.direction,
      fastPeriod: form.fastPeriod,
      signalPeriod: form.signalPeriod,
      slowPeriod: form.slowPeriod,
    };
  }
  if (type === 'kdj_cross') {
    return {
      dPeriod: form.dPeriod,
      direction: form.direction,
      kPeriod: form.kPeriod,
      period: form.period,
    };
  }
  if (type === 'portfolio_stop_loss') return { mode: form.mode };
  if (type === 'market_light_status') {
    if (form.marketStatuses.length === 0) return null;
    return { statuses: form.marketStatuses };
  }
  if (type === 'market_light_score_drop') return { minDrop: form.minDrop };
  return {};
}

function buildRulePayload(): AlertRuleCreateRequest | null {
  const target = form.target.trim();
  if (!target) {
    message.warning('请填写告警目标。');
    return null;
  }
  const parameters = buildParameters();
  if (!parameters) {
    message.warning(`请补齐${selectedAlertTypeLabel.value}的规则参数。`);
    return null;
  }
  return {
    alertType: form.alertType,
    enabled: form.enabled,
    name: form.name.trim() || undefined,
    parameters,
    severity: form.severity,
    target,
    targetScope: form.targetScope,
  };
}

function ruleListQuery(page = filters.page) {
  return {
    alertType: filters.alertType === 'all' ? undefined : filters.alertType,
    enabled:
      filters.enabled === 'all' ? undefined : filters.enabled === 'enabled',
    page,
    pageSize: PAGE_SIZE,
  };
}

async function loadRules(page = filters.page) {
  loadingRules.value = true;
  try {
    const response = await listAlertRulesApi(ruleListQuery(page));
    rules.value = response.items || [];
    rulesTotal.value = response.total || 0;
    filters.page = response.page || page;
  } finally {
    loadingRules.value = false;
  }
}

async function loadTriggers() {
  loadingTriggers.value = true;
  try {
    const response = await listAlertTriggersApi({
      page: 1,
      pageSize: PAGE_SIZE,
    });
    triggers.value = response.items || [];
  } finally {
    loadingTriggers.value = false;
  }
}

async function loadNotifications() {
  loadingNotifications.value = true;
  try {
    const response = await listAlertNotificationsApi({
      page: 1,
      pageSize: PAGE_SIZE,
    });
    notifications.value = response.items || [];
  } finally {
    loadingNotifications.value = false;
  }
}

async function refreshAll(page = filters.page) {
  errorMessage.value = '';
  try {
    await Promise.all([loadRules(page), loadTriggers(), loadNotifications()]);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '告警中心数据加载失败。';
  }
}

async function handleCreateRule() {
  const payload = buildRulePayload();
  if (!payload) return;
  submitting.value = true;
  try {
    const created = await createAlertRuleApi(payload);
    message.success(`已创建告警规则「${created.name}」。`);
    form.name = '';
    await refreshAll(1);
  } finally {
    submitting.value = false;
  }
}

async function handleToggleRule(rule: AlertRuleItem) {
  busyRuleId.value = rule.id;
  try {
    await (rule.enabled
      ? disableAlertRuleApi(rule.id)
      : enableAlertRuleApi(rule.id));
    await loadRules();
  } finally {
    busyRuleId.value = null;
  }
}

function asRuleRecord(record: Record<string, unknown>) {
  return record as unknown as AlertRuleItem;
}

function confirmDelete(rule: AlertRuleItem) {
  Modal.confirm({
    content: `确认删除「${rule.name}」吗？已有触发历史不会被删除。`,
    okText: '删除',
    okType: 'danger',
    title: '删除告警规则',
    async onOk() {
      busyRuleId.value = rule.id;
      try {
        await deleteAlertRuleApi(rule.id);
        message.success('告警规则已删除。');
        await refreshAll();
      } finally {
        busyRuleId.value = null;
      }
    },
  });
}

async function handleTestRule(rule: AlertRuleItem) {
  busyRuleId.value = rule.id;
  testResult.value = null;
  try {
    testResult.value = await testAlertRuleApi(rule.id);
  } finally {
    busyRuleId.value = null;
  }
}

async function handleFilterChange() {
  await loadRules(1);
}

onMounted(async () => {
  await refreshAll(1);
});
</script>

<template>
  <Page
    auto-content-height
    description="管理事件、技术指标、持仓账户和大盘红绿灯告警规则，查看触发历史与通知尝试记录。"
    title="告警中心"
  >
    <div class="alerts-page">
      <Alert
        v-if="errorMessage"
        show-icon
        type="error"
        :message="errorMessage"
      />

      <div class="main-grid">
        <Card title="新建规则" :bordered="false">
          <Form layout="vertical">
            <FormItem label="规则名称">
              <Input
                v-model:value="form.name"
                placeholder="可选，留空自动命名"
              />
            </FormItem>
            <div class="form-grid">
              <FormItem label="目标范围">
                <Select
                  v-model:value="form.targetScope"
                  :options="targetScopeOptions"
                />
              </FormItem>
              <FormItem label="规则类型">
                <Select
                  v-model:value="form.alertType"
                  :options="alertTypeOptions"
                />
              </FormItem>
              <FormItem label="严重级别">
                <Select
                  v-model:value="form.severity"
                  :options="severityOptions"
                />
              </FormItem>
              <FormItem label="目标">
                <Select
                  v-if="form.targetScope === 'market'"
                  v-model:value="form.target"
                  :options="[
                    { label: 'A 股', value: 'cn' },
                    { label: '港股', value: 'hk' },
                    { label: '美股', value: 'us' },
                  ]"
                />
                <Input
                  v-else
                  v-model:value="form.target"
                  placeholder="单标的填代码，组合可填 all 或账户 ID"
                />
              </FormItem>
            </div>

            <div class="form-grid">
              <FormItem
                v-if="
                  [
                    'price_cross',
                    'price_change_percent',
                    'ma_price_cross',
                    'rsi_threshold',
                    'cci_threshold',
                  ].includes(form.alertType)
                "
                label="方向"
              >
                <Select
                  v-model:value="form.direction"
                  :options="
                    form.alertType === 'price_change_percent'
                      ? [
                          { label: '上涨达到', value: 'up' },
                          { label: '下跌达到', value: 'down' },
                        ]
                      : [
                          { label: '上穿/上破', value: 'above' },
                          { label: '下穿/下破', value: 'below' },
                        ]
                  "
                />
              </FormItem>
              <FormItem
                v-if="['macd_cross', 'kdj_cross'].includes(form.alertType)"
                label="交叉方向"
              >
                <Select
                  v-model:value="form.direction"
                  :options="[
                    { label: '金叉', value: 'bullish_cross' },
                    { label: '死叉', value: 'bearish_cross' },
                  ]"
                />
              </FormItem>
              <FormItem v-if="form.alertType === 'price_cross'" label="价格">
                <InputNumber
                  v-model:value="form.price"
                  class="wide-input"
                  :min="0"
                />
              </FormItem>
              <FormItem
                v-if="form.alertType === 'price_change_percent'"
                label="涨跌幅 %"
              >
                <InputNumber
                  v-model:value="form.changePct"
                  class="wide-input"
                  :min="0"
                />
              </FormItem>
              <FormItem
                v-if="form.alertType === 'volume_spike'"
                label="成交量倍数"
              >
                <InputNumber
                  v-model:value="form.multiplier"
                  class="wide-input"
                  :min="0"
                />
              </FormItem>
              <FormItem
                v-if="form.alertType === 'ma_price_cross'"
                label="均线周期"
              >
                <InputNumber
                  v-model:value="form.window"
                  class="wide-input"
                  :max="250"
                  :min="2"
                />
              </FormItem>
              <FormItem
                v-if="
                  ['rsi_threshold', 'cci_threshold', 'kdj_cross'].includes(
                    form.alertType,
                  )
                "
                label="周期"
              >
                <InputNumber
                  v-model:value="form.period"
                  class="wide-input"
                  :max="250"
                  :min="2"
                />
              </FormItem>
              <FormItem
                v-if="
                  ['rsi_threshold', 'cci_threshold'].includes(form.alertType)
                "
                label="阈值"
              >
                <InputNumber
                  v-model:value="form.threshold"
                  class="wide-input"
                />
              </FormItem>
              <FormItem v-if="form.alertType === 'macd_cross'" label="快线">
                <InputNumber
                  v-model:value="form.fastPeriod"
                  class="wide-input"
                  :max="250"
                  :min="2"
                />
              </FormItem>
              <FormItem v-if="form.alertType === 'macd_cross'" label="慢线">
                <InputNumber
                  v-model:value="form.slowPeriod"
                  class="wide-input"
                  :max="250"
                  :min="2"
                />
              </FormItem>
              <FormItem v-if="form.alertType === 'macd_cross'" label="信号线">
                <InputNumber
                  v-model:value="form.signalPeriod"
                  class="wide-input"
                  :max="250"
                  :min="2"
                />
              </FormItem>
              <FormItem v-if="form.alertType === 'kdj_cross'" label="K 周期">
                <InputNumber
                  v-model:value="form.kPeriod"
                  class="wide-input"
                  :max="250"
                  :min="2"
                />
              </FormItem>
              <FormItem v-if="form.alertType === 'kdj_cross'" label="D 周期">
                <InputNumber
                  v-model:value="form.dPeriod"
                  class="wide-input"
                  :max="250"
                  :min="2"
                />
              </FormItem>
              <FormItem
                v-if="form.alertType === 'portfolio_stop_loss'"
                label="止损模式"
              >
                <Select
                  v-model:value="form.mode"
                  :options="[
                    { label: '接近止损', value: 'near' },
                    { label: '已触发止损', value: 'breach' },
                  ]"
                />
              </FormItem>
              <FormItem
                v-if="form.alertType === 'market_light_status'"
                label="灯号"
              >
                <Checkbox.Group
                  v-model:value="form.marketStatuses"
                  :options="[
                    { label: '红灯', value: 'red' },
                    { label: '黄灯', value: 'yellow' },
                  ]"
                />
              </FormItem>
              <FormItem
                v-if="form.alertType === 'market_light_score_drop'"
                label="分数下降"
              >
                <InputNumber
                  v-model:value="form.minDrop"
                  class="wide-input"
                  :min="0"
                />
              </FormItem>
            </div>

            <div class="create-actions">
              <Checkbox v-model:checked="form.enabled">创建后启用</Checkbox>
              <Button
                :loading="submitting"
                type="primary"
                @click="handleCreateRule"
              >
                创建规则
              </Button>
            </div>
          </Form>
        </Card>

        <Card title="告警规则" :bordered="false">
          <div class="rule-toolbar">
            <Space wrap>
              <Select
                v-model:value="filters.enabled"
                class="filter-select"
                :options="[
                  { label: '全部状态', value: 'all' },
                  { label: '已启用', value: 'enabled' },
                  { label: '已停用', value: 'disabled' },
                ]"
                @change="handleFilterChange"
              />
              <Select
                v-model:value="filters.alertType"
                class="type-filter"
                :options="[
                  { label: '全部类型', value: 'all' },
                  ...alertTypeOptions,
                ]"
                @change="handleFilterChange"
              />
              <Button :loading="loadingRules" @click="refreshAll()">
                刷新
              </Button>
            </Space>
          </div>
          <Table
            :columns="rulesColumns"
            :data-source="rules"
            :loading="loadingRules"
            :pagination="{
              current: filters.page,
              pageSize: PAGE_SIZE,
              total: rulesTotal,
              showTotal: (total: number) => `共 ${total} 条`,
              onChange: loadRules,
            }"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <strong>{{ record.name }}</strong>
                <div class="muted">来源：{{ record.source }}</div>
              </template>
              <template v-else-if="column.key === 'target'">
                {{ formatTarget(asRuleRecord(record)) }}
                <div class="muted">{{ scopeLabel(record.targetScope) }}</div>
              </template>
              <template v-else-if="column.key === 'alertType'">
                <Tag color="blue">{{ typeLabel(record.alertType) }}</Tag>
                <Tag :color="severityTone(record.severity)">
                  {{ record.severity }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'parameters'">
                {{ formatParameters(asRuleRecord(record)) }}
              </template>
              <template v-else-if="column.key === 'enabled'">
                <Tag :color="record.enabled ? 'success' : 'default'">
                  {{ record.enabled ? '已启用' : '已停用' }}
                </Tag>
              </template>
              <template v-else-if="column.key === 'cooldown'">
                <Tag :color="record.cooldownActive ? 'warning' : 'default'">
                  {{ record.cooldownActive ? '冷却中' : '未冷却' }}
                </Tag>
                <div class="muted">
                  {{ formatDateTime(record.cooldownUntil) }}
                </div>
              </template>
              <template v-else-if="column.key === 'action'">
                <Space>
                  <Button
                    size="small"
                    :loading="busyRuleId === record.id"
                    @click="handleTestRule(asRuleRecord(record))"
                  >
                    测试
                  </Button>
                  <Button
                    size="small"
                    :loading="busyRuleId === record.id"
                    @click="handleToggleRule(asRuleRecord(record))"
                  >
                    {{ record.enabled ? '停用' : '启用' }}
                  </Button>
                  <Button
                    danger
                    size="small"
                    type="link"
                    @click="confirmDelete(asRuleRecord(record))"
                  >
                    删除
                  </Button>
                </Space>
              </template>
            </template>
          </Table>
        </Card>
      </div>

      <Alert
        v-if="testResult"
        show-icon
        :type="
          testResult.status === 'evaluation_error'
            ? 'error'
            : testResult.triggered
              ? 'success'
              : 'warning'
        "
        :message="`测试结果：${testResult.message}；状态 ${testResult.status}；触发 ${testResult.triggered ? '是' : '否'}；观察值 ${testResult.observedValue ?? '-'}`"
      />

      <Card title="触发历史" :bordered="false">
        <Table
          :columns="triggerColumns"
          :data-source="triggers"
          :loading="loadingTriggers"
          :pagination="false"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Tag :color="statusTone(record.status)">
                {{ record.status }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'triggeredAt'">
              {{ formatDateTime(record.dataTimestamp || record.triggeredAt) }}
            </template>
            <template v-else-if="column.key === 'reason'">
              {{ record.reason || record.diagnostics || '-' }}
            </template>
          </template>
        </Table>
      </Card>

      <Card title="通知尝试记录" :bordered="false">
        <Table
          :columns="notificationColumns"
          :data-source="notifications"
          :loading="loadingNotifications"
          :pagination="false"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'success'">
              <Tag :color="record.success ? 'success' : 'error'">
                {{ record.success ? '成功' : '失败' }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'latencyMs'">
              {{ record.latencyMs == null ? '-' : `${record.latencyMs}ms` }}
            </template>
            <template v-else-if="column.key === 'createdAt'">
              {{ formatDateTime(record.createdAt) }}
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.alerts-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-grid {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.wide-input {
  width: 100%;
}

.create-actions,
.rule-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.rule-toolbar {
  margin-bottom: 16px;
}

.filter-select {
  width: 140px;
}

.type-filter {
  width: 240px;
}

.muted {
  margin-top: 4px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .create-actions,
  .rule-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-select,
  .type-filter {
    width: 100%;
  }
}
</style>
