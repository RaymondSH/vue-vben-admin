import type {
  DiscoverLlmChannelModelsRequest,
  DiscoverLlmChannelModelsResponse,
  ExportSystemConfigResponse,
  ImportSystemConfigRequest,
  SetupStatusResponse,
  SystemConfigResponse,
  TestLlmChannelRequest,
  TestLlmChannelResponse,
  TestNotificationChannelRequest,
  TestNotificationChannelResponse,
  UpdateSystemConfigRequest,
  UpdateSystemConfigResponse,
  ValidateSystemConfigRequest,
  ValidateSystemConfigResponse,
} from './types';

import { requestClient } from '#/api/request';

import { toCamelCase, toSnakeCase } from './utils';

export async function discoverLlmChannelModelsApi(
  payload: DiscoverLlmChannelModelsRequest,
) {
  const response = await requestClient.post<unknown>(
    '/system/config/llm/discover-models',
    {
      data: toSnakeCase({ ...payload }),
    },
  );
  return toCamelCase<DiscoverLlmChannelModelsResponse>(response);
}

export async function exportSystemConfigApi() {
  const response = await requestClient.get<unknown>('/system/config/export');
  return toCamelCase<ExportSystemConfigResponse>(response);
}

export async function getSetupStatusApi() {
  const response = await requestClient.get<unknown>(
    '/system/config/setup/status',
  );
  return toCamelCase<SetupStatusResponse>(response);
}

export async function getSystemConfigApi(includeSchema = true) {
  const response = await requestClient.get<unknown>('/system/config', {
    params: { include_schema: includeSchema },
  });
  return toCamelCase<SystemConfigResponse>(response);
}

export async function importSystemConfigApi(
  payload: ImportSystemConfigRequest,
) {
  const response = await requestClient.post<unknown>('/system/config/import', {
    data: toSnakeCase({
      reloadNow: true,
      ...payload,
    }),
  });
  return toCamelCase<UpdateSystemConfigResponse>(response);
}

export async function testLlmChannelApi(payload: TestLlmChannelRequest) {
  const response = await requestClient.post<unknown>(
    '/system/config/llm/test-channel',
    {
      data: toSnakeCase({
        capabilityChecks: [],
        enabled: true,
        models: [],
        name: 'channel',
        protocol: 'openai',
        timeoutSeconds: 20,
        ...payload,
      }),
    },
  );
  return toCamelCase<TestLlmChannelResponse>(response);
}

export async function testNotificationChannelApi(
  payload: TestNotificationChannelRequest,
) {
  const response = await requestClient.post<unknown>(
    '/system/config/notification/test-channel',
    {
      data: toSnakeCase({
        content: '这是一条来自 DSA Web 设置页的通知测试消息。',
        items: [],
        maskToken: '******',
        timeoutSeconds: 20,
        title: 'DSA 通知测试',
        ...payload,
      }),
    },
  );
  return toCamelCase<TestNotificationChannelResponse>(response);
}

export async function updateSystemConfigApi(
  payload: UpdateSystemConfigRequest,
) {
  const response = await requestClient.put<unknown>('/system/config', {
    data: toSnakeCase({
      maskToken: '******',
      reloadNow: true,
      ...payload,
    }),
  });
  return toCamelCase<UpdateSystemConfigResponse>(response);
}

export async function validateSystemConfigApi(
  payload: ValidateSystemConfigRequest,
) {
  const response = await requestClient.post<unknown>(
    '/system/config/validate',
    {
      data: toSnakeCase({ ...payload }),
    },
  );
  return toCamelCase<ValidateSystemConfigResponse>(response);
}
