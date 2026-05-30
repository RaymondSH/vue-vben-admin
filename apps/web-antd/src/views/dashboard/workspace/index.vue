<script lang="ts" setup>
import type {
  AnalysisReport,
  HistoryItem,
  SkillInfo,
  TaskInfo,
  TaskStatus,
} from '#/api';

import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  List,
  ListItem,
  message,
  Modal,
  Progress,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Textarea,
  TypographyParagraph,
} from 'ant-design-vue';

import {
  analyzeStockAsyncApi,
  deleteHistoryRecordsApi,
  getAgentSkillsApi,
  getHistoryDetailApi,
  getHistoryListApi,
  getHistoryMarkdownApi,
  getSetupStatusApi,
  getTasksApi,
  getTaskStatusApi,
  getTaskStreamUrl,
  triggerMarketReviewApi,
} from '#/api';
import { toCamelCase } from '#/api/dsa/utils';

defineOptions({ name: 'DsaWorkspace' });

type ReportView = {
  markdown?: string;
  report: AnalysisReport;
  source: 'history' | 'task';
};

const historyColumns = [
  { dataIndex: 'stockCode', key: 'stockCode', title: '股票' },
  { dataIndex: 'operationAdvice', key: 'operationAdvice', title: '建议' },
  { dataIndex: 'sentimentScore', key: 'sentimentScore', title: '评分' },
  { dataIndex: 'createdAt', key: 'createdAt', title: '时间' },
];

const taskColumns = [
  { dataIndex: 'stockCode', key: 'stockCode', title: '股票/任务' },
  { dataIndex: 'status', key: 'status', title: '状态' },
  { dataIndex: 'progress', key: 'progress', title: '进度' },
  { dataIndex: 'message', key: 'message', title: '消息' },
];

const query = ref('');
const notify = ref(true);
const reportType = ref<'brief' | 'detailed' | 'full' | 'simple'>('detailed');
const selectedSkill = ref<string | undefined>();
const forceRefresh = ref(false);
const isSubmitting = ref(false);
const isMarketReviewSubmitting = ref(false);
const loadingHistory = ref(false);
const loadingReport = ref(false);
const loadingTasks = ref(false);
const markdownLoading = ref(false);
const markdownOpen = ref(false);
const markdownContent = ref('');
const setupWarning = ref('');

const skills = ref<SkillInfo[]>([]);
const tasks = ref<TaskInfo[]>([]);
const historyItems = ref<HistoryItem[]>([]);
const selectedHistoryIds = ref<number[]>([]);
const activeReport = ref<null | ReportView>(null);
const activeHistoryId = ref<null | number>(null);
const marketReviewReport = ref('');

const filters = reactive({
  page: 1,
  limit: 20,
  stockCode: '',
});
const historyTotal = ref(0);

let eventSource: EventSource | null = null;
let taskPollTimer: null | number = null;

const selectedSkillOption = computed(() =>
  skills.value.find((item) => item.id === selectedSkill.value),
);

const reportMeta = computed(() => activeReport.value?.report.meta);
const reportSummary = computed(() => activeReport.value?.report.summary);
const reportStrategy = computed(() => activeReport.value?.report.strategy);

const visibleTasks = computed(() =>
  tasks.value.toSorted((a, b) => {
    const left = new Date(a.createdAt || '').getTime();
    const right = new Date(b.createdAt || '').getTime();
    return right - left;
  }),
);

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatPct(value?: null | number) {
  if (typeof value !== 'number') return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function scoreTone(score?: null | number) {
  if (typeof score !== 'number') return 'default';
  if (score >= 70) return 'success';
  if (score >= 45) return 'warning';
  return 'error';
}

function statusTone(status: string) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'processing') return 'processing';
  return 'default';
}

function normalizeTask(data: Record<string, unknown>): TaskInfo {
  return toCamelCase<TaskInfo>(data);
}

