import type {
  AlertDeleteResponse,
  AlertNotificationListResponse,
  AlertRuleCreateRequest,
  AlertRuleItem,
  AlertRuleListResponse,
  AlertRuleTestResponse,
  AlertTargetScope,
  AlertTriggerListResponse,
  AlertType,
} from './types';

import { requestClient } from '#/api/request';

import { toCamelCase, toSnakeCase } from './utils';

type RuleListQuery = {
  alertType?: AlertType;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  source?: string;
  target?: string;
  targetScope?: AlertTargetScope;
};

type TriggerListQuery = {
  page?: number;
  pageSize?: number;
  ruleId?: number;
  status?: string;
  target?: string;
};

type NotificationListQuery = {
  channel?: string;
  page?: number;
  pageSize?: number;
  success?: boolean;
  triggerId?: number;
};

export async function listAlertRulesApi(query: RuleListQuery = {}) {
  const response = await requestClient.get<unknown>('/alerts/rules', {
    params: toSnakeCase(query),
  });
  return toCamelCase<AlertRuleListResponse>(response);
}

export async function createAlertRuleApi(data: AlertRuleCreateRequest) {
  const response = await requestClient.post<unknown>(
    '/alerts/rules',
    toSnakeCase({
      alertType: data.alertType,
      enabled: data.enabled,
      name: data.name,
      parameters: data.parameters,
      severity: data.severity,
      target: data.target,
      targetScope: data.targetScope,
    }),
  );
  return toCamelCase<AlertRuleItem>(response);
}

export async function deleteAlertRuleApi(ruleId: number) {
  const response = await requestClient.delete<unknown>(
    `/alerts/rules/${ruleId}`,
  );
  return toCamelCase<AlertDeleteResponse>(response);
}

export async function enableAlertRuleApi(ruleId: number) {
  const response = await requestClient.post<unknown>(
    `/alerts/rules/${ruleId}/enable`,
  );
  return toCamelCase<AlertRuleItem>(response);
}

export async function disableAlertRuleApi(ruleId: number) {
  const response = await requestClient.post<unknown>(
    `/alerts/rules/${ruleId}/disable`,
  );
  return toCamelCase<AlertRuleItem>(response);
}

export async function testAlertRuleApi(ruleId: number) {
  const response = await requestClient.post<unknown>(
    `/alerts/rules/${ruleId}/test`,
  );
  return toCamelCase<AlertRuleTestResponse>(response);
}

export async function listAlertTriggersApi(query: TriggerListQuery = {}) {
  const response = await requestClient.get<unknown>('/alerts/triggers', {
    params: toSnakeCase(query),
  });
  return toCamelCase<AlertTriggerListResponse>(response);
}

export async function listAlertNotificationsApi(
  query: NotificationListQuery = {},
) {
  const response = await requestClient.get<unknown>('/alerts/notifications', {
    params: toSnakeCase(query),
  });
  return toCamelCase<AlertNotificationListResponse>(response);
}
