import type {
  AnalysisReport,
  AnalysisRequest,
  AnalyzeAsyncResponse,
  AnalyzeResponse,
  MarketReviewAccepted,
  MarketReviewRequest,
  TaskListResponse,
  TaskStatus,
} from './types';

import { requestClient } from '#/api/request';

import { getApiStreamBaseUrl, toCamelCase, toSnakeCase } from './utils';

function normalizeAnalyzeResponse(data: unknown): AnalyzeResponse {
  const result = toCamelCase<AnalyzeResponse>(data);
  if ('report' in result && result.report) {
    result.report = toCamelCase<AnalysisReport>(result.report);
  }
  return result;
}

export async function analyzeStockApi(data: AnalysisRequest) {
  const response = await requestClient.post<unknown>(
    '/analysis/analyze',
    toSnakeCase({
      asyncMode: data.asyncMode ?? false,
      forceRefresh: data.forceRefresh ?? false,
      notify: data.notify,
      originalQuery: data.originalQuery,
      reportType: data.reportType || 'detailed',
      selectionSource: data.selectionSource,
      skills: data.skills,
      stockCode: data.stockCode,
      stockCodes: data.stockCodes,
      stockName: data.stockName,
    }),
  );
  return normalizeAnalyzeResponse(response);
}

export async function analyzeStockAsyncApi(data: AnalysisRequest) {
  const response = await requestClient.post<unknown>(
    '/analysis/analyze',
    toSnakeCase({
      ...data,
      asyncMode: true,
      forceRefresh: data.forceRefresh ?? false,
      reportType: data.reportType || 'detailed',
    }),
  );
  return toCamelCase<AnalyzeAsyncResponse>(response);
}

export async function triggerMarketReviewApi(data: MarketReviewRequest = {}) {
  const response = await requestClient.post<unknown>(
    '/analysis/market-review',
    {
      send_notification: data.sendNotification ?? true,
    },
  );
  return toCamelCase<MarketReviewAccepted>(response);
}

export async function getTaskStatusApi(taskId: string) {
  const response = await requestClient.get<unknown>(
    `/analysis/status/${taskId}`,
  );
  const data = toCamelCase<TaskStatus>(response);
  if (data.result?.report) {
    data.result.report = toCamelCase<AnalysisReport>(data.result.report);
  }
  return data;
}

export async function getTasksApi(params?: {
  limit?: number;
  status?: string;
}) {
  const response = await requestClient.get<unknown>('/analysis/tasks', {
    params,
  });
  return toCamelCase<TaskListResponse>(response);
}

export function getTaskStreamUrl() {
  return `${getApiStreamBaseUrl()}/analysis/tasks/stream`;
}
