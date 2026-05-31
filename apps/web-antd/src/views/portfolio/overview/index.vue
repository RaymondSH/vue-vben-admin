<script lang="ts" setup>
import type {
  PortfolioAccountItem,
  PortfolioCashDirection,
  PortfolioCashLedgerListItem,
  PortfolioCorporateActionListItem,
  PortfolioCorporateActionType,
  PortfolioCostMethod,
  PortfolioFxRefreshResponse,
  PortfolioImportBrokerItem,
  PortfolioImportCommitResponse,
  PortfolioImportParseResponse,
  PortfolioPositionItem,
  PortfolioSide,
  PortfolioTradeListItem,
} from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  TabPane,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  commitPortfolioCsvImportApi,
  createPortfolioAccountApi,
  createPortfolioCashLedgerApi,
  createPortfolioCorporateActionApi,
  createPortfolioTradeApi,
  deletePortfolioCashLedgerApi,
  deletePortfolioCorporateActionApi,
  deletePortfolioTradeApi,
  getPortfolioAccountsApi,
  getPortfolioRiskApi,
  getPortfolioSnapshotApi,
  listPortfolioCashLedgerApi,
  listPortfolioCorporateActionsApi,
  listPortfolioImportBrokersApi,
  listPortfolioTradesApi,
  parsePortfolioCsvImportApi,
  refreshPortfolioFxApi,
} from '#/api';

defineOptions({ name: 'PortfolioOverview' });

type AccountOption = 'all' | number;
type EventType = 'cash' | 'corporate' | 'trade';
type FlatPosition = PortfolioPositionItem & {
  accountId: number;
  accountName: string;
};
type FxRefreshFeedback = {
  text: string;
  tone: 'info' | 'success' | 'warning';
};

const EVENT_PAGE_SIZE = 12;
const FALLBACK_BROKERS: PortfolioImportBrokerItem[] = [
  { aliases: [], broker: 'huatai', displayName: '华泰' },
  { aliases: ['zhongxin'], broker: 'citic', displayName: '中信' },
  { aliases: ['cmbchina', 'zhaoshang'], broker: 'cmb', displayName: '招商' },
];

const accountColumns = [
  { dataIndex: 'name', key: 'name', title: '账户' },
  { dataIndex: 'market', key: 'market', title: '市场' },
  { dataIndex: 'baseCurrency', key: 'baseCurrency', title: '本位币' },
  { dataIndex: 'broker', key: 'broker', title: '券商' },
];

const positionColumns = [
  { dataIndex: 'symbol', key: 'symbol', title: '代码' },
  { dataIndex: 'accountName', key: 'accountName', title: '账户' },
  { dataIndex: 'quantity', key: 'quantity', title: '数量' },
  { dataIndex: 'avgCost', key: 'avgCost', title: '成本' },
  { dataIndex: 'lastPrice', key: 'lastPrice', title: '现价' },
  { dataIndex: 'marketValueBase', key: 'marketValueBase', title: '市值' },
  {
    dataIndex: 'unrealizedPnlBase',
    key: 'unrealizedPnlBase',
    title: '未实现盈亏',
  },
  { dataIndex: 'unrealizedPnlPct', key: 'unrealizedPnlPct', title: '盈亏率' },
  { key: 'action', title: '操作', width: 160 },
];

const tradeColumns = [
  { dataIndex: 'tradeDate', key: 'tradeDate', title: '日期' },
  { dataIndex: 'symbol', key: 'symbol', title: '代码' },
  { dataIndex: 'side', key: 'side', title: '方向' },
  { dataIndex: 'quantity', key: 'quantity', title: '数量' },
  { dataIndex: 'price', key: 'price', title: '价格' },
  { dataIndex: 'fee', key: 'fee', title: '费用' },
  { key: 'action', title: '操作', width: 96 },
];

const cashColumns = [
  { dataIndex: 'eventDate', key: 'eventDate', title: '日期' },
  { dataIndex: 'direction', key: 'direction', title: '方向' },
  { dataIndex: 'amount', key: 'amount', title: '金额' },
  { dataIndex: 'currency', key: 'currency', title: '币种' },
  { dataIndex: 'note', key: 'note', title: '备注' },
  { key: 'action', title: '操作', width: 96 },
];

const corporateColumns = [
  { dataIndex: 'effectiveDate', key: 'effectiveDate', title: '日期' },
  { dataIndex: 'symbol', key: 'symbol', title: '代码' },
  { dataIndex: 'actionType', key: 'actionType', title: '类型' },
  {
    dataIndex: 'cashDividendPerShare',
    key: 'cashDividendPerShare',
    title: '每股分红',
  },
  { dataIndex: 'splitRatio', key: 'splitRatio', title: '拆并比例' },
  { key: 'action', title: '操作', width: 96 },
];

