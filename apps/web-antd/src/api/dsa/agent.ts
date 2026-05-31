import type {
  ChatSessionItem,
  ChatSessionMessage,
  ChatStreamRequest,
  SkillInfo,
} from './types';

import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

import { getApiStreamBaseUrl, toCamelCase } from './utils';

export async function getAgentSkillsApi() {
  const response = await requestClient.get<unknown>('/agent/skills');
  const data = toCamelCase<{ skills: SkillInfo[] }>(response);
  return data.skills || [];
}

export async function getChatSessionsApi(limit = 50) {
  const response = await requestClient.get<unknown>('/agent/chat/sessions', {
    params: { limit },
  });
  const data = toCamelCase<{ sessions: ChatSessionItem[] }>(response);
  return data.sessions || [];
}

export async function getChatSessionMessagesApi(sessionId: string) {
  const response = await requestClient.get<unknown>(
    `/agent/chat/sessions/${sessionId}`,
  );
  const data = toCamelCase<{ messages: ChatSessionMessage[] }>(response);
  return data.messages || [];
}

export async function deleteChatSessionApi(sessionId: string) {
  await requestClient.delete(`/agent/chat/sessions/${sessionId}`);
}

export async function sendChatToNotificationApi(content: string) {
  const response = await requestClient.post<unknown>('/agent/chat/send', {
    content,
  });
  return toCamelCase<{ message?: string; success: boolean }>(response);
}

export async function chatStreamApi(
  payload: ChatStreamRequest,
  options?: { signal?: AbortSignal },
) {
  const accessStore = useAccessStore();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (accessStore.accessToken) {
    headers.Authorization = `Bearer ${accessStore.accessToken}`;
  }

  const response = await fetch(`${getApiStreamBaseUrl()}/agent/chat/stream`, {
    body: JSON.stringify({
      context: payload.context,
      message: payload.message,
      session_id: payload.sessionId,
      skills: payload.skills,
    }),
    credentials: 'include',
    headers,
    method: 'POST',
    signal: options?.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Agent 请求失败: ${response.status}`);
  }

  return response;
}