function upsertTask(task: TaskInfo) {
  const index = tasks.value.findIndex((item) => item.taskId === task.taskId);
  if (index === -1) {
    tasks.value.unshift(task);
  } else {
    tasks.value[index] = { ...tasks.value[index], ...task };
  }
}

async function loadSetupStatus() {
  try {
    const status = await getSetupStatusApi();
    setupWarning.value =
      status.ready === false
        ? '基础配置未完成，分析能力可能不可用。请先检查系统设置。'
        : '';
  } catch {
    setupWarning.value = '';
  }
}

async function loadSkills() {
  try {
    const response = await getAgentSkillsApi();
    skills.value = response.filter((item) => item.enabled !== false);
  } catch {
    skills.value = [];
  }
}

async function loadTasks() {
  loadingTasks.value = true;
  try {
    const result = await getTasksApi({ limit: 20 });
    tasks.value = result.tasks || [];
  } finally {
    loadingTasks.value = false;
  }
}

async function loadHistory(page = filters.page) {
  loadingHistory.value = true;
  try {
    const result = await getHistoryListApi({
      limit: filters.limit,
      page,
      stockCode: filters.stockCode.trim() || undefined,
    });
    historyItems.value = result.items || [];
    historyTotal.value = result.total || 0;
    filters.page = result.page || page;
  } finally {
    loadingHistory.value = false;
  }
}

async function loadHistoryDetail(recordId: number) {
  loadingReport.value = true;
  activeHistoryId.value = recordId;
  try {
    const report = await getHistoryDetailApi(recordId);
    activeReport.value = { report, source: 'history' };
  } finally {
    loadingReport.value = false;
  }
}

async function loadMarkdown() {
  if (!activeHistoryId.value && !activeReport.value?.markdown) return;
  markdownOpen.value = true;
  if (activeReport.value?.markdown) {
    markdownContent.value = activeReport.value.markdown;
    return;
  }
  markdownLoading.value = true;
  try {
    const recordId = activeHistoryId.value;
    if (recordId) {
      markdownContent.value = await getHistoryMarkdownApi(recordId);
    }
  } finally {
    markdownLoading.value = false;
  }
}

function validateQuery() {
  const value = query.value.trim();
  if (!value) {
    message.warning('请输入股票代码或名称');
    return '';
  }
  return value;
}

async function refreshTaskUntilDone(taskId: string) {
  if (taskPollTimer) {
    window.clearTimeout(taskPollTimer);
  }

  const poll = async () => {
    const status = await getTaskStatusApi(taskId);
    upsertTask(status);
    if (status.status === 'completed') {
      if (status.result?.report) {
        activeReport.value = { report: status.result.report, source: 'task' };
        activeHistoryId.value = status.result.report.meta.id ?? null;
      }
      if (status.marketReviewReport) {
        marketReviewReport.value = status.marketReviewReport;
      }
      await loadHistory(1);
      return;
    }
    if (status.status === 'failed') {
      message.error(status.error || '任务执行失败');
      return;
    }
    taskPollTimer = window.setTimeout(poll, 2500);
  };

  await poll();
}

