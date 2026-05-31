<script lang="ts" setup>
import type {
  BacktestPerformanceMetrics,
  BacktestResultItem,
  BacktestRunResponse,
} from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  getBacktestPerformanceApi,
  getBacktestResultsApi,
  getStockBacktestPerformanceApi,
  runBacktestApi,
} from '#/api';

defineOptions({ name: 'BacktestOverview' });

const PAGE_SIZE = 20;

const resultColumns = [
  { dataIndex: 'code', key: 'code', title: '股票', width: 140 },
  {
    dataIndex: 'analysisDate',
    key: 'analysisDate',
    title: '分析日期',
    width: 120,
  },
  {
    dataIndex: 'trendPrediction',
    key: 'prediction',
    title: 'AI 预测',
    width: 220,
  },
  {
    dataIndex: 'actualReturnPct',
    key: 'actual',
    title: '实际表现',
    width: 150,
  },
  {
    dataIndex: 'directionCorrect',
    key: 'direction',
    title: '方向匹配',
    width: 120,
  },
  { dataIndex: 'outcome', key: 'outcome', title: '结果', width: 100 },
  { dataIndex: 'evalStatus', key: 'status', title: '状态', width: 110 },
  { key: 'action', title: '操作', width: 120 },
];

const router = useRouter();
const route = useRoute();

const filters = reactive({
  analysisDateFrom: '',
  analysisDateTo: '',
  code: '',
  evalWindowDays: undefined as number | undefined,
  force: false,
  limit: 200,
  page: 1,
});

const loadingResults = ref(false);
const loadingPerformance = ref(false);
const running = ref(false);
const errorMessage = ref('');
const runResult = ref<BacktestRunResponse | null>(null);
const results = ref<BacktestResultItem[]>([]);
const total = ref(0);
const overallPerformance = ref<BacktestPerformanceMetrics | null>(null);
const stockPerformance = ref<BacktestPerformanceMetrics | null>(null);

const effectiveWindowDays = computed(
  () => filters.evalWindowDays || overallPerformance.value?.evalWindowDays,
);

const isNextDayValidation = computed(() => effectiveWindowDays.value === 1);

const resultScopeText = computed(() => {
  const parts = [
    filters.code.trim() || '全部股票',
    effectiveWindowDays.value ? `${effectiveWindowDays.value} 日窗口` : '',
    filters.analysisDateFrom ? `自 ${filters.analysisDateFrom}` : '',
    filters.analysisDateTo ? `至 ${filters.analysisDateTo}` : '',
  ].filter(Boolean);
  return parts.join(' · ');
});

