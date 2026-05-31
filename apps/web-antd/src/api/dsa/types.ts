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

export type PortfolioCashDirection = 'in' | 'out';
export type PortfolioCorporateActionType = 'cash_dividend' | 'split_adjustment';
export type PortfolioCostMethod = 'avg' | 'fifo';
export type PortfolioMarket = 'cn' | 'hk' | 'us';
export type PortfolioSide = 'buy' | 'sell';

export interface PortfolioAccountItem {
  baseCurrency: string;
  broker?: null | string;
  createdAt?: null | string;
  id: number;
  isActive: boolean;
  market: PortfolioMarket;
  name: string;
  ownerId?: null | string;
  updatedAt?: null | string;
}

export interface PortfolioAccountListResponse {
  accounts: PortfolioAccountItem[];
}

export interface PortfolioAccountCreateRequest {
  baseCurrency: string;
  broker?: string;
  market: PortfolioMarket;
  name: string;
  ownerId?: string;
}

export interface PortfolioPositionItem {
  avgCost: number;
  currency: string;
  lastPrice: number;
  market: string;
  marketValueBase: number;
  priceAvailable?: boolean;
  priceDate?: null | string;
  priceProvider?: null | string;
  priceSource?: string;
  priceStale?: boolean;
  quantity: number;
  symbol: string;
  totalCost: number;
  unrealizedPnlBase: number;
  unrealizedPnlPct?: null | number;
  valuationCurrency: string;
}

export interface PortfolioAccountSnapshot {
  accountId: number;
  accountName: string;
  asOf: string;
  baseCurrency: string;
  broker?: null | string;
  costMethod: PortfolioCostMethod;
  feeTotal: number;
  fxStale: boolean;
  market: string;
  ownerId?: null | string;
  positions: PortfolioPositionItem[];
  realizedPnl: number;
  taxTotal: number;
  totalCash: number;
  totalEquity: number;
  totalMarketValue: number;
  unrealizedPnl: number;
}

export interface PortfolioSnapshotResponse {
  accountCount: number;
  accounts: PortfolioAccountSnapshot[];
  asOf: string;
  costMethod: PortfolioCostMethod;
  currency: string;
  feeTotal: number;
  fxStale: boolean;
  realizedPnl: number;
  taxTotal: number;
  totalCash: number;
  totalEquity: number;
  totalMarketValue: number;
  unrealizedPnl: number;
}

export interface PortfolioRiskResponse {
  accountId?: null | number;
  asOf: string;
  concentration: {
    alert: boolean;
    topPositions: Array<{
      isAlert: boolean;
      marketValueBase: number;
      symbol: string;
      weightPct: number;
    }>;
    topWeightPct: number;
    totalMarketValue: number;
  };
  costMethod: PortfolioCostMethod;
  currency: string;
  drawdown: {
    alert: boolean;
    currentDrawdownPct: number;
    fxStale: boolean;
    maxDrawdownPct: number;
    seriesPoints: number;
  };
  sectorConcentration: {
    alert: boolean;
    coverage: Record<string, number>;
    errors: string[];
    topSectors: Array<{
      isAlert: boolean;
      marketValueBase: number;
      sector: string;
      symbolCount: number;
      weightPct: number;
    }>;
    topWeightPct: number;
    totalMarketValue: number;
  };
  stopLoss: {
    items: Array<{
      accountId: number;
      avgCost: number;
      isTriggered: boolean;
      lastPrice: number;
      lossPct: number;
      nearThresholdPct: number;
      symbol: string;
    }>;
    nearAlert: boolean;
    nearCount: number;
    triggeredCount: number;
  };
  thresholds: Record<string, number>;
}

export interface PortfolioTradeCreateRequest {
  accountId: number;
  currency?: string;
  fee?: number;
  market?: PortfolioMarket;
  note?: string;
  price: number;
  quantity: number;
  side: PortfolioSide;
  symbol: string;
  tax?: number;
  tradeDate: string;
  tradeUid?: string;
}

