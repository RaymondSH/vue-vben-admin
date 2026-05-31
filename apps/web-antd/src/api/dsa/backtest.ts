import type {
  BacktestPerformanceMetrics,
  BacktestResultsResponse,
  BacktestRunRequest,
  BacktestRunResponse,
} from './types';

import { requestClient } from '#/api/request';

import { toCamelCase, toSnakeCase } from './utils';

type BacktestListQuery = {
  analysisDateFrom?: string;
  analysisDateTo?: string;
  code?: string;
  evalWindowDays?: number;
  limit?: number;
  page?: number;
};

type BacktestPerformanceQuery = {
  analysisDateFrom?: string;
  analysisDateTo?: string;
  evalWindowDays?: number;
};

export async function runBacktestApi(data: BacktestRunRequest = {}) {
  const response = await requestClient.post<unknown>(
    '/backtest/run',
    toSnakeCase({
      code: data.code,
      evalWindowDays: data.evalWindowDays,
      force: data.force ?? false,
      limit: data.limit,
      minAgeDays: data.minAgeDays,
    }),
  );
  return toCamelCase<BacktestRunResponse>(response);
}

export async function getBacktestResultsApi(query: BacktestListQuery = {}) {
  const response = await requestClient.get<unknown>('/backtest/results', {
    params: toSnakeCase({
      analysisDateFrom: query.analysisDateFrom,
      analysisDateTo: query.analysisDateTo,
      code: query.code,
      evalWindowDays: query.evalWindowDays,
      limit: query.limit ?? 20,
      page: query.page ?? 1,
    }),
  });
  return toCamelCase<BacktestResultsResponse>(response);
}

export async function getBacktestPerformanceApi(
  query: BacktestPerformanceQuery = {},
) {
  const response = await requestClient.get<unknown>('/backtest/performance', {
    params: toSnakeCase(query),
  });
  return toCamelCase<BacktestPerformanceMetrics>(response);
}

export async function getStockBacktestPerformanceApi(
  code: string,
  query: BacktestPerformanceQuery = {},
) {
  const response = await requestClient.get<unknown>(
    `/backtest/performance/${encodeURIComponent(code)}`,
    {
      params: toSnakeCase(query),
    },
  );
  return toCamelCase<BacktestPerformanceMetrics>(response);
}
