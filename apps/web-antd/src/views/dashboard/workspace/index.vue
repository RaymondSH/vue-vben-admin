<script lang="ts" setup>
import type {
  AnalysisReport,
  HistoryItem,
  NewsIntelItem,
  SkillInfo,
  StockImportItem,
  StockIndexData,
  StockIndexItem,
  StockIndexTuple,
  TaskInfo,
  TaskStatus,
} from '#/api';

import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  AutoComplete,
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
  extractStocksFromImageApi,
  getAgentSkillsApi,
  getHistoryDetailApi,
  getHistoryListApi,
  getHistoryMarkdownApi,
  getHistoryNewsApi,
  getSetupStatusApi,
  getTasksApi,
  getTaskStatusApi,
  getTaskStreamUrl,
  parseStocksImportFileApi,
  parseStocksImportTextApi,
  triggerMarketReviewApi,
} from '#/api';
import { toCamelCase } from '#/api/dsa/utils';

defineOptions({ name: 'DsaWorkspace' });

type ReportView = {
  markdown?: string;
  report: AnalysisReport;
  source: 'history' | 'task';
};

type SelectionSource = 'autocomplete' | 'image' | 'import' | 'manual';

type ImportItemWithState = StockImportItem & {
  checked: boolean;
  id: string;
  source: 'file' | 'image' | 'paste';
};

type StockSuggestion = {
  code: string;
  label: string;
  name: string;
  score: number;
  source: StockIndexItem;
  value: string;
};

const INDEX_FIELD = {
  ACTIVE: 8,
  ALIASES: 5,
  ASSET_TYPE: 7,
  CANONICAL_CODE: 0,
  DISPLAY_CODE: 1,
  MARKET: 6,
  NAME_ZH: 2,
  PINYIN_ABBR: 4,
  PINYIN_FULL: 3,
  POPULARITY: 9,
} as const;

const IMG_EXT = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']);
const IMG_MAX = 5 * 1024 * 1024;
const FILE_MAX = 2 * 1024 * 1024;
const TEXT_MAX = 100 * 1024;

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
const selectedStockName = ref('');
const selectionSource = ref<SelectionSource>('manual');
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
const stockIndex = ref<StockIndexItem[]>([]);
const stockIndexLoaded = ref(false);
const stockIndexError = ref('');
const importOpen = ref(false);
const importLoading = ref(false);
const importError = ref('');
const importText = ref('');
const importItems = ref<ImportItemWithState[]>([]);
const imageInputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const newsLoading = ref(false);
const historyTrendOpen = ref(false);
const historyTrendLoading = ref(false);
const diagnosticsOpen = ref(false);
const newsItems = ref<NewsIntelItem[]>([]);
const historyTrendItems = ref<HistoryItem[]>([]);

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
const route = useRoute();
const router = useRouter();

let eventSource: EventSource | null = null;
let taskPollTimer: null | number = null;

const selectedSkillOption = computed(() =>
  skills.value.find((item) => item.id === selectedSkill.value),
);

const reportMeta = computed(() => activeReport.value?.report.meta);
const reportSummary = computed(() => activeReport.value?.report.summary);
const reportStrategy = computed(() => activeReport.value?.report.strategy);

const stockSuggestions = computed(() => searchStocks(query.value, 12));

const stockAutoCompleteOptions = computed(() =>
  stockSuggestions.value.map((item) => ({
    label: item.label,
    value: item.value,
  })),
);

const checkedImportItems = computed(() =>
  importItems.value.filter((item) => item.checked && item.code),
);

const importStats = computed(() => {
  const codeCount = importItems.value.filter((item) => item.code).length;
  const failedCount = importItems.value.length - codeCount;
  const duplicateCount = countDuplicateImportItems();
  return {
    codeCount,
    duplicateCount,
    failedCount,
    total: importItems.value.length,
  };
});

const markdownHtml = computed(() => renderMarkdown(markdownContent.value));

