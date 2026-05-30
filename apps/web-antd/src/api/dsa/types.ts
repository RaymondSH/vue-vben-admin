export type StockReportType = 'brief' | 'detailed' | 'full' | 'simple';
export type ReportType = 'market_review' | StockReportType;

export interface AnalysisRequest {
  asyncMode?: boolean;
  forceRefresh?: boolean;
  notify?: boolean;
  originalQuery?: string;
  reportType?: StockReportType;
  selectionSource?: 'autocomplete' | 'image' | 'import' | 'manual';
  skills?: string[];
  stockCode?: string;
  stockCodes?: string[];
  stockName?: string;
}

export interface MarketReviewRequest {
  sendNotification?: boolean;
}

export interface MarketReviewAccepted {
  message: string;
  marketReviewReport?: string;
  sendNotification?: boolean;
  status: 'accepted' | 'completed';
  taskId?: string;
  traceId?: string;
}

export interface ReportMeta {
  changePct?: null | number;
  createdAt?: string;
  currentPrice?: null | number;
  id?: number;
  modelUsed?: null | string;
  queryId: string;
  reportLanguage?: 'en' | 'zh';
  reportType: ReportType;
  stockCode: string;
  stockName: string;
}

export interface ReportSummary {
  analysisSummary?: string;
  operationAdvice?: string;
  sentimentLabel?: string;
  sentimentScore?: null | number;
  trendPrediction?: string;
}

export interface ReportStrategy {
  idealBuy?: null | string;
  secondaryBuy?: null | string;
  stopLoss?: null | string;
  takeProfit?: null | string;
}

export interface ReportDetails {
  analysisContextPackOverview?: null | Record<string, unknown>;
  contextSnapshot?: null | Record<string, unknown>;
  financialReport?: null | Record<string, unknown>;
  newsContent?: string;
  rawResult?: Record<string, unknown>;
}

export interface AnalysisReport {
  details?: ReportDetails;
  meta: ReportMeta;
  strategy?: ReportStrategy;
  summary: ReportSummary;
}

export interface AnalysisResult {
  createdAt?: string;
  diagnosticSummary?: Record<string, unknown>;
  queryId: string;
  report: AnalysisReport;
  stockCode: string;
  stockName: string;
  traceId?: string;
}

export interface TaskAccepted {
  message?: string;
  status: 'pending' | 'processing';
  taskId: string;
  traceId?: string;
}

export interface BatchTaskAcceptedItem extends TaskAccepted {
  stockCode: string;
}

export interface BatchTaskAcceptedResponse {
  accepted: BatchTaskAcceptedItem[];
  duplicates: Array<{
    existingTaskId: string;
    message: string;
    stockCode: string;
  }>;
  message: string;
}

export type AnalyzeAsyncResponse = BatchTaskAcceptedResponse | TaskAccepted;
export type AnalyzeResponse = AnalysisResult | AnalyzeAsyncResponse;

export interface TaskInfo {
  completedAt?: string;
  createdAt: string;
  error?: string;
  message?: string;
  originalQuery?: string;
  progress: number;
  reportType: string;
  selectionSource?: string;
  startedAt?: string;
  status: 'completed' | 'failed' | 'pending' | 'processing';
  stockCode: string;
  stockName?: string;
  taskId: string;
  traceId?: string;
}

export interface TaskListResponse {
  pending: number;
  processing: number;
  tasks: TaskInfo[];
  total: number;
}

export interface TaskStatus extends TaskInfo {
  marketReviewReport?: string;
  result?: AnalysisResult;
  skills?: string[];
}

export interface HistoryItem {
  analysisSummary?: string;
  changePct?: null | number;
  createdAt: string;
  currentPrice?: null | number;
  id: number;
  modelUsed?: null | string;
  operationAdvice?: string;
  queryId: string;
  reportType?: ReportType;
  sentimentScore?: null | number;
  stockCode: string;
  stockName?: string;
  trendPrediction?: string;
}

export interface HistoryListResponse {
  items: HistoryItem[];
  limit: number;
  page: number;
  total: number;
}

export interface SkillInfo {
  description?: string;
  displayName?: string;
  enabled?: boolean;
  id: string;
  name?: string;
}

export interface ChatSessionItem {
  createdAt?: null | string;
  lastActive?: null | string;
  messageCount: number;
  sessionId: string;
  title: string;
}

export interface ChatSessionMessage {
  content: string;
  createdAt?: null | string;
  id: string;
  role: 'assistant' | 'user';
}

export interface ChatStreamRequest {
  context?: Record<string, unknown>;
  message: string;
  sessionId?: string;
  skills?: string[];
}

export interface ChatProgressStep {
  content?: string;
  displayName?: string;
  duration?: number;
  error?: unknown;
  message?: string;
  sessionId?: string;
  step?: number;
  success?: boolean;
  tool?: string;
  totalSteps?: number;
  type: string;
}
