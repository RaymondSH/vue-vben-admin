import type { AnalysisReport, HistoryListResponse } from './types';

import { requestClient } from '#/api/request';

import { toCamelCase } from './utils';

export interface GetHistoryListParams {
  endDate?: string;
  limit?: number;
  page?: number;
  startDate?: string;
  stockCode?: string;
}

export async function getHistoryListApi(params: GetHistoryListParams = {}) {
  const queryParams: Record<string, number | string> = {
    limit: params.limit ?? 20,
    page: params.page ?? 1,
  };
  if (params.stockCode) queryParams.stock_code = params.stockCode;
  if (params.startDate) queryParams.start_date = params.startDate;
  if (params.endDate) queryParams.end_date = params.endDate;

  const response = await requestClient.get<unknown>('/history', {
    params: queryParams,
  });
  return toCamelCase<HistoryListResponse>(response);
}

export async function getHistoryDetailApi(recordId: number) {
  const response = await requestClient.get<unknown>(`/history/${recordId}`);
  return toCamelCase<AnalysisReport>(response);
}

export async function getHistoryMarkdownApi(recordId: number) {
  const response = await requestClient.get<{ content: string }>(
    `/history/${recordId}/markdown`,
  );
  return response.content;
}

export async function deleteHistoryRecordsApi(recordIds: number[]) {
  const response = await requestClient.delete<unknown>('/history', {
    data: { record_ids: recordIds },
  });
  return toCamelCase<{ deleted: number }>(response);
}