const diagnosticItems = computed(() => {
  const report = activeReport.value?.report;
  const details = report?.details;
  if (!report) return [];
  return [
    { label: 'Query ID', value: report.meta.queryId },
    { label: '报告类型', value: report.meta.reportType },
    { label: '报告语言', value: report.meta.reportLanguage },
    { label: '模型', value: report.meta.modelUsed },
    { label: '上下文快照', value: details?.contextSnapshot ? '已记录' : '无' },
    { label: '原始结果', value: details?.rawResult ? '已记录' : '无' },
    { label: '财报摘要', value: details?.financialReport ? '已记录' : '无' },
    { label: '关联板块', value: details?.belongBoards ? '已记录' : '无' },
  ].filter((item) => item.value !== undefined && item.value !== null);
});

const visibleTasks = computed(() =>
  tasks.value.toSorted((a, b) => {
    const left = new Date(a.createdAt || '').getTime();
    const right = new Date(b.createdAt || '').getTime();
    return right - left;
  }),
);

function normalizeStockIndex(data: StockIndexData): StockIndexItem[] {
  if (!Array.isArray(data)) return [];
  const first = data[0];
  if (!Array.isArray(first)) return data as StockIndexItem[];

  return (data as StockIndexTuple[]).map((tuple) => ({
    active: tuple[INDEX_FIELD.ACTIVE],
    aliases: tuple[INDEX_FIELD.ALIASES],
    assetType: tuple[INDEX_FIELD.ASSET_TYPE],
    canonicalCode: tuple[INDEX_FIELD.CANONICAL_CODE],
    displayCode: tuple[INDEX_FIELD.DISPLAY_CODE],
    market: tuple[INDEX_FIELD.MARKET],
    nameZh: tuple[INDEX_FIELD.NAME_ZH],
    pinyinAbbr: tuple[INDEX_FIELD.PINYIN_ABBR],
    pinyinFull: tuple[INDEX_FIELD.PINYIN_FULL],
    popularity: tuple[INDEX_FIELD.POPULARITY],
  }));
}

async function loadStockIndex() {
  try {
    const response = await fetch(
      `/stocks.index.json?_t=${Math.floor(Date.now() / 3_600_000)}`,
    );
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    stockIndex.value = normalizeStockIndex(
      (await response.json()) as StockIndexData,
    )
      .filter((item) => item.active !== false)
      .toSorted(
        (left, right) => (right.popularity || 0) - (left.popularity || 0),
      );
    stockIndexLoaded.value = true;
    stockIndexError.value = '';
  } catch (error) {
    stockIndex.value = [];
    stockIndexLoaded.value = false;
    stockIndexError.value =
      error instanceof Error ? error.message : '股票索引加载失败';
  }
}

function stockLabel(item: StockIndexItem) {
  return `${item.displayCode} · ${item.nameZh} · ${item.market}`;
}

function scoreStockMatch(item: StockIndexItem, keyword: string) {
  const code = item.displayCode.toLowerCase();
  const canonicalCode = item.canonicalCode.toLowerCase();
  const name = item.nameZh.toLowerCase();
  const pinyinFull = item.pinyinFull?.toLowerCase() || '';
  const pinyinAbbr = item.pinyinAbbr?.toLowerCase() || '';
  const aliases = (item.aliases || []).map((alias) => alias.toLowerCase());
  const popularity = Math.min(item.popularity || 0, 1000) / 100;

  if (code === keyword || canonicalCode === keyword) return 1000 + popularity;
  if (name === keyword) return 980 + popularity;
  if (code.startsWith(keyword) || canonicalCode.startsWith(keyword)) {
    return 900 + popularity;
  }
  if (name.startsWith(keyword)) return 820 + popularity;
  if (pinyinAbbr.startsWith(keyword)) return 760 + popularity;
  if (pinyinFull.startsWith(keyword)) return 720 + popularity;
  if (aliases.some((alias) => alias.includes(keyword))) return 680 + popularity;
  if (code.includes(keyword) || canonicalCode.includes(keyword)) {
    return 620 + popularity;
  }
  if (name.includes(keyword) || pinyinFull.includes(keyword)) {
    return 560 + popularity;
  }
  return 0;
}