function pct(value?: null | number, digits = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${value.toFixed(digits)}%`;
}

function signedPct(value?: null | number, digits = 1) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

function statusTone(status: string) {
  if (status === 'completed') return 'success';
  if (status === 'error') return 'error';
  if (status === 'insufficient' || status === 'insufficient_data') {
    return 'warning';
  }
  return 'default';
}

function statusIcon(status: string) {
  if (status === 'completed') return '✓';
  if (status === 'error') return '!';
  if (status === 'insufficient' || status === 'insufficient_data') return '…';
  return '?';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    completed: '已完成',
    error: '错误',
    insufficient: '数据不足',
    insufficient_data: '数据不足',
  };
  return labels[status] || status;
}

function outcomeTone(outcome?: string) {
  if (outcome === 'win') return 'success';
  if (outcome === 'loss') return 'error';
  if (outcome === 'neutral') return 'warning';
  return 'default';
}

function outcomeLabel(outcome?: string) {
  const labels: Record<string, string> = {
    loss: '亏损',
    neutral: '中性',
    win: '盈利',
  };
  return outcome ? labels[outcome] || outcome : '-';
}

function movementLabel(value?: string) {
  const labels: Record<string, string> = {
    down: '下跌',
    flat: '持平',
    up: '上涨',
  };
  return value ? labels[value] || value : '-';
}

function expectedLabel(value?: string) {
  const labels: Record<string, string> = {
    cash: '空仓',
    down: '看跌',
    flat: '持平',
    long: '做多',
    not_down: '不看跌',
    up: '看涨',
  };
  return value ? labels[value] || value : '-';
}

function performanceQuery() {
  return {
    analysisDateFrom: filters.analysisDateFrom || undefined,
    analysisDateTo: filters.analysisDateTo || undefined,
    evalWindowDays: filters.evalWindowDays,
  };
}

function listQuery(page = filters.page) {
  return {
    ...performanceQuery(),
    code: filters.code.trim() || undefined,
    limit: PAGE_SIZE,
    page,
  };
}

async function loadResults(page = filters.page) {
  loadingResults.value = true;
  try {
    const response = await getBacktestResultsApi(listQuery(page));
    results.value = response.items || [];
    total.value = response.total || 0;
    filters.page = response.page || page;
  } finally {
    loadingResults.value = false;
  }
}

async function loadPerformance() {
  loadingPerformance.value = true;
  const code = filters.code.trim();
  try {
    try {
      overallPerformance.value =
        await getBacktestPerformanceApi(performanceQuery());
      if (!filters.evalWindowDays && overallPerformance.value?.evalWindowDays) {
        filters.evalWindowDays = overallPerformance.value.evalWindowDays;
      }
    } catch {
      overallPerformance.value = null;
    }

    if (code) {
      try {
        stockPerformance.value = await getStockBacktestPerformanceApi(
          code,
          performanceQuery(),
        );
      } catch {
        stockPerformance.value = null;
      }
    } else {
      stockPerformance.value = null;
    }
  } finally {
    loadingPerformance.value = false;
  }
}

async function refreshPage(page = filters.page, includePerformance = true) {
  errorMessage.value = '';
  try {
    await (includePerformance
      ? Promise.all([loadResults(page), loadPerformance()])
      : loadResults(page));
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '回测数据加载失败。';
    results.value = [];
    total.value = 0;
  }
}

async function handleFilter() {
  filters.page = 1;
  await refreshPage(1);
}

async function handleRunBacktest() {
  running.value = true;
  errorMessage.value = '';
  runResult.value = null;
  try {
    runResult.value = await runBacktestApi({
      code: filters.code.trim() || undefined,
      evalWindowDays: filters.evalWindowDays,
      force: filters.force,
      limit: filters.limit,
      minAgeDays: filters.force ? 0 : undefined,
    });
    message.success('回测执行完成。');
    await refreshPage(1);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '回测执行失败。';
  } finally {
    running.value = false;
  }
}

async function showNextDayValidation() {
  filters.evalWindowDays = 1;
  await handleFilter();
}

function analyzeAgain(row: BacktestResultItem) {
  router.push({
    path: '/workspace',
    query: { stock: row.code },
  });
}

function analyzeAgainRecord(record: Record<string, unknown>) {
  analyzeAgain(record as unknown as BacktestResultItem);
}

function hydrateFromRouteQuery() {
  const code = route.query.code;
  if (typeof code === 'string' && code.trim()) {
    filters.code = code.trim().toUpperCase();
  }
}

onMounted(async () => {
  hydrateFromRouteQuery();
  await refreshPage(1, false);
});
</script>

<template>
  <Page
    auto-content-height
    description="评估历史分析在指定窗口内的方向、收益、止盈止损命中和整体表现。"
    title="策略回测"
  >
    <div class="backtest-page">
      <Alert
        v-if="errorMessage"
        show-icon
        type="error"
        :message="errorMessage"
      />
      <Alert
        v-else-if="!loadingResults && results.length === 0"
        show-icon
        type="info"
        message="当前筛选条件下暂无回测结果，可调整日期/窗口或先运行回测。"
      />

      <Card :bordered="false">
        <Form layout="vertical">
          <div class="filter-grid">
            <FormItem label="股票代码">
              <Input
                v-model:value="filters.code"
                allow-clear
                placeholder="留空表示全部"
                @press-enter="handleFilter"
              />
            </FormItem>
            <FormItem label="评估窗口">
              <InputNumber
                v-model:value="filters.evalWindowDays"
                class="wide-input"
                :max="120"
                :min="1"
                placeholder="默认使用最近汇总窗口"
              />
            </FormItem>
            <FormItem label="分析开始日期">
              <Input v-model:value="filters.analysisDateFrom" type="date" />
            </FormItem>
            <FormItem label="分析结束日期">
              <Input v-model:value="filters.analysisDateTo" type="date" />
            </FormItem>
            <FormItem label="处理上限">
              <InputNumber
                v-model:value="filters.limit"
                class="wide-input"
                :max="2000"
                :min="1"
              />
            </FormItem>
            <FormItem label="运行选项">
              <Checkbox v-model:checked="filters.force">强制重跑</Checkbox>
            </FormItem>
            <FormItem label="操作">
              <Space wrap>
                <Button :loading="loadingResults" @click="handleFilter">
                  筛选
                </Button>
                <Button
                  :type="isNextDayValidation ? 'primary' : 'default'"
                  @click="showNextDayValidation"
                >
                  1 日验证
                </Button>
                <Button
                  :loading="running"
                  type="primary"
                  @click="handleRunBacktest"
                >
                  运行回测
                </Button>
              </Space>
            </FormItem>
          </div>
        </Form>

        <Alert
          class="mode-alert"
          show-icon
          type="info"
          :message="
            isNextDayValidation
              ? '1 日验证模式会使用下一个交易日表现校验 AI 预测。'
              : '将评估窗口设为 1，可查看 AI 预测与下一个交易日收盘表现的匹配情况。'
          "
        />
      </Card>

      <div v-if="runResult" class="run-grid">
        <Card :bordered="false">
          <Statistic title="候选记录" :value="runResult.processed" />
        </Card>
        <Card :bordered="false">
          <Statistic title="写入结果" :value="runResult.saved" />
        </Card>
        <Card :bordered="false">
          <Statistic title="完成回测" :value="runResult.completed" />
        </Card>
        <Card :bordered="false">
          <Statistic title="数据不足" :value="runResult.insufficient" />
        </Card>
        <Card :bordered="false">
          <Statistic title="错误" :value="runResult.errors" />
        </Card>
      </div>

      <div class="performance-grid">
        <Card title="整体表现" :bordered="false" :loading="loadingPerformance">
          <template v-if="overallPerformance">
            <div class="metric-grid">
              <Statistic
                title="方向准确率"
                :precision="1"
                suffix="%"
                :value="overallPerformance.directionAccuracyPct ?? 0"
              />
              <Statistic
                title="胜率"
                :precision="1"
                suffix="%"
                :value="overallPerformance.winRatePct ?? 0"
              />
              <Statistic
                title="平均模拟收益"
                :precision="1"
                suffix="%"
                :value="overallPerformance.avgSimulatedReturnPct ?? 0"
              />
              <Statistic
                title="平均个股收益"
                :precision="1"
                suffix="%"
                :value="overallPerformance.avgStockReturnPct ?? 0"
              />
            </div>
            <Descriptions class="metric-detail" :column="2" size="small">
              <Descriptions.Item label="评估数">
                {{ overallPerformance.completedCount }} /
                {{ overallPerformance.totalEvaluations }}
              </Descriptions.Item>
              <Descriptions.Item label="盈/亏/中">
                {{ overallPerformance.winCount }} /
                {{ overallPerformance.lossCount }} /
                {{ overallPerformance.neutralCount }}
              </Descriptions.Item>
              <Descriptions.Item label="止损触发率">
                {{ pct(overallPerformance.stopLossTriggerRate) }}
              </Descriptions.Item>
              <Descriptions.Item label="止盈触发率">
                {{ pct(overallPerformance.takeProfitTriggerRate) }}
              </Descriptions.Item>
            </Descriptions>
          </template>
          <Empty v-else description="暂无整体回测表现" />
        </Card>

        <Card
          :title="
            filters.code.trim() ? `${filters.code.trim()} 表现` : '单股表现'
          "
          :bordered="false"
          :loading="loadingPerformance"
        >
          <template v-if="stockPerformance">
            <div class="metric-grid">
              <Statistic
                title="方向准确率"
                :precision="1"
                suffix="%"
                :value="stockPerformance.directionAccuracyPct ?? 0"
              />
              <Statistic
                title="胜率"
                :precision="1"
                suffix="%"
                :value="stockPerformance.winRatePct ?? 0"
              />
              <Statistic
                title="平均模拟收益"
                :precision="1"
                suffix="%"
                :value="stockPerformance.avgSimulatedReturnPct ?? 0"
              />
              <Statistic
                title="平均命中天数"
                :precision="1"
                :value="stockPerformance.avgDaysToFirstHit ?? 0"
              />
            </div>
            <Descriptions class="metric-detail" :column="2" size="small">
              <Descriptions.Item label="评估数">
                {{ stockPerformance.completedCount }} /
                {{ stockPerformance.totalEvaluations }}
              </Descriptions.Item>
              <Descriptions.Item label="盈/亏/中">
                {{ stockPerformance.winCount }} /
                {{ stockPerformance.lossCount }} /
                {{ stockPerformance.neutralCount }}
              </Descriptions.Item>
            </Descriptions>
          </template>
          <Empty v-else description="输入股票代码后展示单股表现" />
        </Card>
      </div>

      <Card :bordered="false">
        <template #title>
          <div class="table-title">
            <span>{{ isNextDayValidation ? '次日验证结果' : '回测结果' }}</span>
            <small>{{ resultScopeText }}</small>
          </div>
        </template>
        <Table
          :columns="resultColumns"
          :data-source="results"
          :loading="loadingResults"
          :pagination="{
            current: filters.page,
            pageSize: PAGE_SIZE,
            total,
            showTotal: (totalCount: number) => `共 ${totalCount} 条`,
            onChange: loadResults,
          }"
          row-key="analysisHistoryId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'code'">
              <div class="stock-cell">
                <strong>{{ record.code }}</strong>
                <span>{{ record.stockName || '-' }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'prediction'">
              <Tooltip>
                <template #title>
                  <div>预测：{{ record.trendPrediction || '-' }}</div>
                  <div>建议：{{ record.operationAdvice || '-' }}</div>
                  <div>仓位：{{ record.positionRecommendation || '-' }}</div>
                </template>
                <div class="prediction-cell">
                  <strong>{{ record.trendPrediction || '-' }}</strong>
                  <span>{{ record.operationAdvice || '-' }}</span>
                </div>
              </Tooltip>
            </template>
            <template v-else-if="column.key === 'actual'">
              <Space>
                <Tag>{{ movementLabel(record.actualMovement) }}</Tag>
                <span
                  :class="{
                    negative: (record.actualReturnPct ?? 0) < 0,
                    positive: (record.actualReturnPct ?? 0) > 0,
                  }"
                >
                  {{ signedPct(record.actualReturnPct) }}
                </span>
              </Space>
            </template>
            <template v-else-if="column.key === 'direction'">
              <Space>
                <Tag
                  :color="
                    record.directionCorrect === true
                      ? 'success'
                      : record.directionCorrect === false
                        ? 'error'
                        : 'default'
                  "
                >
                  {{
                    record.directionCorrect === true
                      ? '正确'
                      : record.directionCorrect === false
                        ? '错误'
                        : '未知'
                  }}
                </Tag>
                <span>{{ expectedLabel(record.directionExpected) }}</span>
              </Space>
            </template>
            <template v-else-if="column.key === 'outcome'">
              <Tag :color="outcomeTone(record.outcome)">
                {{ outcomeLabel(record.outcome) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <Tag :color="statusTone(record.evalStatus)">
                {{ statusIcon(record.evalStatus) }}
                {{ statusLabel(record.evalStatus) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Button
                size="small"
                type="link"
                @click="analyzeAgainRecord(record)"
              >
                重新分析
              </Button>
            </template>
          </template>
        </Table>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.backtest-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) repeat(6, minmax(120px, 1fr));
  gap: 0 12px;
  align-items: end;
}

.wide-input {
  width: 100%;
}

.mode-alert {
  margin-top: 4px;
}

.run-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-detail {
  margin-top: 16px;
}

.table-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-title small,
.prediction-cell span,
.stock-cell span {
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}

.prediction-cell,
.stock-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.positive {
  color: #1677ff;
}

.negative {
  color: #cf1322;
}

@media (max-width: 1400px) {
  .filter-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .filter-grid,
  .performance-grid,
  .run-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .filter-grid,
  .performance-grid,
  .run-grid {
    grid-template-columns: 1fr;
  }
}
</style>
