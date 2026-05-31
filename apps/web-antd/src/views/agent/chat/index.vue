<script lang="ts" setup>
import type {
  AnalysisReport,
  ChatProgressStep,
  ChatSessionItem,
  ChatSessionMessage,
  SkillInfo,
} from '#/api';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  CheckboxGroup,
  Collapse,
  Empty,
  List,
  ListItem,
  message,
  Modal,
  Space,
  Spin,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';

import {
  chatStreamApi,
  deleteChatSessionApi,
  getAgentSkillsApi,
  getChatSessionMessagesApi,
  getChatSessionsApi,
  getHistoryDetailApi,
  parseDsaApiError,
  sendChatToNotificationApi,
} from '#/api';

defineOptions({ name: 'AgentChat' });

type ChatMessage = ChatSessionMessage & {
  skillNames?: string[];
  thinkingSteps?: ChatProgressStep[];
};

const STORAGE_KEY_SESSION = 'dsa_vben_chat_session_id';

const quickQuestions = [
  { label: '这只股票现在适合买入吗？', skill: '' },
  { label: '用趋势和均线判断短线风险', skill: 'ma_golden_cross' },
  { label: '结合新闻和事件分析催化因素', skill: 'event_driven' },
  { label: '给出止损止盈和仓位建议', skill: '' },
];

const input = ref('');
const sessionId = ref('');
const messages = ref<ChatMessage[]>([]);
const sessions = ref<ChatSessionItem[]>([]);
const skills = ref<SkillInfo[]>([]);
const selectedSkillIds = ref<string[]>([]);
const progressSteps = ref<ChatProgressStep[]>([]);
const loading = ref(false);
const sessionsLoading = ref(false);
const messagesLoading = ref(false);
const chatError = ref('');
const lastFailedText = ref('');
const lastFailedSkillId = ref('');
const interruptedMessage = ref('');
const copiedMessageId = ref('');
const messagesRef = ref<HTMLElement | null>(null);
const followUpContext = ref<null | Record<string, unknown>>(null);
const followUpSource = ref('');

let abortController: AbortController | null = null;
const route = useRoute();
const router = useRouter();

const selectedSkillNames = computed(() => {
  if (selectedSkillIds.value.length === 0) return ['通用'];
  return selectedSkillIds.value.map((id) => {
    const skill = skills.value.find((item) => item.id === id);
    return skill?.displayName || skill?.name || id;
  });
});

const currentSession = computed(() =>
  sessions.value.find((item) => item.sessionId === sessionId.value),
);

const currentStage = computed(() => {
  const last = progressSteps.value.at(-1);
  if (!last) return '正在连接 Agent...';
  if (last.type === 'thinking') return last.message || 'AI 正在思考';
  if (last.type === 'tool_start') return `${last.displayName || last.tool}...`;
  if (last.type === 'tool_done') {
    return `${last.displayName || last.tool} 完成`;
  }
  if (last.type === 'generating') return last.message || '正在生成回答';
  return '处理中...';
});

function createSessionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getInitialSessionId() {
  return localStorage.getItem(STORAGE_KEY_SESSION) || createSessionId();
}

function persistSessionId(value: string) {
  sessionId.value = value;
  localStorage.setItem(STORAGE_KEY_SESSION, value);
}