function searchStocks(keyword: string, limit = 10): StockSuggestion[] {
  const value = keyword.trim().toLowerCase();
  if (!value || stockIndex.value.length === 0) return [];

  return stockIndex.value
    .map((item) => ({
      code: item.displayCode,
      label: stockLabel(item),
      name: item.nameZh,
      score: scoreStockMatch(item, value),
      source: item,
      value: stockLabel(item),
    }))
    .filter((item) => item.score > 0)
    .toSorted((left, right) => right.score - left.score)
    .slice(0, limit);
}

function handleStockSelect(value: string) {
  const selected =
    stockSuggestions.value.find((item) => item.value === value) ||
    stockSuggestions.value[0];
  if (!selected) return;
  query.value = selected.code;
  selectedStockName.value = selected.name;
  selectionSource.value = 'autocomplete';
}

function handleAutoCompleteSelect(value: unknown) {
  handleStockSelect(String(value));
}

function handleStockSearch(value: string) {
  query.value = value;
  selectedStockName.value = '';
  selectionSource.value = 'manual';
}

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

function hydrateFromRouteQuery() {
  const stock = route.query.stock;
  if (typeof stock === 'string' && stock.trim()) {
    query.value = stock.trim();
  }
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
    await Promise.allSettled([
      loadReportNews(recordId),
      loadHistoryTrend(report),
    ]);
  } finally {
    loadingReport.value = false;
  }
}

async function loadReportNews(recordId: number) {
  newsLoading.value = true;
  try {
    const response = await getHistoryNewsApi(recordId, 20);
    newsItems.value = response.items || [];
  } finally {
    newsLoading.value = false;
  }
}

