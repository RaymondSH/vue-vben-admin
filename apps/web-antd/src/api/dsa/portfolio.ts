import type {
  PortfolioAccountCreateRequest,
  PortfolioAccountItem,
  PortfolioAccountListResponse,
  PortfolioCashLedgerCreateRequest,
  PortfolioCashLedgerListResponse,
  PortfolioCorporateActionCreateRequest,
  PortfolioCorporateActionListResponse,
  PortfolioCostMethod,
  PortfolioDeleteResponse,
  PortfolioEventCreatedResponse,
  PortfolioFxRefreshResponse,
  PortfolioImportBrokerListResponse,
  PortfolioImportCommitResponse,
  PortfolioImportParseResponse,
  PortfolioRiskResponse,
  PortfolioSnapshotResponse,
  PortfolioTradeCreateRequest,
  PortfolioTradeListResponse,
} from './types';

import { requestClient } from '#/api/request';

import { toCamelCase, toSnakeCase } from './utils';

type SnapshotQuery = {
  accountId?: number;
  asOf?: string;
  costMethod?: PortfolioCostMethod;
};

type FxRefreshQuery = {
  accountId?: number;
  asOf?: string;
};

type EventQuery = {
  accountId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

type TradeListQuery = EventQuery & {
  side?: 'buy' | 'sell';
  symbol?: string;
};

type CashListQuery = EventQuery & {
  direction?: 'in' | 'out';
};

type CorporateListQuery = EventQuery & {
  actionType?: 'cash_dividend' | 'split_adjustment';
  symbol?: string;
};

function buildSnapshotParams(query: SnapshotQuery) {
  return toSnakeCase({
    accountId: query.accountId,
    asOf: query.asOf,
    costMethod: query.costMethod,
  });
}

function buildEventParams(query: EventQuery) {
  return toSnakeCase({
    accountId: query.accountId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    page: query.page,
    pageSize: query.pageSize,
  });
}

export async function getPortfolioAccountsApi(includeInactive = false) {
  const response = await requestClient.get<unknown>('/portfolio/accounts', {
    params: { include_inactive: includeInactive },
  });
  return toCamelCase<PortfolioAccountListResponse>(response);
}

export async function createPortfolioAccountApi(
  data: PortfolioAccountCreateRequest,
) {
  const response = await requestClient.post<unknown>(
    '/portfolio/accounts',
    toSnakeCase({ ...data }),
  );
  return toCamelCase<PortfolioAccountItem>(response);
}

export async function getPortfolioSnapshotApi(query: SnapshotQuery = {}) {
  const response = await requestClient.get<unknown>('/portfolio/snapshot', {
    params: buildSnapshotParams(query),
  });
  return toCamelCase<PortfolioSnapshotResponse>(response);
}

export async function getPortfolioRiskApi(query: SnapshotQuery = {}) {
  const response = await requestClient.get<unknown>('/portfolio/risk', {
    params: buildSnapshotParams(query),
  });
  return toCamelCase<PortfolioRiskResponse>(response);
}

export async function refreshPortfolioFxApi(query: FxRefreshQuery = {}) {
  const response = await requestClient.post<unknown>(
    '/portfolio/fx/refresh',
    undefined,
    {
      params: toSnakeCase({ accountId: query.accountId, asOf: query.asOf }),
    },
  );
  return toCamelCase<PortfolioFxRefreshResponse>(response);
}

export async function createPortfolioTradeApi(
  data: PortfolioTradeCreateRequest,
) {
  const response = await requestClient.post<unknown>(
    '/portfolio/trades',
    toSnakeCase({
      ...data,
      fee: data.fee ?? 0,
      tax: data.tax ?? 0,
    }),
  );
  return toCamelCase<PortfolioEventCreatedResponse>(response);
}

export async function deletePortfolioTradeApi(tradeId: number) {
  const response = await requestClient.delete<unknown>(
    `/portfolio/trades/${tradeId}`,
  );
  return toCamelCase<PortfolioDeleteResponse>(response);
}

export async function listPortfolioTradesApi(query: TradeListQuery = {}) {
  const response = await requestClient.get<unknown>('/portfolio/trades', {
    params: {
      ...buildEventParams(query),
      side: query.side,
      symbol: query.symbol,
    },
  });
  return toCamelCase<PortfolioTradeListResponse>(response);
}

export async function createPortfolioCashLedgerApi(
  data: PortfolioCashLedgerCreateRequest,
) {
  const response = await requestClient.post<unknown>(
    '/portfolio/cash-ledger',
    toSnakeCase({ ...data }),
  );
  return toCamelCase<PortfolioEventCreatedResponse>(response);
}

export async function deletePortfolioCashLedgerApi(entryId: number) {
  const response = await requestClient.delete<unknown>(
    `/portfolio/cash-ledger/${entryId}`,
  );
  return toCamelCase<PortfolioDeleteResponse>(response);
}

export async function listPortfolioCashLedgerApi(query: CashListQuery = {}) {
  const response = await requestClient.get<unknown>('/portfolio/cash-ledger', {
    params: {
      ...buildEventParams(query),
      direction: query.direction,
    },
  });
  return toCamelCase<PortfolioCashLedgerListResponse>(response);
}

export async function createPortfolioCorporateActionApi(
  data: PortfolioCorporateActionCreateRequest,
) {
  const response = await requestClient.post<unknown>(
    '/portfolio/corporate-actions',
    toSnakeCase({ ...data }),
  );
  return toCamelCase<PortfolioEventCreatedResponse>(response);
}

export async function deletePortfolioCorporateActionApi(actionId: number) {
  const response = await requestClient.delete<unknown>(
    `/portfolio/corporate-actions/${actionId}`,
  );
  return toCamelCase<PortfolioDeleteResponse>(response);
}

export async function listPortfolioCorporateActionsApi(
  query: CorporateListQuery = {},
) {
  const response = await requestClient.get<unknown>(
    '/portfolio/corporate-actions',
    {
      params: {
        ...buildEventParams(query),
        action_type: query.actionType,
        symbol: query.symbol,
      },
    },
  );
  return toCamelCase<PortfolioCorporateActionListResponse>(response);
}

export async function listPortfolioImportBrokersApi() {
  const response = await requestClient.get<unknown>(
    '/portfolio/imports/csv/brokers',
  );
  return toCamelCase<PortfolioImportBrokerListResponse>(response);
}

export async function parsePortfolioCsvImportApi(broker: string, file: File) {
  const formData = new FormData();
  formData.append('broker', broker);
  formData.append('file', file);
  const response = await requestClient.post<unknown>(
    '/portfolio/imports/csv/parse',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return toCamelCase<PortfolioImportParseResponse>(response);
}

export async function commitPortfolioCsvImportApi(
  accountId: number,
  broker: string,
  file: File,
  dryRun = false,
) {
  const formData = new FormData();
  formData.append('account_id', String(accountId));
  formData.append('broker', broker);
  formData.append('dry_run', dryRun ? 'true' : 'false');
  formData.append('file', file);
  const response = await requestClient.post<unknown>(
    '/portfolio/imports/csv/commit',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return toCamelCase<PortfolioImportCommitResponse>(response);
}
