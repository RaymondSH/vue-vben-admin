import type { StockImportResponse } from './types';

import { requestClient } from '#/api/request';

import { toCamelCase } from './utils';

export async function extractStocksFromImageApi(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await requestClient.post<unknown>(
    '/stocks/extract-from-image',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    },
  );
  return toCamelCase<StockImportResponse>(response);
}

export async function parseStocksImportFileApi(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await requestClient.post<unknown>(
    '/stocks/parse-import',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return toCamelCase<StockImportResponse>(response);
}

export async function parseStocksImportTextApi(text: string) {
  const response = await requestClient.post<unknown>('/stocks/parse-import', {
    text,
  });
  return toCamelCase<StockImportResponse>(response);
}