const importPreviewColumns = [
  { dataIndex: 'tradeDate', key: 'tradeDate', title: '日期' },
  { dataIndex: 'symbol', key: 'symbol', title: '代码' },
  { dataIndex: 'side', key: 'side', title: '方向' },
  { dataIndex: 'quantity', key: 'quantity', title: '数量' },
  { dataIndex: 'price', key: 'price', title: '价格' },
  { dataIndex: 'fee', key: 'fee', title: '费用' },
];

const router = useRouter();
const accounts = ref<PortfolioAccountItem[]>([]);
const selectedAccount = ref<AccountOption>('all');
const costMethod = ref<PortfolioCostMethod>('fifo');
const loading = ref(false);
const eventLoading = ref(false);
const submitting = ref(false);
const errorMessage = ref('');
const riskWarning = ref('');
const selectedEventType = ref<EventType>('trade');
const eventPage = ref(1);
const eventTotal = ref(0);
const fxRefreshing = ref(false);
const fxRefreshFeedback = ref<FxRefreshFeedback | null>(null);
const brokers = ref<PortfolioImportBrokerItem[]>([]);
const selectedBroker = ref('huatai');
const csvFile = ref<File | null>(null);
const csvDryRun = ref(true);
const csvParsing = ref(false);
const csvCommitting = ref(false);
const csvParseResult = ref<null | PortfolioImportParseResponse>(null);
const csvCommitResult = ref<null | PortfolioImportCommitResponse>(null);
const brokerLoadWarning = ref('');

const snapshot = ref<Awaited<
  ReturnType<typeof getPortfolioSnapshotApi>
> | null>(null);
const risk = ref<Awaited<ReturnType<typeof getPortfolioRiskApi>> | null>(null);
const tradeEvents = ref<PortfolioTradeListItem[]>([]);
const cashEvents = ref<PortfolioCashLedgerListItem[]>([]);
const corporateEvents = ref<PortfolioCorporateActionListItem[]>([]);

const accountForm = reactive({
  baseCurrency: 'CNY',
  broker: '',
  market: 'cn' as 'cn' | 'hk' | 'us',
  name: '',
});

const tradeForm = reactive({
  fee: 0,
  note: '',
  price: undefined as number | undefined,
  quantity: undefined as number | undefined,
  side: 'buy' as PortfolioSide,
  symbol: '',
  tax: 0,
  tradeDate: getToday(),
});

const cashForm = reactive({
  amount: undefined as number | undefined,
  currency: '',
  direction: 'in' as PortfolioCashDirection,
  eventDate: getToday(),
  note: '',
});

const corporateForm = reactive({
  actionType: 'cash_dividend' as PortfolioCorporateActionType,
  cashDividendPerShare: undefined as number | undefined,
  effectiveDate: getToday(),
  note: '',
  splitRatio: undefined as number | undefined,
  symbol: '',
});

const queryAccountId = computed(() =>
  selectedAccount.value === 'all' ? undefined : selectedAccount.value,
);

const writableAccount = computed(() =>
  selectedAccount.value === 'all'
    ? undefined
    : accounts.value.find((item) => item.id === selectedAccount.value),
);

const accountOptions = computed(() => [
  { label: '全部账户', value: 'all' },
  ...accounts.value.map((item) => ({
    label: `${item.name} · ${item.market.toUpperCase()} · ${item.baseCurrency}`,
    value: item.id,
  })),
]);

const brokerOptions = computed(() =>
  brokers.value.map((item) => ({
    label: formatBrokerLabel(item),
    value: item.broker,
  })),
);

const positionRows = computed<FlatPosition[]>(() => {
  const rows: FlatPosition[] = [];
  for (const account of snapshot.value?.accounts || []) {
    for (const position of account.positions || []) {
      rows.push({
        ...position,
        accountId: account.accountId,
        accountName: account.accountName,
      });
    }
  }
  return rows.toSorted(
    (left, right) => right.marketValueBase - left.marketValueBase,
  );
});