function formatDateTime(value?: null | string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function roleLabel(role: string) {
  return role === 'user' ? '你' : 'DSA Agent';
}

function scrollToBottom() {
  nextTick(() => {
    const node = messagesRef.value;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  });
}

function parseInitialContext(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildReportFollowUpContext(report: AnalysisReport) {
  return {
    report_context_snapshot: report.details?.contextSnapshot,
    report_meta: report.meta,
    report_strategy: report.strategy,
    report_summary: report.summary,
  };
}

function legacyStockPrompt(stock: string, name?: string) {
  return [`${stock}${name ? ` ${name}` : ''}`, '帮我分析后续操作。'].join(' ');
}

async function hydrateLegacyContext() {
  const stock =
    typeof route.query.stock === 'string' ? route.query.stock.trim() : '';
  const name =
    typeof route.query.name === 'string' ? route.query.name.trim() : '';
  const recordId =
    typeof route.query.recordId === 'string'
      ? Number(route.query.recordId)
      : Number.NaN;

  if (Number.isFinite(recordId) && recordId > 0) {
    try {
      const report = await getHistoryDetailApi(recordId);
      followUpContext.value = buildReportFollowUpContext(report);
      followUpSource.value = [report.meta.stockCode, report.meta.stockName]
        .filter(Boolean)
        .join(' ');
      if (!input.value.trim()) {
        input.value = legacyStockPrompt(
          report.meta.stockCode,
          report.meta.stockName || undefined,
        );
      }
      return;
    } catch (error) {
      chatError.value = parseDsaApiError(error, '历史报告上下文加载失败');
    }
  }

  if (stock && !input.value.trim()) {
    input.value = legacyStockPrompt(stock, name || undefined);
    followUpSource.value = [stock, name].filter(Boolean).join(' ');
  }
}

async function hydrateFromRouteQuery() {
  const prompt = route.query.prompt;
  if (typeof prompt === 'string' && prompt.trim()) {
    input.value = prompt;
  }
  const context = parseInitialContext(route.query.context);
  if (context) {
    followUpContext.value = context;
    const meta = context.report_meta;
    if (meta && typeof meta === 'object') {
      const stockCode =
        (meta as { stock_code?: unknown; stockCode?: unknown }).stockCode ||
        (meta as { stock_code?: unknown }).stock_code;
      const stockName =
        (meta as { stock_name?: unknown; stockName?: unknown }).stockName ||
        (meta as { stock_name?: unknown }).stock_name;
      followUpSource.value = [stockCode, stockName].filter(Boolean).join(' ');
    } else {
      followUpSource.value = '分析报告';
    }
  }
  await hydrateLegacyContext();
  if (
    prompt ||
    route.query.context ||
    route.query.stock ||
    route.query.name ||
    route.query.recordId
  ) {
    router.replace({ path: route.path, query: {} });
  }
}

function updateSessionPreview(title: string) {
  if (sessions.value.some((item) => item.sessionId === sessionId.value)) {
    return;
  }
  sessions.value = [
    {
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      messageCount: 1,
      sessionId: sessionId.value,
      title: title.slice(0, 60),
    },
    ...sessions.value,
  ];
}

async function loadSkills() {
  try {
    const response = await getAgentSkillsApi();
    skills.value = response.filter((item) => item.enabled !== false);
  } catch {
    skills.value = [];
  }
}

async function loadSessions() {
  sessionsLoading.value = true;
  try {
    sessions.value = await getChatSessionsApi();
  } finally {
    sessionsLoading.value = false;
  }
}

async function switchSession(targetSessionId: string) {
  if (targetSessionId === sessionId.value && messages.value.length > 0) return;
  abortController?.abort();
  persistSessionId(targetSessionId);
  messages.value = [];
  progressSteps.value = [];
  chatError.value = '';
  messagesLoading.value = true;
  try {
    messages.value = await getChatSessionMessagesApi(targetSessionId);
  } finally {
    messagesLoading.value = false;
    scrollToBottom();
  }
}

function startNewChat() {
  abortController?.abort();
  persistSessionId(createSessionId());
  messages.value = [];
  progressSteps.value = [];
  chatError.value = '';
  interruptedMessage.value = '';
  input.value = '';
}

function parseSseChunk(buffer: string) {
  const events: ChatProgressStep[] = [];
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('data: ')) continue;
    try {
      events.push(JSON.parse(line.slice(6)) as ChatProgressStep);
    } catch {
      // Ignore malformed stream fragments.
    }
  }
  return { events, rest };
}

function applyStreamEvent(event: ChatProgressStep) {
  if (event.type === 'done') return event.content || '';
  if (event.type === 'error') {
    throw new Error(event.message || '问股请求失败');
  }
  progressSteps.value = [...progressSteps.value, event];
  return null;
}