export interface PortfolioCashLedgerCreateRequest {
  accountId: number;
  amount: number;
  currency?: string;
  direction: PortfolioCashDirection;
  eventDate: string;
  note?: string;
}

export interface PortfolioCorporateActionCreateRequest {
  accountId: number;
  actionType: PortfolioCorporateActionType;
  cashDividendPerShare?: number;
  currency?: string;
  effectiveDate: string;
  market?: PortfolioMarket;
  note?: string;
  splitRatio?: number;
  symbol: string;
}

export interface PortfolioEventCreatedResponse {
  id: number;
}

export interface PortfolioDeleteResponse {
  deleted: number;
}

export interface PortfolioTradeListItem {
  accountId: number;
  createdAt?: null | string;
  currency: string;
  fee: number;
  id: number;
  market: string;
  note?: null | string;
  price: number;
  quantity: number;
  side: PortfolioSide;
  symbol: string;
  tax: number;
  tradeDate: string;
  tradeUid?: null | string;
}

export interface PortfolioTradeListResponse {
  items: PortfolioTradeListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PortfolioCashLedgerListItem {
  accountId: number;
  amount: number;
  createdAt?: null | string;
  currency: string;
  direction: PortfolioCashDirection;
  eventDate: string;
  id: number;
  note?: null | string;
}

export interface PortfolioCashLedgerListResponse {
  items: PortfolioCashLedgerListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PortfolioCorporateActionListItem {
  accountId: number;
  actionType: PortfolioCorporateActionType;
  cashDividendPerShare?: null | number;
  createdAt?: null | string;
  currency: string;
  effectiveDate: string;
  id: number;
  market: string;
  note?: null | string;
  splitRatio?: null | number;
  symbol: string;
}

export interface PortfolioCorporateActionListResponse {
  items: PortfolioCorporateActionListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PortfolioImportTradeItem {
  currency?: null | string;
  dedupHash: string;
  fee: number;
  price: number;
  quantity: number;
  side: PortfolioSide;
  symbol: string;
  tax: number;
  tradeDate: string;
  tradeUid?: null | string;
}

export interface PortfolioImportParseResponse {
  broker: string;
  errorCount: number;
  errors: string[];
  recordCount: number;
  records: PortfolioImportTradeItem[];
  skippedCount: number;
}

export interface PortfolioImportCommitResponse {
  accountId: number;
  dryRun: boolean;
  duplicateCount: number;
  errors: string[];
  failedCount: number;
  insertedCount: number;
  recordCount: number;
}

export interface PortfolioImportBrokerItem {
  aliases: string[];
  broker: string;
  displayName?: string;
}

export interface PortfolioImportBrokerListResponse {
  brokers: PortfolioImportBrokerItem[];
}

export interface PortfolioFxRefreshResponse {
  accountCount: number;
  asOf: string;
  disabledReason?: null | string;
  errorCount: number;
  pairCount: number;
  refreshEnabled?: boolean;
  staleCount: number;
  updatedCount: number;
}

export interface BacktestRunRequest {
  code?: string;
  evalWindowDays?: number;
  force?: boolean;
  limit?: number;
  minAgeDays?: number;
}

export interface BacktestRunResponse {
  completed: number;
  errors: number;
  insufficient: number;
  processed: number;
  saved: number;
}

export interface BacktestResultItem {
  actualMovement?: string;
  actualReturnPct?: number;
  analysisDate?: string;
  analysisHistoryId: number;
  code: string;
  directionCorrect?: boolean;
  directionExpected?: string;
  endClose?: number;
  engineVersion: string;
  evalStatus: string;
  evalWindowDays: number;
  evaluatedAt?: string;
  firstHit?: string;
  firstHitDate?: string;
  firstHitTradingDays?: number;
  hitStopLoss?: boolean;
  hitTakeProfit?: boolean;
  maxHigh?: number;
  minLow?: number;
  operationAdvice?: string;
  outcome?: string;
  positionRecommendation?: string;
  simulatedEntryPrice?: number;
  simulatedExitPrice?: number;
  simulatedExitReason?: string;
  simulatedReturnPct?: number;
  startPrice?: number;
  stockName?: string;
  stockReturnPct?: number;
  stopLoss?: number;
  takeProfit?: number;
  trendPrediction?: string;
}

export interface BacktestResultsResponse {
  items: BacktestResultItem[];
  limit: number;
  page: number;
  total: number;
}

export interface BacktestPerformanceMetrics {
  adviceBreakdown: Record<string, unknown>;
  ambiguousRate?: number;
  avgDaysToFirstHit?: number;
  avgSimulatedReturnPct?: number;
  avgStockReturnPct?: number;
  cashCount: number;
  code?: string;
  completedCount: number;
  computedAt?: string;
  diagnostics: Record<string, unknown>;
  directionAccuracyPct?: number;
  engineVersion: string;
  evalWindowDays: number;
  insufficientCount: number;
  longCount: number;
  lossCount: number;
  neutralCount: number;
  neutralRatePct?: number;
  scope: string;
  stopLossTriggerRate?: number;
  takeProfitTriggerRate?: number;
  totalEvaluations: number;
  winCount: number;
  winRatePct?: number;
}

export type AlertDirection =
  | 'above'
  | 'bearish_cross'
  | 'below'
  | 'bullish_cross'
  | 'down'
  | 'up';
export type AlertDryRunStatus =
  | 'evaluation_error'
  | 'not_triggered'
  | 'triggered';
export type AlertSeverity = 'critical' | 'info' | 'warning';
export type AlertTargetScope =
  | 'market'
  | 'portfolio_account'
  | 'portfolio_holdings'
  | 'single_symbol'
  | 'watchlist';
export type AlertTriggerStatus =
  | 'degraded'
  | 'failed'
  | 'skipped'
  | 'triggered';
export type AlertType =
  | 'cci_threshold'
  | 'kdj_cross'
  | 'ma_price_cross'
  | 'macd_cross'
  | 'market_light_score_drop'
  | 'market_light_status'
  | 'portfolio_concentration'
  | 'portfolio_drawdown'
  | 'portfolio_price_stale'
  | 'portfolio_stop_loss'
  | 'price_change_percent'
  | 'price_cross'
  | 'rsi_threshold'
  | 'volume_spike';
export type MarketLightStatus = 'red' | 'yellow';
export type PortfolioStopLossMode = 'breach' | 'near';

export interface AlertRuleParameters {
  changePct?: number;
  dPeriod?: number;
  direction?: AlertDirection;
  fastPeriod?: number;
  kPeriod?: number;
  minDrop?: number;
  mode?: PortfolioStopLossMode;
  multiplier?: number;
  period?: number;
  price?: number;
  signalPeriod?: number;
  slowPeriod?: number;
  statuses?: MarketLightStatus[];
  threshold?: number;
  window?: number;
}

export interface AlertRuleItem {
  alertType: AlertType;
  cooldownActive?: boolean | null;
  cooldownPolicy?: null | Record<string, unknown>;
  cooldownUntil?: null | string;
  createdAt?: null | string;
  enabled: boolean;
  id: number;
  lastTriggeredAt?: null | string;
  name: string;
  notificationPolicy?: null | Record<string, unknown>;
  parameters: AlertRuleParameters;
  severity: AlertSeverity;
  source: string;
  target: string;
  targetScope: AlertTargetScope;
  updatedAt?: null | string;
}

export interface AlertRuleListResponse {
  items: AlertRuleItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AlertRuleCreateRequest {
  alertType: AlertType;
  enabled?: boolean;
  name?: string;
  parameters: AlertRuleParameters;
  severity: AlertSeverity;
  target: string;
  targetScope?: AlertTargetScope;
}

export interface AlertDeleteResponse {
  deleted: number;
}

export interface AlertRuleTargetResult {
  displayTarget?: null | string;
  message: string;
  observedValue?: unknown;
  recordStatus?: AlertTriggerStatus | null;
  status: AlertDryRunStatus;
  target: string;
  threshold?: unknown;
  triggered: boolean;
}

export interface AlertRuleTestResponse {
  degradedCount?: number;
  evaluatedCount?: number;
  message: string;
  observedValue?: unknown;
  ruleId: number;
  skippedCount?: number;
  status: AlertDryRunStatus;
  targetResults?: AlertRuleTargetResult[];
  targetScope?: AlertTargetScope | null | string;
  triggered: boolean;
  triggeredCount?: number;
}

export interface AlertTriggerItem {
  dataSource?: null | string;
  dataTimestamp?: null | string;
  diagnostics?: null | string;
  id: number;
  observedValue?: null | number;
  reason?: null | string;
  ruleId?: null | number;
  status: AlertTriggerStatus | string;
  target: string;
  threshold?: null | number;
  triggeredAt?: null | string;
}

export interface AlertTriggerListResponse {
  items: AlertTriggerItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AlertNotificationItem {
  attempt: number;
  channel: string;
  createdAt?: null | string;
  diagnostics?: null | string;
  errorCode?: null | string;
  id: number;
  latencyMs?: null | number;
  retryable: boolean;
  success: boolean;
  triggerId?: null | number;
}

export interface AlertNotificationListResponse {
  items: AlertNotificationItem[];
  page: number;
  pageSize: number;
  total: number;
}

export type SystemConfigCategory =
  | 'agent'
  | 'ai_model'
  | 'backtest'
  | 'base'
  | 'data_source'
  | 'notification'
  | 'system'
  | 'uncategorized';

export type SystemConfigDataType =
  | 'array'
  | 'boolean'
  | 'integer'
  | 'json'
  | 'number'
  | 'string'
  | 'time';

export type SystemConfigUiControl =
  | 'number'
  | 'password'
  | 'select'
  | 'switch'
  | 'text'
  | 'textarea'
  | 'time';

export type SystemConfigValidationSeverity = 'error' | 'warning';

export type LlmCapabilityCheck = 'json' | 'stream' | 'tools' | 'vision';

export type NotificationTestChannel =
  | 'astrbot'
  | 'custom'
  | 'discord'
  | 'email'
  | 'feishu'
  | 'gotify'
  | 'ntfy'
  | 'pushover'
  | 'pushplus'
  | 'serverchan3'
  | 'slack'
  | 'telegram'
  | 'wechat';

export interface SystemConfigOption {
  label: string;
  value: string;
}

export interface SystemConfigDocLink {
  href: string;
  label: string;
}

export interface SystemConfigFieldSchema {
  category: SystemConfigCategory;
  dataType: SystemConfigDataType;
  defaultValue?: null | string;
  description?: null | string;
  displayOrder: number;
  docs: SystemConfigDocLink[];
  examples: string[];
  helpKey?: null | string;
  isEditable: boolean;
  isRequired: boolean;
  isSensitive: boolean;
  key: string;
  options: Array<string | SystemConfigOption>;
  title?: null | string;
  uiControl: SystemConfigUiControl;
  validation: Record<string, unknown>;
  warningCodes: string[];
}

export interface SystemConfigItem {
  isMasked: boolean;
  key: string;
  rawValueExists: boolean;
  schema?: null | SystemConfigFieldSchema;
  value: string;
}

export interface SystemConfigResponse {
  configVersion: string;
  items: SystemConfigItem[];
  maskToken: string;
  updatedAt?: null | string;
}

export interface SetupStatusCheck {
  category: 'agent' | 'ai_model' | 'base' | 'notification' | 'system';
  key: string;
  message: string;
  nextStep?: null | string;
  required: boolean;
  status: 'configured' | 'inherited' | 'needs_action' | 'optional';
  title: string;
}

export interface SetupStatusResponse {
  checks?: SetupStatusCheck[];
  isComplete?: boolean;
  missingRequired?: string[];
  nextStepKey?: null | string;
  ready?: boolean;
  readyForSmoke?: boolean;
  requiredMissingKeys?: string[];
  status?: string;
}

export interface SystemConfigUpdateItem {
  key: string;
  value: string;
}

export interface UpdateSystemConfigRequest {
  configVersion: string;
  items: SystemConfigUpdateItem[];
  maskToken?: string;
  reloadNow?: boolean;
}

export interface UpdateSystemConfigResponse {
  appliedCount: number;
  configVersion: string;
  reloadTriggered: boolean;
  skippedMaskedCount: number;
  success: boolean;
  updatedKeys: string[];
  warnings: string[];
}

export interface ExportSystemConfigResponse {
  configVersion: string;
  content: string;
  updatedAt?: null | string;
}

export interface ImportSystemConfigRequest {
  configVersion: string;
  content: string;
  reloadNow?: boolean;
}

export interface ValidateSystemConfigRequest {
  items: SystemConfigUpdateItem[];
}

export interface ConfigValidationIssue {
  actual?: null | string;
  code: string;
  expected?: null | string;
  key: string;
  message: string;
  severity: SystemConfigValidationSeverity;
}

export interface ValidateSystemConfigResponse {
  issues: ConfigValidationIssue[];
  valid: boolean;
}

export interface TestLlmChannelRequest {
  apiKey?: string;
  baseUrl?: string;
  capabilityChecks?: LlmCapabilityCheck[];
  enabled?: boolean;
  models?: string[];
  name?: string;
  protocol?: string;
  timeoutSeconds?: number;
}

export interface LlmCapabilityCheckResult {
  details: Record<string, unknown>;
  errorCode?: null | string;
  latencyMs?: null | number;
  message: string;
  retryable: boolean;
  stage: string;
  status: 'failed' | 'passed' | 'skipped';
}

export interface TestLlmChannelResponse {
  capabilityResults: Record<string, LlmCapabilityCheckResult>;
  details: Record<string, unknown>;
  error?: null | string;
  errorCode?: null | string;
  latencyMs?: null | number;
  message: string;
  resolvedModel?: null | string;
  resolvedProtocol?: null | string;
  retryable?: boolean | null;
  stage?: null | string;
  success: boolean;
}

export interface NotificationTestAttempt {
  channel: NotificationTestChannel;
  errorCode?: null | string;
  httpStatus?: null | number;
  latencyMs?: null | number;
  message: string;
  retryable: boolean;
  stage: string;
  success: boolean;
  target?: null | string;
}

export interface TestNotificationChannelRequest {
  channel: NotificationTestChannel;
  content?: string;
  items?: SystemConfigUpdateItem[];
  maskToken?: string;
  timeoutSeconds?: number;
  title?: string;
}

export interface TestNotificationChannelResponse {
  attempts: NotificationTestAttempt[];
  errorCode?: null | string;
  latencyMs?: null | number;
  message: string;
  retryable: boolean;
  stage?: null | string;
  success: boolean;
}

export interface DiscoverLlmChannelModelsRequest {
  apiKey?: string;
  baseUrl?: string;
  models?: string[];
  name?: string;
  protocol?: string;
  timeoutSeconds?: number;
}

export interface DiscoverLlmChannelModelsResponse {
  details: Record<string, unknown>;
  error?: null | string;
  errorCode?: null | string;
  latencyMs?: null | number;
  message: string;
  models: string[];
  resolvedProtocol?: null | string;
  retryable?: boolean | null;
  stage?: null | string;
  success: boolean;
}