const stopLossItems = computed(() => risk.value?.stopLoss.items || []);
const topPositions = computed(
  () => risk.value?.concentration.topPositions || [],
);
const topSectors = computed(
  () => risk.value?.sectorConcentration.topSectors || [],
);

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(
  value?: null | number,
  currency = snapshot.value?.currency,
) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${currency || ''} ${value.toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`.trim();
}

function formatNumber(value?: null | number, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatPct(value?: null | number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function sideLabel(value: PortfolioSide) {
  return value === 'buy' ? '买入' : '卖出';
}

function directionLabel(value: PortfolioCashDirection) {
  return value === 'in' ? '流入' : '流出';
}

function corporateActionLabel(value: PortfolioCorporateActionType) {
  return value === 'cash_dividend' ? '现金分红' : '拆并股调整';
}

function formatBrokerLabel(item: PortfolioImportBrokerItem) {
  return item.displayName
    ? `${item.broker}（${item.displayName}）`
    : item.broker;
}

function buildFxRefreshFeedback(
  data: PortfolioFxRefreshResponse,
): FxRefreshFeedback {
  if (data.refreshEnabled === false) {
    return { text: '汇率在线刷新已被禁用。', tone: 'info' };
  }
  if (data.pairCount === 0) {
    return { text: '当前范围没有需要刷新的汇率对。', tone: 'info' };
  }
  if (data.updatedCount > 0 && data.errorCount === 0 && data.staleCount === 0) {
    return {
      text: `汇率已刷新，共更新 ${data.updatedCount} 对。`,
      tone: 'success',
    };
  }
  return {
    text: `已尝试刷新：更新 ${data.updatedCount} 对，仍过期 ${data.staleCount} 对，失败 ${data.errorCount} 对。`,
    tone: 'warning',
  };
}

function ensureWritableAccount() {
  if (!writableAccount.value) {
    message.warning('请先选择一个具体账户。');
    return false;
  }
  return true;
}

async function loadAccounts() {
  const response = await getPortfolioAccountsApi(false);
  accounts.value = response.accounts || [];
  if (
    selectedAccount.value !== 'all' &&
    !accounts.value.some((item) => item.id === selectedAccount.value)
  ) {
    selectedAccount.value = 'all';
  }
}

async function loadBrokers() {
  try {
    const response = await listPortfolioImportBrokersApi();
    const items = response.brokers || [];
    brokers.value = items.length > 0 ? items : FALLBACK_BROKERS;
    brokerLoadWarning.value =
      items.length > 0 ? '' : '券商列表接口返回为空，已使用内置券商列表。';
  } catch {
    brokers.value = FALLBACK_BROKERS;
    brokerLoadWarning.value = '券商列表接口不可用，已使用内置券商列表。';
  }
  if (!brokers.value.some((item) => item.broker === selectedBroker.value)) {
    selectedBroker.value = brokers.value[0]?.broker || 'huatai';
  }
}

async function loadSnapshotAndRisk() {
  loading.value = true;
  errorMessage.value = '';
  riskWarning.value = '';
  try {
    snapshot.value = await getPortfolioSnapshotApi({
      accountId: queryAccountId.value,
      costMethod: costMethod.value,
    });
    try {
      risk.value = await getPortfolioRiskApi({
        accountId: queryAccountId.value,
        costMethod: costMethod.value,
      });
    } catch (error) {
      risk.value = null;
      riskWarning.value =
        error instanceof Error
          ? error.message
          : '风险数据获取失败，已降级展示持仓快照。';
    }
  } catch (error) {
    snapshot.value = null;
    risk.value = null;
    errorMessage.value =
      error instanceof Error ? error.message : '持仓快照加载失败。';
  } finally {
    loading.value = false;
  }
}

async function loadEvents(page = eventPage.value) {
  eventLoading.value = true;
  try {
    if (selectedEventType.value === 'trade') {
      const response = await listPortfolioTradesApi({
        accountId: queryAccountId.value,
        page,
        pageSize: EVENT_PAGE_SIZE,
      });
      tradeEvents.value = response.items || [];
      eventTotal.value = response.total || 0;
    } else if (selectedEventType.value === 'cash') {
      const response = await listPortfolioCashLedgerApi({
        accountId: queryAccountId.value,
        page,
        pageSize: EVENT_PAGE_SIZE,
      });
      cashEvents.value = response.items || [];
      eventTotal.value = response.total || 0;
    } else {
      const response = await listPortfolioCorporateActionsApi({
        accountId: queryAccountId.value,
        page,
        pageSize: EVENT_PAGE_SIZE,
      });
      corporateEvents.value = response.items || [];
      eventTotal.value = response.total || 0;
    }
    eventPage.value = page;
  } finally {
    eventLoading.value = false;
  }
}

async function refreshAll(page = eventPage.value) {
  await Promise.all([loadAccounts(), loadSnapshotAndRisk(), loadEvents(page)]);
}

async function refreshAllWithBrokers(page = eventPage.value) {
  await Promise.all([refreshAll(page), loadBrokers()]);
}

async function handleAccountCreate() {
  const name = accountForm.name.trim();
  if (!name) {
    message.warning('账户名称不能为空。');
    return;
  }
  submitting.value = true;
  try {
    const created = await createPortfolioAccountApi({
      baseCurrency: accountForm.baseCurrency.trim() || 'CNY',
      broker: accountForm.broker.trim() || undefined,
      market: accountForm.market,
      name,
    });
    selectedAccount.value = created.id;
    accountForm.name = '';
    accountForm.broker = '';
    message.success('账户已创建。');
    await refreshAll(1);
  } finally {
    submitting.value = false;
  }
}

async function handleTradeSubmit() {
  if (!ensureWritableAccount()) return;
  const account = writableAccount.value;
  if (!account) return;
  if (!tradeForm.symbol || !tradeForm.quantity || !tradeForm.price) {
    message.warning('请填写代码、数量和价格。');
    return;
  }
  submitting.value = true;
  try {
    await createPortfolioTradeApi({
      accountId: account.id,
      fee: tradeForm.fee || 0,
      note: tradeForm.note || undefined,
      price: tradeForm.price,
      quantity: tradeForm.quantity,
      side: tradeForm.side,
      symbol: tradeForm.symbol.trim(),
      tax: tradeForm.tax || 0,
      tradeDate: tradeForm.tradeDate,
    });
    tradeForm.symbol = '';
    tradeForm.note = '';
    message.success('交易流水已保存。');
    await refreshAll(1);
  } finally {
    submitting.value = false;
  }
}

async function handleCashSubmit() {
  if (!ensureWritableAccount()) return;
  const account = writableAccount.value;
  if (!account) return;
  if (!cashForm.amount) {
    message.warning('请填写资金金额。');
    return;
  }
  submitting.value = true;
  try {
    await createPortfolioCashLedgerApi({
      accountId: account.id,
      amount: cashForm.amount,
      currency: cashForm.currency.trim() || undefined,
      direction: cashForm.direction,
      eventDate: cashForm.eventDate,
      note: cashForm.note || undefined,
    });
    cashForm.note = '';
    message.success('资金流水已保存。');
    await refreshAll(1);
  } finally {
    submitting.value = false;
  }
}

async function handleCorporateSubmit() {
  if (!ensureWritableAccount()) return;
  const account = writableAccount.value;
  if (!account) return;
  if (!corporateForm.symbol) {
    message.warning('请填写股票代码。');
    return;
  }
  submitting.value = true;
  try {
    await createPortfolioCorporateActionApi({
      accountId: account.id,
      actionType: corporateForm.actionType,
      cashDividendPerShare: corporateForm.cashDividendPerShare,
      effectiveDate: corporateForm.effectiveDate,
      note: corporateForm.note || undefined,
      splitRatio: corporateForm.splitRatio,
      symbol: corporateForm.symbol.trim(),
    });
    corporateForm.symbol = '';
    corporateForm.note = '';
    message.success('公司行为已保存。');
    await refreshAll(1);
  } finally {
    submitting.value = false;
  }
}

async function handleRefreshFx() {
  if (fxRefreshing.value) return;
  fxRefreshing.value = true;
  fxRefreshFeedback.value = null;
  try {
    const result = await refreshPortfolioFxApi({
      accountId: queryAccountId.value,
    });
    fxRefreshFeedback.value = buildFxRefreshFeedback(result);
    await loadSnapshotAndRisk();
  } finally {
    fxRefreshing.value = false;
  }
}

function handleCsvFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  csvFile.value = input.files?.[0] || null;
  csvParseResult.value = null;
  csvCommitResult.value = null;
}

async function handleParseCsv() {
  if (!csvFile.value) {
    message.warning('请先选择 CSV 文件。');
    return;
  }
  csvParsing.value = true;
  try {
    csvParseResult.value = await parsePortfolioCsvImportApi(
      selectedBroker.value,
      csvFile.value,
    );
    csvCommitResult.value = null;
  } finally {
    csvParsing.value = false;
  }
}

async function handleCommitCsv() {
  if (!ensureWritableAccount()) return;
  const account = writableAccount.value;
  if (!account) return;
  if (!csvFile.value) {
    message.warning('请先选择 CSV 文件。');
    return;
  }
  csvCommitting.value = true;
  try {
    csvCommitResult.value = await commitPortfolioCsvImportApi(
      account.id,
      selectedBroker.value,
      csvFile.value,
      csvDryRun.value,
    );
    if (!csvDryRun.value) {
      await refreshAll(1);
    }
  } finally {
    csvCommitting.value = false;
  }
}

function confirmDelete(type: EventType, id: number) {
  Modal.confirm({
    content: '删除后会重新计算持仓快照，确认继续？',
    okText: '删除',
    okType: 'danger',
    title: '删除流水',
    async onOk() {
      if (type === 'trade') {
        await deletePortfolioTradeApi(id);
      } else if (type === 'cash') {
        await deletePortfolioCashLedgerApi(id);
      } else {
        await deletePortfolioCorporateActionApi(id);
      }
      message.success('已删除。');
      await refreshAll(eventPage.value);
    },
  });
}

function analyzePosition(row: FlatPosition) {
  router.push({
    path: '/workspace',
    query: { stock: row.symbol },
  });
}

function askPosition(row: FlatPosition) {
  router.push({
    path: '/agent/chat',
    query: {
      prompt: `${row.symbol} 当前持仓 ${row.quantity} 股，成本 ${formatNumber(row.avgCost)}，未实现盈亏 ${formatMoney(row.unrealizedPnlBase, row.valuationCurrency)}，帮我评估后续操作。`,
    },
  });
}

function analyzePositionRecord(record: Record<string, unknown>) {
  analyzePosition(record as unknown as FlatPosition);
}

function askPositionRecord(record: Record<string, unknown>) {
  askPosition(record as unknown as FlatPosition);
}

async function handleScopeChange() {
  eventPage.value = 1;
  await Promise.all([loadSnapshotAndRisk(), loadEvents(1)]);
}

async function handleEventTypeChange() {
  eventPage.value = 1;
  await loadEvents(1);
}

onMounted(async () => {
  await Promise.all([refreshAll(1), loadBrokers()]);
});
</script>

<template>
  <Page
    auto-content-height
    description="管理账户、交易流水与持仓风险，支持从持仓直接进入分析和问股。"
    title="持仓"
  >
    <div class="portfolio-page">
      <Alert
        v-if="errorMessage"
        show-icon
        type="error"
        :message="errorMessage"
      />
      <Alert
        v-if="riskWarning"
        show-icon
        type="warning"
        :message="riskWarning"
      />
      <Alert
        v-if="fxRefreshFeedback"
        show-icon
        :type="fxRefreshFeedback.tone"
        :message="fxRefreshFeedback.text"
      />

      <Card :bordered="false">
        <div class="toolbar">
          <Space wrap>
            <Select
              v-model:value="selectedAccount"
              class="account-select"
              :options="accountOptions"
              @change="handleScopeChange"
            />
            <Select
              v-model:value="costMethod"
              class="method-select"
              :options="[
                { label: 'FIFO 成本', value: 'fifo' },
                { label: '平均成本', value: 'avg' },
              ]"
              @change="handleScopeChange"
            />
            <Button
              :loading="loading"
              type="primary"
              @click="refreshAllWithBrokers()"
            >
              刷新
            </Button>
            <Button :loading="fxRefreshing" @click="handleRefreshFx">
              刷新汇率
            </Button>
          </Space>
          <Tag v-if="snapshot?.fxStale" color="warning">汇率可能过期</Tag>
        </div>
      </Card>

      <div class="summary-grid">
        <Card :bordered="false">
          <Statistic
            title="总权益"
            :value="snapshot?.totalEquity ?? 0"
            :precision="2"
            :suffix="snapshot?.currency"
          />
        </Card>
        <Card :bordered="false">
          <Statistic
            title="持仓市值"
            :value="snapshot?.totalMarketValue ?? 0"
            :precision="2"
            :suffix="snapshot?.currency"
          />
        </Card>
        <Card :bordered="false">
          <Statistic
            title="现金"
            :value="snapshot?.totalCash ?? 0"
            :precision="2"
            :suffix="snapshot?.currency"
          />
        </Card>
        <Card :bordered="false">
          <Statistic
            title="未实现盈亏"
            :value="snapshot?.unrealizedPnl ?? 0"
            :precision="2"
            :suffix="snapshot?.currency"
            :value-style="{
              color:
                (snapshot?.unrealizedPnl ?? 0) >= 0 ? '#1677ff' : '#cf1322',
            }"
          />
        </Card>
      </div>

      <div class="content-grid">
        <Card title="账户" :bordered="false">
          <Form layout="vertical">
            <div class="form-grid">
              <FormItem label="账户名称">
                <Input
                  v-model:value="accountForm.name"
                  placeholder="例如：主账户"
                />
              </FormItem>
              <FormItem label="市场">
                <Select
                  v-model:value="accountForm.market"
                  :options="[
                    { label: 'A 股', value: 'cn' },
                    { label: '港股', value: 'hk' },
                    { label: '美股', value: 'us' },
                  ]"
                />
              </FormItem>
              <FormItem label="本位币">
                <Input v-model:value="accountForm.baseCurrency" />
              </FormItem>
              <FormItem label="券商">
                <Input v-model:value="accountForm.broker" placeholder="可选" />
              </FormItem>
            </div>
            <Button
              :loading="submitting"
              type="primary"
              @click="handleAccountCreate"
            >
              新增账户
            </Button>
          </Form>

          <Table
            class="inner-table"
            :columns="accountColumns"
            :data-source="accounts"
            :pagination="false"
            row-key="id"
            size="small"
          />
        </Card>

        <Card title="风险摘要" :bordered="false">
          <div v-if="risk" class="risk-grid">
            <div>
              <span>最大回撤</span>
              <strong>{{ formatPct(risk.drawdown.maxDrawdownPct) }}</strong>
            </div>
            <div>
              <span>当前回撤</span>
              <strong>{{ formatPct(risk.drawdown.currentDrawdownPct) }}</strong>
            </div>
            <div>
              <span>最大持仓权重</span>
              <strong>{{ formatPct(risk.concentration.topWeightPct) }}</strong>
            </div>
            <div>
              <span>止损触发</span>
              <strong>{{ risk.stopLoss.triggeredCount }}</strong>
            </div>
          </div>
          <Empty v-else description="暂无风险数据" />

          <div class="risk-list" v-if="topPositions.length > 0">
            <h4>集中度</h4>
            <div v-for="item in topPositions.slice(0, 5)" :key="item.symbol">
              <span>{{ item.symbol }}</span>
              <Tag :color="item.isAlert ? 'error' : 'blue'">
                {{ formatPct(item.weightPct) }}
              </Tag>
            </div>
          </div>

          <div class="risk-list" v-if="topSectors.length > 0">
            <h4>行业分布</h4>
            <div v-for="item in topSectors.slice(0, 5)" :key="item.sector">
              <span>{{ item.sector }}</span>
              <Tag :color="item.isAlert ? 'error' : 'green'">
                {{ formatPct(item.weightPct) }}
              </Tag>
            </div>
          </div>
        </Card>
      </div>

      <Card title="当前持仓" :bordered="false">
        <Table
          :columns="positionColumns"
          :data-source="positionRows"
          :loading="loading"
          :pagination="{ pageSize: 12 }"
          row-key="symbol"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'symbol'">
              <Space>
                <strong>{{ record.symbol }}</strong>
                <Tag v-if="record.priceAvailable === false" color="warning">
                  缺价
                </Tag>
              </Space>
            </template>
            <template v-else-if="column.key === 'quantity'">
              {{ formatNumber(record.quantity, 0) }}
            </template>
            <template v-else-if="column.key === 'avgCost'">
              {{ formatNumber(record.avgCost, 4) }}
            </template>
            <template v-else-if="column.key === 'lastPrice'">
              {{
                record.priceAvailable === false
                  ? '-'
                  : formatNumber(record.lastPrice, 4)
              }}
            </template>
            <template v-else-if="column.key === 'marketValueBase'">
              {{
                formatMoney(record.marketValueBase, record.valuationCurrency)
              }}
            </template>
            <template v-else-if="column.key === 'unrealizedPnlBase'">
              <span
                :class="record.unrealizedPnlBase >= 0 ? 'positive' : 'negative'"
              >
                {{
                  formatMoney(
                    record.unrealizedPnlBase,
                    record.valuationCurrency,
                  )
                }}
              </span>
            </template>
            <template v-else-if="column.key === 'unrealizedPnlPct'">
              <span
                :class="
                  (record.unrealizedPnlPct ?? 0) >= 0 ? 'positive' : 'negative'
                "
              >
                {{ formatPct(record.unrealizedPnlPct) }}
              </span>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button
                  size="small"
                  type="link"
                  @click="analyzePositionRecord(record)"
                >
                  分析
                </Button>
                <Button
                  size="small"
                  type="link"
                  @click="askPositionRecord(record)"
                >
                  问股
                </Button>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <Card title="流水录入" :bordered="false">
        <Tabs
          v-model:active-key="selectedEventType"
          @change="handleEventTypeChange"
        >
          <TabPane key="trade" tab="交易">
            <Form layout="vertical">
              <div class="form-grid event-form">
                <FormItem label="交易日期">
                  <Input v-model:value="tradeForm.tradeDate" type="date" />
                </FormItem>
                <FormItem label="代码">
                  <Input
                    v-model:value="tradeForm.symbol"
                    placeholder="600519"
                  />
                </FormItem>
                <FormItem label="方向">
                  <Select
                    v-model:value="tradeForm.side"
                    :options="[
                      { label: '买入', value: 'buy' },
                      { label: '卖出', value: 'sell' },
                    ]"
                  />
                </FormItem>
                <FormItem label="数量">
                  <InputNumber
                    v-model:value="tradeForm.quantity"
                    class="wide-input"
                    :min="0"
                  />
                </FormItem>
                <FormItem label="价格">
                  <InputNumber
                    v-model:value="tradeForm.price"
                    class="wide-input"
                    :min="0"
                  />
                </FormItem>
                <FormItem label="费用">
                  <InputNumber
                    v-model:value="tradeForm.fee"
                    class="wide-input"
                    :min="0"
                  />
                </FormItem>
                <FormItem label="税费">
                  <InputNumber
                    v-model:value="tradeForm.tax"
                    class="wide-input"
                    :min="0"
                  />
                </FormItem>
                <FormItem label="备注">
                  <Input v-model:value="tradeForm.note" />
                </FormItem>
              </div>
              <Button
                :loading="submitting"
                type="primary"
                @click="handleTradeSubmit"
              >
                保存交易
              </Button>
            </Form>
          </TabPane>

          <TabPane key="cash" tab="资金">
            <Form layout="vertical">
              <div class="form-grid event-form">
                <FormItem label="日期">
                  <Input v-model:value="cashForm.eventDate" type="date" />
                </FormItem>
                <FormItem label="方向">
                  <Select
                    v-model:value="cashForm.direction"
                    :options="[
                      { label: '流入', value: 'in' },
                      { label: '流出', value: 'out' },
                    ]"
                  />
                </FormItem>
                <FormItem label="金额">
                  <InputNumber
                    v-model:value="cashForm.amount"
                    class="wide-input"
                    :min="0"
                  />
                </FormItem>
                <FormItem label="币种">
                  <Input
                    v-model:value="cashForm.currency"
                    placeholder="默认账户本位币"
                  />
                </FormItem>
                <FormItem label="备注">
                  <Input v-model:value="cashForm.note" />
                </FormItem>
              </div>
              <Button
                :loading="submitting"
                type="primary"
                @click="handleCashSubmit"
              >
                保存资金流水
              </Button>
            </Form>
          </TabPane>

          <TabPane key="corporate" tab="公司行为">
            <Form layout="vertical">
              <div class="form-grid event-form">
                <FormItem label="生效日期">
                  <Input
                    v-model:value="corporateForm.effectiveDate"
                    type="date"
                  />
                </FormItem>
                <FormItem label="代码">
                  <Input v-model:value="corporateForm.symbol" />
                </FormItem>
                <FormItem label="类型">
                  <Select
                    v-model:value="corporateForm.actionType"
                    :options="[
                      { label: '现金分红', value: 'cash_dividend' },
                      { label: '拆并股调整', value: 'split_adjustment' },
                    ]"
                  />
                </FormItem>
                <FormItem label="每股分红">
                  <InputNumber
                    v-model:value="corporateForm.cashDividendPerShare"
                    class="wide-input"
                    :min="0"
                  />
                </FormItem>
                <FormItem label="拆并比例">
                  <InputNumber
                    v-model:value="corporateForm.splitRatio"
                    class="wide-input"
                    :min="0"
                  />
                </FormItem>
                <FormItem label="备注">
                  <Input v-model:value="corporateForm.note" />
                </FormItem>
              </div>
              <Button
                :loading="submitting"
                type="primary"
                @click="handleCorporateSubmit"
              >
                保存公司行为
              </Button>
            </Form>
          </TabPane>
        </Tabs>
      </Card>

      <Card title="券商 CSV 导入" :bordered="false">
        <Alert
          v-if="brokerLoadWarning"
          class="csv-alert"
          show-icon
          type="warning"
          :message="brokerLoadWarning"
        />
        <Form layout="vertical">
          <div class="csv-grid">
            <FormItem label="券商模板">
              <Select v-model:value="selectedBroker" :options="brokerOptions" />
            </FormItem>
            <FormItem label="CSV 文件">
              <label class="file-picker">
                <span>{{ csvFile?.name || '选择 CSV 文件' }}</span>
                <input
                  accept=".csv"
                  type="file"
                  @change="handleCsvFileChange"
                />
              </label>
            </FormItem>
            <FormItem label="导入模式">
              <label class="dry-run">
                <input v-model="csvDryRun" type="checkbox" />
                <span>仅预演，不写入流水</span>
              </label>
            </FormItem>
            <FormItem label="操作">
              <Space>
                <Button
                  :disabled="!csvFile"
                  :loading="csvParsing"
                  @click="handleParseCsv"
                >
                  解析文件
                </Button>
                <Button
                  :disabled="!csvFile || !writableAccount"
                  :loading="csvCommitting"
                  type="primary"
                  @click="handleCommitCsv"
                >
                  提交导入
                </Button>
              </Space>
            </FormItem>
          </div>
        </Form>

        <div class="csv-result-grid">
          <Alert
            v-if="csvParseResult"
            show-icon
            :type="
              csvParseResult.errorCount > 0 || csvParseResult.skippedCount > 0
                ? 'warning'
                : 'info'
            "
            :message="`解析结果：有效 ${csvParseResult.recordCount} 条，跳过 ${csvParseResult.skippedCount} 条，错误 ${csvParseResult.errorCount} 条。`"
          />
          <Alert
            v-if="csvCommitResult"
            show-icon
            :type="
              csvCommitResult.failedCount > 0 ||
              csvCommitResult.duplicateCount > 0
                ? 'warning'
                : csvDryRun
                  ? 'info'
                  : 'success'
            "
            :message="`${csvCommitResult.dryRun ? '预演检查' : '实际写入'}：写入 ${csvCommitResult.insertedCount} 条，重复 ${csvCommitResult.duplicateCount} 条，失败 ${csvCommitResult.failedCount} 条。`"
          />
        </div>

        <Table
          v-if="csvParseResult?.records.length"
          class="inner-table"
          :columns="importPreviewColumns"
          :data-source="csvParseResult.records.slice(0, 8)"
          :pagination="false"
          row-key="dedupHash"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'side'">
              <Tag :color="record.side === 'buy' ? 'blue' : 'orange'">
                {{ sideLabel(record.side) }}
              </Tag>
            </template>
          </template>
        </Table>

        <div
          v-if="csvParseResult?.errors.length || csvCommitResult?.errors.length"
          class="csv-errors"
        >
          <div
            v-for="item in [
              ...(csvParseResult?.errors || []),
              ...(csvCommitResult?.errors || []),
            ].slice(0, 6)"
            :key="item"
          >
            {{ item }}
          </div>
        </div>
      </Card>

      <Card title="流水记录" :bordered="false">
        <Table
          v-if="selectedEventType === 'trade'"
          :columns="tradeColumns"
          :data-source="tradeEvents"
          :loading="eventLoading"
          :pagination="{
            current: eventPage,
            pageSize: EVENT_PAGE_SIZE,
            total: eventTotal,
            onChange: loadEvents,
          }"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'side'">
              <Tag :color="record.side === 'buy' ? 'blue' : 'orange'">
                {{ sideLabel(record.side) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Button
                danger
                size="small"
                type="link"
                @click="confirmDelete('trade', record.id)"
              >
                删除
              </Button>
            </template>
          </template>
        </Table>

        <Table
          v-else-if="selectedEventType === 'cash'"
          :columns="cashColumns"
          :data-source="cashEvents"
          :loading="eventLoading"
          :pagination="{
            current: eventPage,
            pageSize: EVENT_PAGE_SIZE,
            total: eventTotal,
            onChange: loadEvents,
          }"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'direction'">
              <Tag :color="record.direction === 'in' ? 'green' : 'orange'">
                {{ directionLabel(record.direction) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Button
                danger
                size="small"
                type="link"
                @click="confirmDelete('cash', record.id)"
              >
                删除
              </Button>
            </template>
          </template>
        </Table>

        <Table
          v-else
          :columns="corporateColumns"
          :data-source="corporateEvents"
          :loading="eventLoading"
          :pagination="{
            current: eventPage,
            pageSize: EVENT_PAGE_SIZE,
            total: eventTotal,
            onChange: loadEvents,
          }"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actionType'">
              {{ corporateActionLabel(record.actionType) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <Button
                danger
                size="small"
                type="link"
                @click="confirmDelete('corporate', record.id)"
              >
                删除
              </Button>
            </template>
          </template>
        </Table>
      </Card>

      <Card v-if="stopLossItems.length > 0" title="止损关注" :bordered="false">
        <div class="risk-list">
          <div
            v-for="item in stopLossItems"
            :key="`${item.accountId}-${item.symbol}`"
          >
            <span>{{ item.symbol }}</span>
            <Tag :color="item.isTriggered ? 'error' : 'warning'">
              {{ formatPct(item.lossPct) }}
            </Tag>
          </div>
        </div>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.portfolio-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.account-select {
  width: 260px;
}

.method-select {
  width: 140px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.event-form {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.csv-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 12px;
}

.csv-alert {
  margin-bottom: 16px;
}

.csv-result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.csv-errors {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  font-size: 12px;
  color: #cf1322;
}

.dry-run,
.file-picker {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
}

.dry-run {
  gap: 8px;
}

.file-picker {
  justify-content: center;
  padding: 4px 11px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.file-picker span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-picker input {
  display: none;
}

.wide-input {
  width: 100%;
}

.inner-table {
  margin-top: 16px;
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.risk-grid div {
  padding: 12px;
  background: hsl(var(--background-deep));
  border-radius: 8px;
}

.risk-grid span,
.risk-list span {
  color: hsl(var(--muted-foreground));
}

.risk-grid strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.risk-list h4 {
  margin: 0;
}

.risk-list div {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.positive {
  color: #1677ff;
}

.negative {
  color: #cf1322;
}

@media (max-width: 1200px) {
  .summary-grid,
  .content-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .event-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .csv-grid,
  .csv-result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .account-select,
  .method-select {
    width: 100%;
  }

  .summary-grid,
  .content-grid,
  .csv-grid,
  .csv-result-grid,
  .event-form,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