async function submitAnalysis() {
  const value = validateQuery();
  if (!value) return;

  isSubmitting.value = true;
  try {
    const response = await analyzeStockAsyncApi({
      asyncMode: true,
      forceRefresh: forceRefresh.value,
      notify: notify.value,
      originalQuery: value,
      reportType: reportType.value,
      selectionSource: 'manual',
      skills: selectedSkill.value ? [selectedSkill.value] : undefined,
      stockCode: value,
    });

    if ('taskId' in response) {
      message.success('分析任务已提交');
      upsertTask({
        createdAt: new Date().toISOString(),
        progress: 0,
        reportType: reportType.value,
        status: response.status,
        stockCode: value,
        taskId: response.taskId,
        traceId: response.traceId,
      });
      await refreshTaskUntilDone(response.taskId);
    } else {
      message.success(response.message || '批量任务已提交');
      response.accepted.forEach((item) =>
        upsertTask({
          createdAt: new Date().toISOString(),
          progress: 0,
          reportType: reportType.value,
          status: item.status,
          stockCode: item.stockCode,
          taskId: item.taskId,
          traceId: item.traceId,
        }),
      );
      const first = response.accepted[0];
      if (first) await refreshTaskUntilDone(first.taskId);
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function triggerMarketReview() {
  isMarketReviewSubmitting.value = true;
  marketReviewReport.value = '';
  try {
    const response = await triggerMarketReviewApi({
      sendNotification: notify.value,
    });
    message.success(response.message || '大盘复盘任务已提交');
    if (response.taskId) {
      upsertTask({
        createdAt: new Date().toISOString(),
        progress: 0,
        reportType: 'market_review',
        status: 'pending',
        stockCode: 'MARKET',
        taskId: response.taskId,
        traceId: response.traceId,
      });
      await refreshTaskUntilDone(response.taskId);
    }
    if (response.marketReviewReport) {
      marketReviewReport.value = response.marketReviewReport;
    }
  } finally {
    isMarketReviewSubmitting.value = false;
  }
}

async function deleteSelectedHistory() {
  if (selectedHistoryIds.value.length === 0) return;
  Modal.confirm({
    content: `确认删除 ${selectedHistoryIds.value.length} 条历史报告吗？`,
    okText: '删除',
    okType: 'danger',
    title: '删除历史报告',
    async onOk() {
      await deleteHistoryRecordsApi(selectedHistoryIds.value);
      selectedHistoryIds.value = [];
      activeHistoryId.value = null;
      activeReport.value = null;
      await loadHistory(1);
    },
  });
}

function connectTaskStream() {
  eventSource?.close();
  eventSource = new EventSource(getTaskStreamUrl(), { withCredentials: true });

  const updateFromEvent = (event: MessageEvent<string>) => {
    try {
      upsertTask(normalizeTask(JSON.parse(event.data)));
    } catch {
      // Ignore malformed events.
    }
  };

  eventSource.addEventListener('task_created', updateFromEvent);
  eventSource.addEventListener('task_started', updateFromEvent);
  eventSource.addEventListener('task_progress', updateFromEvent);
  eventSource.addEventListener('task_failed', updateFromEvent);
  eventSource.addEventListener('task_completed', async (event) => {
    updateFromEvent(event as MessageEvent<string>);
    const task = normalizeTask(
      JSON.parse((event as MessageEvent<string>).data),
    );
    try {
      const status: TaskStatus = await getTaskStatusApi(task.taskId);
      if (status.result?.report) {
        activeReport.value = { report: status.result.report, source: 'task' };
        activeHistoryId.value = status.result.report.meta.id ?? null;
      }
      if (status.marketReviewReport) {
        marketReviewReport.value = status.marketReviewReport;
      }
      await loadHistory(1);
    } catch {
      await loadHistory(1);
    }
  });
}

onMounted(async () => {
  await Promise.allSettled([
    loadSetupStatus(),
    loadSkills(),
    loadTasks(),
    loadHistory(1),
  ]);
  connectTaskStream();
});

onBeforeUnmount(() => {
  eventSource?.close();
  if (taskPollTimer) {
    window.clearTimeout(taskPollTimer);
  }
});
</script>

<template>
  <Page
    description="提交个股分析、跟踪后台任务、查看历史报告与大盘复盘。"
    title="分析工作台"
  >
    <div class="dsa-workspace">
      <Alert
        v-if="setupWarning"
        class="mb-4"
        show-icon
        :message="setupWarning"
        type="warning"
      />

      <div class="workspace-grid">
        <section class="main-column">
          <Card title="快速分析">
            <div class="analysis-form">
              <Input
                v-model:value="query"
                class="stock-input"
                placeholder="输入股票代码或名称，例如 600519、hk00700、AAPL"
                @press-enter="submitAnalysis"
              />
              <Select
                v-model:value="reportType"
                class="report-select"
                :options="[
                  { label: '详细报告', value: 'detailed' },
                  { label: '完整报告', value: 'full' },
                  { label: '简版报告', value: 'simple' },
                  { label: '摘要报告', value: 'brief' },
                ]"
              />
              <Select
                v-model:value="selectedSkill"
                allow-clear
                class="skill-select"
                option-filter-prop="label"
                placeholder="策略"
                show-search
                :options="
                  skills.map((item) => ({
                    label: item.displayName || item.name || item.id,
                    value: item.id,
                  }))
                "
              />
              <Button
                type="primary"
                :loading="isSubmitting"
                @click="submitAnalysis"
              >
                开始分析
              </Button>
              <Button
                :loading="isMarketReviewSubmitting"
                @click="triggerMarketReview"
              >
                大盘复盘
              </Button>
            </div>
            <div class="analysis-options">
              <Space wrap>
                <span class="option-item">
                  <Switch v-model:checked="notify" size="small" />
                  <span>推送通知</span>
                </span>
                <Checkbox v-model:checked="forceRefresh">强制刷新数据</Checkbox>
                <span v-if="selectedSkillOption" class="skill-hint">
                  {{ selectedSkillOption.description || '已选择策略分析' }}
                </span>
              </Space>
            </div>
          </Card>

          <Card class="mt-4" title="任务进度">
            <Table
              :columns="taskColumns"
              :data-source="visibleTasks"
              :loading="loadingTasks"
              :pagination="false"
              row-key="taskId"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'stockCode'">
                  <div class="task-code">
                    {{ record.stockName || record.stockCode }}
                  </div>
                  <div class="muted">{{ record.taskId }}</div>
                </template>
                <template v-else-if="column.key === 'status'">
                  <Tag :color="statusTone(record.status)">
                    {{ record.status }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'progress'">
                  <Progress
                    :percent="record.progress || 0"
                    size="small"
                    :status="
                      record.status === 'failed' ? 'exception' : undefined
                    "
                  />
                </template>
                <template v-else-if="column.key === 'message'">
                  <span>{{ record.message || record.error || '-' }}</span>
                </template>
              </template>
            </Table>
          </Card>

          <Card class="mt-4" title="报告详情">
            <div v-if="loadingReport" class="report-placeholder">
              报告加载中...
            </div>
            <Empty
              v-else-if="!activeReport"
              description="选择历史报告或提交一次分析后查看详情"
            />
            <div v-else>
              <div class="report-header">
                <div>
                  <h2>
                    {{ reportMeta?.stockName }} {{ reportMeta?.stockCode }}
                  </h2>
                  <p class="muted">
                    {{ formatDateTime(reportMeta?.createdAt) }}
                    <span v-if="reportMeta?.modelUsed">
                      · {{ reportMeta.modelUsed }}
                    </span>
                  </p>
                </div>
                <Space>
                  <Tag v-if="reportMeta?.changePct !== undefined">
                    {{ formatPct(reportMeta?.changePct) }}
                  </Tag>
                  <Tag :color="scoreTone(reportSummary?.sentimentScore)">
                    评分 {{ reportSummary?.sentimentScore ?? '-' }}
                  </Tag>
                  <Button @click="loadMarkdown">Markdown</Button>
                </Space>
              </div>

              <Descriptions bordered size="small" :column="2">
                <Descriptions.Item label="操作建议">
                  {{ reportSummary?.operationAdvice || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="趋势判断">
                  {{ reportSummary?.trendPrediction || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="理想买点">
                  {{ reportStrategy?.idealBuy || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="止损">
                  {{ reportStrategy?.stopLoss || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="止盈">
                  {{ reportStrategy?.takeProfit || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="当前价格">
                  {{ reportMeta?.currentPrice ?? '-' }}
                </Descriptions.Item>
              </Descriptions>

              <Divider />
              <TypographyParagraph>
                {{ reportSummary?.analysisSummary || '暂无摘要。' }}
              </TypographyParagraph>
              <Alert
                v-if="activeReport.report.details?.newsContent"
                class="mt-4"
                :message="activeReport.report.details.newsContent"
                show-icon
                type="info"
              />
            </div>
          </Card>

          <Card v-if="marketReviewReport" class="mt-4" title="大盘复盘">
            <Textarea
              :value="marketReviewReport"
              :auto-size="{ minRows: 8, maxRows: 18 }"
              readonly
            />
          </Card>
        </section>

        <aside class="side-column">
          <Card title="历史报告">
            <div class="history-toolbar">
              <Input
                v-model:value="filters.stockCode"
                allow-clear
                placeholder="按股票筛选"
                @press-enter="loadHistory(1)"
              />
              <Button @click="loadHistory(1)">筛选</Button>
              <Button
                danger
                :disabled="selectedHistoryIds.length === 0"
                @click="deleteSelectedHistory"
              >
                删除
              </Button>
            </div>
            <Table
              v-model:selected-row-keys="selectedHistoryIds"
              class="mt-3"
              :columns="historyColumns"
              :data-source="historyItems"
              :loading="loadingHistory"
              :pagination="{
                current: filters.page,
                pageSize: filters.limit,
                total: historyTotal,
                showSizeChanger: false,
              }"
              :row-selection="{ selectedRowKeys: selectedHistoryIds }"
              row-key="id"
              size="small"
              @change="(pagination) => loadHistory(pagination.current || 1)"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'stockCode'">
                  <button
                    class="history-link"
                    type="button"
                    @click="loadHistoryDetail(record.id)"
                  >
                    {{ record.stockName || record.stockCode }}
                  </button>
                  <div class="muted">{{ record.stockCode }}</div>
                </template>
                <template v-else-if="column.key === 'operationAdvice'">
                  <span>{{ record.operationAdvice || '-' }}</span>
                </template>
                <template v-else-if="column.key === 'sentimentScore'">
                  <Tag :color="scoreTone(record.sentimentScore)">
                    {{ record.sentimentScore ?? '-' }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  <span>{{ formatDateTime(record.createdAt) }}</span>
                </template>
              </template>
            </Table>
          </Card>

          <Card class="mt-4" title="最近摘要">
            <List :data-source="historyItems.slice(0, 5)" size="small">
              <template #renderItem="{ item }">
                <ListItem>
                  <button
                    class="summary-item"
                    type="button"
                    @click="loadHistoryDetail(item.id)"
                  >
                    <strong>{{ item.stockName || item.stockCode }}</strong>
                    <span>{{
                      item.analysisSummary || item.operationAdvice || '暂无摘要'
                    }}</span>
                  </button>
                </ListItem>
              </template>
            </List>
          </Card>
        </aside>
      </div>
    </div>

    <Drawer
      v-model:open="markdownOpen"
      destroy-on-close
      placement="right"
      title="Markdown 报告"
      width="720"
    >
      <div v-if="markdownLoading">加载中...</div>
      <pre v-else class="markdown-preview">{{
        markdownContent || '暂无 Markdown 内容。'
      }}</pre>
    </Drawer>
  </Page>
</template>

<style scoped>
.dsa-workspace {
  padding: 16px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 16px;
}

.main-column,
.side-column {
  min-width: 0;
}

.analysis-form {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 140px 180px auto auto;
  gap: 10px;
  align-items: center;
}

.analysis-options {
  margin-top: 12px;
  color: hsl(var(--muted-foreground));
}

.option-item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.skill-hint {
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
}

.history-link,
.summary-item {
  width: 100%;
  padding: 0;
  color: hsl(var(--primary));
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.summary-item {
  display: grid;
  gap: 4px;
  color: inherit;
}

.summary-item span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: hsl(var(--muted-foreground));
}

.report-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.report-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
}

.muted {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.task-code {
  font-weight: 600;
}

.report-placeholder {
  padding: 40px 0;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.markdown-preview {
  min-height: 100%;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  background: hsl(var(--muted) / 40%);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

@media (max-width: 1180px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .analysis-form {
    grid-template-columns: 1fr 1fr;
  }

  .stock-input,
  .skill-select {
    grid-column: span 2;
  }
}
</style>