async function loadHistoryTrend(report: AnalysisReport) {
  const code = report.meta.stockCode;
  if (!code) {
    historyTrendItems.value = [];
    return;
  }
  historyTrendLoading.value = true;
  try {
    const response = await getHistoryListApi({
      limit: 20,
      page: 1,
      stockCode: code,
    });
    historyTrendItems.value = response.items || [];
  } finally {
    historyTrendLoading.value = false;
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

async function copyMarkdown() {
  if (!markdownContent.value) {
    await loadMarkdown();
  }
  if (!markdownContent.value) {
    message.warning('暂无 Markdown 内容');
    return;
  }
  await navigator.clipboard.writeText(markdownContent.value);
  message.success('已复制 Markdown 源码');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replaceAll(/`([^`]+)`/g, '<code>$1</code>')
    .replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replaceAll(/\*([^*]+)\*/g, '<em>$1</em>')
    .replaceAll(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

function renderMarkdown(markdown: string) {
  if (!markdown.trim()) return '<p>暂无 Markdown 内容。</p>';
  const lines = markdown.split('\n');
  const html: string[] = [];
  let inList = false;
  let inCode = false;
  let codeLines: string[] = [];

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(
          `<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
        );
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      closeList();
      const marks = heading[1] || '#';
      const content = heading[2] || '';
      const level = marks.length;
      html.push(`<h${level}>${renderInlineMarkdown(content)}</h${level}>`);
      continue;
    }

    const listItem = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listItem) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${renderInlineMarkdown(listItem[1] || '')}</li>`);
      continue;
    }

    closeList();
    if (trimmed.startsWith('>')) {
      html.push(
        `<blockquote>${renderInlineMarkdown(trimmed.slice(1).trim())}</blockquote>`,
      );
    } else {
      html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    }
  }

  closeList();
  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }
  return html.join('\n');
}

function validateQuery() {
  const value = query.value.trim();
  if (!value) {
    message.warning('请输入股票代码或名称');
    return '';
  }
  return value;
}

function fileExt(file: File) {
  return `.${(file.name.split('.').pop() || '').toLowerCase()}`;
}

function normalizeConfidence(confidence?: string) {
  if (
    confidence === 'high' ||
    confidence === 'low' ||
    confidence === 'medium'
  ) {
    return confidence;
  }
  return 'medium';
}

function confidenceTone(confidence?: string) {
  const value = normalizeConfidence(confidence);
  if (value === 'high') return 'success';
  if (value === 'low') return 'warning';
  return 'default';
}

function confidenceLabel(confidence?: string) {
  const value = normalizeConfidence(confidence);
  if (value === 'high') return '高';
  if (value === 'low') return '低';
  return '中';
}

function mergeImportItems(
  nextItems: StockImportItem[],
  source: ImportItemWithState['source'],
) {
  const existingCodes = new Set(
    importItems.value.flatMap((item) => {
      const code = item.code?.trim();
      return code ? [code] : [];
    }),
  );
  const normalized = nextItems.map((item, index) => {
    const code = item.code?.trim() || null;
    const confidence = normalizeConfidence(item.confidence);
    const duplicate = code ? existingCodes.has(code) : false;
    if (code) existingCodes.add(code);
    return {
      ...item,
      checked: Boolean(code) && !duplicate && confidence !== 'low',
      code,
      confidence,
      id: `${source}-${code || 'unknown'}-${Date.now()}-${index}`,
      source,
    };
  });
  importItems.value = [...importItems.value, ...normalized];
}

function countDuplicateImportItems() {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const item of importItems.value) {
    const code = item.code?.trim();
    if (!code) continue;
    if (seen.has(code)) {
      duplicates += 1;
    } else {
      seen.add(code);
    }
  }
  return duplicates;
}

async function handleImageImport(file: File) {
  const ext = fileExt(file);
  if (!IMG_EXT.has(ext)) {
    importError.value = '图片仅支持 JPG、PNG、WebP、GIF';
    return;
  }
  if (file.size > IMG_MAX) {
    importError.value = '图片不超过 5MB';
    return;
  }

  importLoading.value = true;
  importError.value = '';
  try {
    const response = await extractStocksFromImageApi(file);
    mergeImportItems(
      response.items.length > 0
        ? response.items
        : response.codes.map((code) => ({ code, confidence: 'medium' })),
      'image',
    );
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '图片识别失败';
  } finally {
    importLoading.value = false;
  }
}

async function handleFileImport(file: File) {
  if (file.size > FILE_MAX) {
    importError.value = '文件不超过 2MB';
    return;
  }

  importLoading.value = true;
  importError.value = '';
  try {
    const response = await parseStocksImportFileApi(file);
    mergeImportItems(
      response.items.length > 0
        ? response.items
        : response.codes.map((code) => ({ code, confidence: 'medium' })),
      'file',
    );
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '文件解析失败';
  } finally {
    importLoading.value = false;
  }
}

async function handlePasteImport() {
  const text = importText.value.trim();
  if (!text) {
    message.warning('请先粘贴包含股票代码或名称的文本');
    return;
  }
  if (new Blob([text]).size > TEXT_MAX) {
    importError.value = '粘贴文本不超过 100KB';
    return;
  }

  importLoading.value = true;
  importError.value = '';
  try {
    const response = await parseStocksImportTextApi(text);
    mergeImportItems(
      response.items.length > 0
        ? response.items
        : response.codes.map((code) => ({ code, confidence: 'medium' })),
      'paste',
    );
    importText.value = '';
  } catch (error) {
    importError.value =
      error instanceof Error ? error.message : '剪贴板解析失败';
  } finally {
    importLoading.value = false;
  }
}

function handleImageFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void handleImageImport(file);
  input.value = '';
}

function handleDataFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void handleFileImport(file);
  input.value = '';
}

function removeImportItem(id: string) {
  importItems.value = importItems.value.filter((item) => item.id !== id);
}

function openTrendHistoryItem(item: HistoryItem) {
  if (!item.id) return;
  void loadHistoryDetail(item.id);
  historyTrendOpen.value = false;
}

function setImportChecked(item: ImportItemWithState, checked: boolean) {
  item.checked = checked;
}

function toggleAllImportItems(checked: boolean) {
  importItems.value = importItems.value.map((item) => ({
    ...item,
    checked: Boolean(item.code) && checked,
  }));
}

async function analyzeImportedStocks() {
  const codes = checkedImportItems.value.flatMap((item) => {
    const code = item.code?.trim();
    return code ? [code] : [];
  });
  if (codes.length === 0) {
    message.warning('请先选择可识别的股票');
    return;
  }
  await submitAnalysisRequest({
    originalQuery: codes.join(','),
    selectionSource: 'import',
    stockCodes: [...new Set(codes)],
  });
  importOpen.value = false;
}

function buildReportFollowUpContext(report: AnalysisReport) {
  return {
    report_meta: report.meta,
    report_summary: report.summary,
    report_strategy: report.strategy,
    report_context_snapshot: report.details?.contextSnapshot,
  };
}

function askFollowUp() {
  const report = activeReport.value?.report;
  if (!report) return;
  const prompt = [
    `${report.meta.stockCode} ${report.meta.stockName}`,
    '基于这份分析报告，帮我进一步判断接下来应该如何操作。',
  ].join(' ');
  router.push({
    path: '/agent/chat',
    query: {
      context: encodeURIComponent(
        JSON.stringify(buildReportFollowUpContext(report)),
      ),
      prompt,
    },
  });
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
        await loadHistoryTrend(status.result.report);
        if (activeHistoryId.value) {
          await loadReportNews(activeHistoryId.value);
        }
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

async function submitAnalysisRequest(options: {
  originalQuery: string;
  selectionSource: SelectionSource;
  stockCode?: string;
  stockCodes?: string[];
  stockName?: string;
}) {
  isSubmitting.value = true;
  try {
    const response = await analyzeStockAsyncApi({
      asyncMode: true,
      forceRefresh: forceRefresh.value,
      notify: notify.value,
      originalQuery: options.originalQuery,
      reportType: reportType.value,
      selectionSource: options.selectionSource,
      skills: selectedSkill.value ? [selectedSkill.value] : undefined,
      stockCode: options.stockCode,
      stockCodes: options.stockCodes,
      stockName: options.stockName,
    });

    if ('taskId' in response) {
      message.success('分析任务已提交');
      upsertTask({
        createdAt: new Date().toISOString(),
        progress: 0,
        reportType: reportType.value,
        status: response.status,
        stockCode: options.stockCode || options.originalQuery,
        stockName: options.stockName,
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

async function submitAnalysis() {
  const value = validateQuery();
  if (!value) return;

  await submitAnalysisRequest({
    originalQuery: value,
    selectionSource: selectionSource.value,
    stockCode: value,
    stockName: selectedStockName.value || undefined,
  });
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
        await loadHistoryTrend(status.result.report);
        if (activeHistoryId.value) {
          await loadReportNews(activeHistoryId.value);
        }
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
  hydrateFromRouteQuery();
  await Promise.allSettled([
    loadSetupStatus(),
    loadSkills(),
    loadStockIndex(),
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
              <AutoComplete
                v-model:value="query"
                class="stock-input"
                option-label-prop="value"
                :options="stockAutoCompleteOptions"
                placeholder="输入股票代码或名称，例如 600519、hk00700、AAPL"
                @search="handleStockSearch"
                @select="handleAutoCompleteSelect"
                @press-enter="submitAnalysis"
              >
                <template #option="{ value }">
                  <div class="stock-option">{{ value }}</div>
                </template>
              </AutoComplete>
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
              <Button @click="importOpen = true">智能导入</Button>
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
                <span
                  v-if="selectionSource === 'autocomplete'"
                  class="skill-hint"
                >
                  已选择
                  {{ selectedStockName || query }}，请求来源将标记为自动补全
                </span>
                <span v-else-if="stockIndexError" class="skill-hint">
                  股票索引不可用：{{ stockIndexError }}
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
                  <Button type="primary" @click="askFollowUp">追问</Button>
                  <Button @click="historyTrendOpen = true">历史趋势</Button>
                  <Button @click="diagnosticsOpen = true">诊断</Button>
                  <Button @click="loadMarkdown">Markdown</Button>
                  <Button @click="copyMarkdown">复制源码</Button>
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

              <Divider />
              <div class="report-subsection">
                <div class="section-title">
                  <h3>关联新闻</h3>
                  <Tag>{{ newsItems.length }}</Tag>
                </div>
                <div v-if="newsLoading" class="report-placeholder">
                  新闻加载中...
                </div>
                <Empty
                  v-else-if="newsItems.length === 0"
                  description="暂无关联新闻"
                />
                <List v-else :data-source="newsItems" size="small">
                  <template #renderItem="{ item }">
                    <ListItem>
                      <a
                        class="news-item"
                        :href="item.url"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <strong>{{ item.title }}</strong>
                        <span>{{ item.snippet || item.url }}</span>
                      </a>
                    </ListItem>
                  </template>
                </List>
              </div>
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
      v-model:open="importOpen"
      destroy-on-close
      placement="right"
      title="智能导入股票"
      width="760"
    >
      <Alert
        v-if="importError"
        class="mb-4"
        show-icon
        type="error"
        :message="importError"
      />
      <div class="import-toolbar">
        <Button :loading="importLoading" @click="imageInputRef?.click()">
          图片识别
        </Button>
        <Button :loading="importLoading" @click="fileInputRef?.click()">
          文件导入
        </Button>
        <Button :disabled="importItems.length === 0" @click="importItems = []">
          清空
        </Button>
        <Button
          type="primary"
          :disabled="checkedImportItems.length === 0"
          :loading="isSubmitting"
          @click="analyzeImportedStocks"
        >
          批量分析 {{ checkedImportItems.length }}
        </Button>
        <input
          ref="imageInputRef"
          accept="image/jpeg,image/png,image/webp,image/gif"
          class="hidden-file"
          type="file"
          @change="handleImageFileChange"
        />
        <input
          ref="fileInputRef"
          accept=".csv,.txt,.xlsx,.xls"
          class="hidden-file"
          type="file"
          @change="handleDataFileChange"
        />
      </div>

      <div class="paste-import">
        <Textarea
          v-model:value="importText"
          :rows="5"
          placeholder="粘贴自选股、表格或文本，支持代码和名称混合"
        />
        <Button :loading="importLoading" @click="handlePasteImport">
          解析剪贴板
        </Button>
      </div>

      <div class="import-summary">
        <Tag>总数 {{ importStats.total }}</Tag>
        <Tag color="green">可识别 {{ importStats.codeCount }}</Tag>
        <Tag color="orange">重复 {{ importStats.duplicateCount }}</Tag>
        <Tag color="red">失败 {{ importStats.failedCount }}</Tag>
      </div>

      <div class="import-actions">
        <Checkbox
          :checked="
            importItems.length > 0 &&
            checkedImportItems.length === importStats.codeCount
          "
          @change="
            (event) => toggleAllImportItems(Boolean(event.target.checked))
          "
        >
          全选可识别项
        </Checkbox>
      </div>

      <Empty v-if="importItems.length === 0" description="暂无导入结果" />
      <List v-else :data-source="importItems" size="small">
        <template #renderItem="{ item }">
          <ListItem>
            <div class="import-item">
              <Checkbox
                :checked="item.checked"
                :disabled="!item.code"
                @change="
                  (event) =>
                    setImportChecked(item, Boolean(event.target.checked))
                "
              />
              <div>
                <strong>{{ item.code || '无法识别' }}</strong>
                <span>{{ item.name || '未识别名称' }}</span>
              </div>
              <Tag :color="confidenceTone(item.confidence)">
                {{ confidenceLabel(item.confidence) }}
              </Tag>
              <Tag v-if="!item.code" color="red">失败</Tag>
              <Button size="small" @click="removeImportItem(item.id)">
                移除
              </Button>
            </div>
          </ListItem>
        </template>
      </List>
    </Drawer>

    <Drawer
      v-model:open="historyTrendOpen"
      destroy-on-close
      placement="right"
      title="历史趋势"
      width="620"
    >
      <div v-if="historyTrendLoading" class="report-placeholder">
        历史趋势加载中...
      </div>
      <Empty
        v-else-if="historyTrendItems.length === 0"
        description="暂无历史趋势"
      />
      <List v-else :data-source="historyTrendItems" size="small">
        <template #renderItem="{ item }">
          <ListItem>
            <button
              class="trend-item"
              type="button"
              @click="openTrendHistoryItem(item)"
            >
              <span>{{ formatDateTime(item.createdAt) }}</span>
              <strong>{{ item.operationAdvice || '-' }}</strong>
              <Tag :color="scoreTone(item.sentimentScore)">
                {{ item.sentimentScore ?? '-' }}
              </Tag>
            </button>
          </ListItem>
        </template>
      </List>
    </Drawer>

    <Drawer
      v-model:open="diagnosticsOpen"
      destroy-on-close
      placement="right"
      title="报告诊断"
      width="720"
    >
      <Descriptions bordered :column="1" size="small">
        <Descriptions.Item
          v-for="item in diagnosticItems"
          :key="item.label"
          :label="item.label"
        >
          {{ item.value }}
        </Descriptions.Item>
      </Descriptions>
      <Divider />
      <h3>上下文快照</h3>
      <pre class="json-preview">{{
        JSON.stringify(
          activeReport?.report.details?.contextSnapshot || {},
          null,
          2,
        )
      }}</pre>
      <h3>原始结果</h3>
      <pre class="json-preview">{{
        JSON.stringify(activeReport?.report.details?.rawResult || {}, null, 2)
      }}</pre>
    </Drawer>

    <Drawer
      v-model:open="markdownOpen"
      destroy-on-close
      placement="right"
      title="Markdown 报告"
      width="720"
    >
      <div v-if="markdownLoading">加载中...</div>
      <!-- eslint-disable-next-line vue/no-v-html -- Markdown renderer escapes source before adding supported tags. -->
      <div v-else class="markdown-preview" v-html="markdownHtml"></div>
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
  grid-template-columns: minmax(260px, 1fr) 140px 180px auto auto auto;
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

.stock-option {
  font-weight: 600;
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.section-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.news-item,
.trend-item {
  display: grid;
  gap: 4px;
  width: 100%;
  color: inherit;
  text-align: left;
}

.news-item span,
.trend-item span {
  color: hsl(var(--muted-foreground));
}

.trend-item {
  grid-template-columns: minmax(130px, 1fr) minmax(80px, 1fr) auto;
  align-items: center;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.import-toolbar,
.import-summary,
.import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.paste-import {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.import-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.import-item div {
  display: grid;
  gap: 2px;
}

.import-item span {
  color: hsl(var(--muted-foreground));
}

.hidden-file {
  display: none;
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
  background: hsl(var(--muted) / 40%);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4) {
  margin: 18px 0 10px;
  font-weight: 700;
}

.markdown-preview :deep(p),
.markdown-preview :deep(li) {
  line-height: 1.8;
}

.markdown-preview :deep(blockquote) {
  padding: 8px 12px;
  margin: 12px 0;
  color: hsl(var(--muted-foreground));
  border-left: 3px solid hsl(var(--primary));
}

.markdown-preview :deep(pre),
.json-preview {
  padding: 12px;
  overflow: auto;
  background: hsl(var(--muted) / 60%);
  border-radius: 6px;
}

.json-preview {
  max-height: 360px;
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

@media (max-width: 720px) {
  .analysis-form,
  .import-item,
  .trend-item {
    grid-template-columns: 1fr;
  }
}
</style>
