import { requestClient } from '#/api/request';

import { toCamelCase } from './utils';

export interface SetupStatusResponse {
  missingRequired?: string[];
  ready?: boolean;
  status?: string;
}

export async function getSetupStatusApi() {
  const response = await requestClient.get<unknown>(
    '/system/config/setup/status',
  );
  return toCamelCase<SetupStatusResponse>(response);
}