async function sendMessage(overrideText?: string, overrideSkillId?: string) {
  const text = (overrideText ?? input.value).trim();
  if (!text || loading.value) return;

  const skillsForRequest = overrideSkillId
    ? [overrideSkillId]
    : [...selectedSkillIds.value];
  const skillNamesForMessage =
    skillsForRequest.length > 0
      ? skillsForRequest.map((id) => {
          const skill = skills.value.find((item) => item.id === id);
          return skill?.displayName || skill?.name || id;
        })
      : ['通用'];

  const userMessage: ChatMessage = {
    content: text,
    createdAt: new Date().toISOString(),
    id: createSessionId(),
    role: 'user',
    skillNames: skillNamesForMessage,
  };

  messages.value = [...messages.value, userMessage];
  updateSessionPreview(text);
  input.value = '';
  chatError.value = '';
  interruptedMessage.value = '';
  lastFailedText.value = '';
  lastFailedSkillId.value = '';
  progressSteps.value = [];
  loading.value = true;
  scrollToBottom();

  abortController?.abort();
  abortController = new AbortController();

  try {
    const response = await chatStreamApi(
      {
        message: text,
        context: followUpContext.value ?? undefined,
        sessionId: sessionId.value,
        skills: skillsForRequest.length > 0 ? skillsForRequest : undefined,
      },
      { signal: abortController.signal },
    );
    if (!response.body) {
      throw new Error('浏览器不支持流式响应');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        const content = applyStreamEvent(event);
        if (content !== null) finalContent = content;
      }
    }

    if (buffer.trim().startsWith('data: ')) {
      const event = JSON.parse(buffer.trim().slice(6)) as ChatProgressStep;
      const content = applyStreamEvent(event);
      if (content !== null) finalContent = content;
    }

    messages.value = [
      ...messages.value,
      {
        content: finalContent || '（无内容）',
        createdAt: new Date().toISOString(),
        id: createSessionId(),
        role: 'assistant',
        skillNames: skillNamesForMessage,
        thinkingSteps: [...progressSteps.value],
      },
    ];
    followUpContext.value = null;
    followUpSource.value = '';
    await loadSessions();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      interruptedMessage.value = '本次问股已中断，可以修改问题后重新发送。';
      return;
    }
    lastFailedText.value = text;
    lastFailedSkillId.value = overrideSkillId || '';
    chatError.value = parseDsaApiError(error, '问股请求失败');
  } finally {
    loading.value = false;
    progressSteps.value = [];
    abortController = null;
    scrollToBottom();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function stopStreaming() {
  abortController?.abort();
}

function retryLastMessage() {
  const text = lastFailedText.value;
  if (!text) return;
  sendMessage(text, lastFailedSkillId.value || undefined);
}

async function copyMessage(messageId: string, content: string) {
  await navigator.clipboard.writeText(content);
  copiedMessageId.value = messageId;
  window.setTimeout(() => {
    if (copiedMessageId.value === messageId) copiedMessageId.value = '';
  }, 1600);
}

function exportSession() {
  const lines: string[] = [
    `# 问股会话 ${currentSession.value?.title || ''}`,
    '',
  ];
  for (const item of messages.value) {
    lines.push(`## ${roleLabel(item.role)}`, '', item.content, '');
  }
  const blob = new Blob([lines.join('\n')], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `dsa-chat-${sessionId.value}.md`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function sendCurrentSessionToNotification() {
  const content = messages.value
    .map((item) => `## ${roleLabel(item.role)}\n\n${item.content}`)
    .join('\n\n');
  if (!content.trim()) return;
  const result = await sendChatToNotificationApi(content);
  if (result.success) {
    message.success('已发送到通知渠道');
  } else {
    message.error(result.message || '发送失败');
  }
}

function confirmDeleteSession(targetSession: ChatSessionItem) {
  Modal.confirm({
    content: `确认删除「${targetSession.title}」吗？`,
    okText: '删除',
    okType: 'danger',
    title: '删除对话',
    async onOk() {
      await deleteChatSessionApi(targetSession.sessionId);
      await loadSessions();
      if (targetSession.sessionId === sessionId.value) {
        startNewChat();
      }
    },
  });
}

onMounted(async () => {
  persistSessionId(getInitialSessionId());
  await hydrateFromRouteQuery();
  await Promise.allSettled([loadSkills(), loadSessions()]);
  const exists = sessions.value.some(
    (item) => item.sessionId === sessionId.value,
  );
  if (exists) {
    await switchSession(sessionId.value);
  }
});

onBeforeUnmount(() => {
  abortController?.abort();
});
</script>

<template>
  <Page
    description="多轮问股、策略技能分析、工具调用过程和会话沉淀。"
    title="问股"
  >
    <div class="agent-chat-page">
      <aside class="chat-sidebar">
        <div class="sidebar-header">
          <span>历史对话</span>
          <Button size="small" type="primary" @click="startNewChat">
            新对话
          </Button>
        </div>
        <Spin :spinning="sessionsLoading">
          <List :data-source="sessions" size="small">
            <template #renderItem="{ item }">
              <ListItem>
                <div
                  class="session-item"
                  :class="{ active: item.sessionId === sessionId }"
                >
                  <button type="button" @click="switchSession(item.sessionId)">
                    <strong>{{ item.title }}</strong>
                    <span>
                      {{ item.messageCount }} 条 ·
                      {{ formatDateTime(item.lastActive) || '刚刚' }}
                    </span>
                  </button>
                  <Button
                    danger
                    size="small"
                    type="text"
                    @click="confirmDeleteSession(item)"
                  >
                    删除
                  </Button>
                </div>
              </ListItem>
            </template>
          </List>
          <Empty
            v-if="!sessionsLoading && sessions.length === 0"
            description="暂无对话"
          />
        </Spin>
      </aside>

      <main class="chat-main">
        <Card class="chat-card" :body-style="{ padding: 0 }">
          <div ref="messagesRef" class="message-list">
            <Spin :spinning="messagesLoading">
              <Empty
                v-if="messages.length === 0 && !messagesLoading"
                description="输入股票代码、名称或问题，开始问股"
              />
              <div
                v-for="item in messages"
                :key="item.id"
                class="message-row"
                :class="item.role"
              >
                <div class="message-bubble">
                  <div class="message-meta">
                    <strong>{{ roleLabel(item.role) }}</strong>
                    <span>{{ formatDateTime(item.createdAt) }}</span>
                    <Tag v-for="skill in item.skillNames" :key="skill">
                      {{ skill }}
                    </Tag>
                  </div>
                  <pre>{{ item.content }}</pre>
                  <div class="message-actions">
                    <Button
                      size="small"
                      type="link"
                      @click="copyMessage(item.id, item.content)"
                    >
                      {{ copiedMessageId === item.id ? '已复制' : '复制' }}
                    </Button>
                  </div>
                  <Collapse
                    v-if="item.thinkingSteps?.length"
                    ghost
                    size="small"
                    class="thinking-collapse"
                  >
                    <Collapse.Panel key="steps" header="思考过程">
                      <div
                        v-for="(step, index) in item.thinkingSteps"
                        :key="`${item.id}-${index}`"
                        class="progress-step"
                      >
                        <Tag>{{ step.type }}</Tag>
                        <span>
                          {{
                            step.message ||
                            step.displayName ||
                            step.tool ||
                            step.content ||
                            '-'
                          }}
                        </span>
                      </div>
                    </Collapse.Panel>
                  </Collapse>
                </div>
              </div>
              <div v-if="loading" class="streaming-state">
                <Spin size="small" />
                <span>{{ currentStage }}</span>
              </div>
            </Spin>
          </div>

          <Alert
            v-if="chatError"
            closable
            class="chat-error"
            :message="chatError"
            type="error"
            @close="chatError = ''"
          >
            <template #action>
              <Button
                v-if="lastFailedText"
                danger
                size="small"
                @click="retryLastMessage"
              >
                重试
              </Button>
            </template>
          </Alert>

          <Alert
            v-if="interruptedMessage"
            closable
            class="chat-error"
            show-icon
            type="warning"
            :message="interruptedMessage"
            @close="interruptedMessage = ''"
          />

          <Alert
            v-if="followUpContext"
            class="chat-error"
            show-icon
            type="info"
            :message="`已带入${followUpSource || '分析报告'}上下文，下一次发送会基于该报告继续追问。`"
          />

          <div class="composer">
            <Textarea
              v-model:value="input"
              :auto-size="{ minRows: 3, maxRows: 8 }"
              :disabled="loading"
              placeholder="例如：600519 最近能不能买？或者输入 AAPL 财报后怎么看？"
              @keydown="handleKeydown"
            />
            <div class="composer-actions">
              <Space wrap>
                <Button
                  :disabled="messages.length === 0"
                  @click="exportSession"
                >
                  导出会话
                </Button>
                <Button
                  :disabled="messages.length === 0"
                  @click="sendCurrentSessionToNotification"
                >
                  发送通知
                </Button>
                <Button v-if="loading" danger @click="stopStreaming">
                  停止
                </Button>
              </Space>
              <Button
                type="primary"
                :disabled="!input.trim() || loading"
                :loading="loading"
                @click="sendMessage()"
              >
                发送
              </Button>
            </div>
          </div>
        </Card>
      </main>

      <aside class="chat-tools">
        <Card title="策略技能">
          <CheckboxGroup
            v-model:value="selectedSkillIds"
            class="skill-list"
            :options="
              skills.map((item) => ({
                label: item.displayName || item.name || item.id,
                value: item.id,
              }))
            "
          />
          <div class="selected-skills">
            <Tag v-for="skill in selectedSkillNames" :key="skill">
              {{ skill }}
            </Tag>
          </div>
        </Card>

        <Card class="mt-4" title="快捷问题">
          <div class="quick-list">
            <Tooltip
              v-for="question in quickQuestions"
              :key="question.label"
              :title="question.skill || '通用'"
            >
              <Button
                block
                @click="
                  sendMessage(question.label, question.skill || undefined)
                "
              >
                {{ question.label }}
              </Button>
            </Tooltip>
          </div>
        </Card>
      </aside>
    </div>
  </Page>
</template>

<style scoped>
.agent-chat-page {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 300px;
  gap: 16px;
  height: calc(100vh - 150px);
  min-height: 680px;
  padding: 16px;
}

.chat-sidebar,
.chat-main,
.chat-tools {
  min-width: 0;
}

.chat-sidebar {
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  font-weight: 600;
  border-bottom: 1px solid hsl(var(--border));
}

.session-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  width: 100%;
  padding: 8px;
  border-radius: 6px;
}

.session-item.active {
  background: hsl(var(--primary) / 10%);
}

.session-item button:first-child {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.session-item strong,
.session-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item span {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.chat-card {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.message-list {
  height: calc(100% - 190px);
  min-height: 420px;
  padding: 18px;
  overflow: auto;
}

.message-row {
  display: flex;
  margin-bottom: 14px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-bubble {
  width: min(780px, 92%);
  padding: 12px;
  background: hsl(var(--muted) / 40%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.message-row.user .message-bubble {
  background: hsl(var(--primary) / 10%);
}

.message-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.message-bubble pre {
  margin: 0;
  font-family: inherit;
  line-height: 1.7;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
}

.message-actions {
  margin-top: 8px;
  text-align: right;
}

.thinking-collapse {
  margin-top: 8px;
}

.progress-step {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 6px;
}

.streaming-state {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  color: hsl(var(--muted-foreground));
}

.chat-error {
  margin: 0 16px 12px;
}

.composer {
  padding: 14px;
  border-top: 1px solid hsl(var(--border));
}

.composer-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.skill-list {
  display: grid;
  gap: 10px;
}

.selected-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.quick-list {
  display: grid;
  gap: 8px;
}

.mt-4 {
  margin-top: 16px;
}

@media (max-width: 1280px) {
  .agent-chat-page {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .chat-tools {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .agent-chat-page {
    grid-template-columns: 1fr;
    height: auto;
  }

  .message-list {
    height: 520px;
  }
}
</style>
