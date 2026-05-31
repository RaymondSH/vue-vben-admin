<script lang="ts" setup>
import type {
  ConfigValidationIssue,
  DiscoverLlmChannelModelsResponse,
  LlmCapabilityCheck,
  NotificationTestChannel,
  SystemConfigCategory,
  SystemConfigItem,
  SystemConfigOption,
  SystemConfigUpdateItem,
  TestLlmChannelResponse,
  TestNotificationChannelResponse,
} from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  FormItem,
  Input,
  message,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Textarea,
} from 'ant-design-vue';

import {
  discoverLlmChannelModelsApi,
  exportSystemConfigApi,
  getSystemConfigApi,
  importSystemConfigApi,
  testLlmChannelApi,
  testNotificationChannelApi,
  updateSystemConfigApi,
  validateSystemConfigApi,
} from '#/api';

defineOptions({ name: 'SystemSettings' });

interface CategorySummary {
  category: SystemConfigCategory;
  dirtyCount: number;
  itemCount: number;
  order: number;
  title: string;
}

const categoryMeta: Record<
  SystemConfigCategory,
  { description: string; title: string }
> = {
  agent: { description: 'Agent 能力、工具调用与会话行为。', title: 'Agent' },
  ai_model: { description: 'LLM 通道、模型与接口地址。', title: 'AI 模型' },
  backtest: { description: '回测窗口、阈值与批处理参数。', title: '回测' },
  base: { description: '基础运行参数和股票列表。', title: '基础' },
  data_source: { description: '行情、新闻与财务数据源配置。', title: '数据源' },
  notification: {
    description: '通知渠道、推送令牌与消息模板。',
    title: '通知',
  },
  system: { description: '认证、安全、调度与运行时选项。', title: '系统' },
  uncategorized: { description: '暂未归类的配置项。', title: '其他' },
};

const notificationChannelOptions = [
  { label: '企业微信', value: 'wechat' },
  { label: '飞书', value: 'feishu' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Email', value: 'email' },
  { label: 'Pushover', value: 'pushover' },
  { label: 'Ntfy', value: 'ntfy' },
  { label: 'Gotify', value: 'gotify' },
  { label: 'PushPlus', value: 'pushplus' },
  { label: 'ServerChan3', value: 'serverchan3' },
  { label: 'Discord', value: 'discord' },
  { label: 'Slack', value: 'slack' },
  { label: 'AstrBot', value: 'astrbot' },
  { label: '自定义 Webhook', value: 'custom' },
];

const capabilityOptions = [
  { label: 'JSON', value: 'json' },
  { label: '流式', value: 'stream' },
  { label: '工具调用', value: 'tools' },
  { label: '视觉', value: 'vision' },
];

const loading = ref(false);
const saving = ref(false);
const exporting = ref(false);
const importing = ref(false);
const testingLlm = ref(false);
const discoveringModels = ref(false);
const testingNotification = ref(false);
const errorMessage = ref('');
const configVersion = ref('');
const maskToken = ref('******');
const updatedAt = ref<null | string>(null);
const activeCategory = ref<SystemConfigCategory>('base');
const items = ref<SystemConfigItem[]>([]);
const validationIssues = ref<ConfigValidationIssue[]>([]);
const llmResult = ref<null | TestLlmChannelResponse>(null);
const modelDiscoveryResult = ref<DiscoverLlmChannelModelsResponse | null>(null);
const notificationResult = ref<null | TestNotificationChannelResponse>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const draftValues = reactive<Record<string, string>>({});

const llmForm = reactive({
  apiKey: '',
  baseUrl: '',
  capabilityChecks: ['stream'] as LlmCapabilityCheck[],
  models: '',
  name: 'web-test',
  protocol: 'openai',
});

const notificationForm = reactive({
  channel: 'wechat' as NotificationTestChannel,
  content: '这是一条来自 DSA Web 设置页的通知测试消息。',
  title: 'DSA 通知测试',
});

const dirtyKeys = computed(() =>
  items.value
    .filter((item) => item.schema?.isEditable !== false)
    .filter((item) => (draftValues[item.key] ?? '') !== item.value)
    .map((item) => item.key),
);

const dirtyKeySet = computed(() => new Set(dirtyKeys.value));

const activeDescription = computed(
  () => categoryMeta[activeCategory.value]?.description || '',
);

const categories = computed<CategorySummary[]>(() => {
  const groups = new Map<SystemConfigCategory, CategorySummary>();

  for (const item of items.value) {
    const category = item.schema?.category || 'uncategorized';
    const current = groups.get(category);
    const order = item.schema?.displayOrder ?? 9999;
    const dirty = dirtyKeySet.value.has(item.key) ? 1 : 0;

    if (current) {
      current.dirtyCount += dirty;
      current.itemCount += 1;
      current.order = Math.min(current.order, order);
      continue;
    }

    groups.set(category, {
      category,
      dirtyCount: dirty,
      itemCount: 1,
      order,
      title: categoryMeta[category]?.title || category,
    });
  }

  return [...groups.values()].toSorted(
    (left, right) => left.order - right.order,
  );
});

const activeItems = computed(() =>
  items.value
    .filter(
      (item) =>
        (item.schema?.category || 'uncategorized') === activeCategory.value,
    )
    .toSorted(
      (left, right) =>
        (left.schema?.displayOrder ?? 9999) -
        (right.schema?.displayOrder ?? 9999),
    ),
);

const issuesByKey = computed(() => {
  const groups = new Map<string, ConfigValidationIssue[]>();

  for (const issue of validationIssues.value) {
    groups.set(issue.key, [...(groups.get(issue.key) || []), issue]);
  }

  return groups;
});

const allDraftItems = computed<SystemConfigUpdateItem[]>(() =>
  items.value.map((item) => ({
    key: item.key,
    value: draftValues[item.key] ?? '',
  })),
);

const visibleDirtyCount = computed(
  () =>
    activeItems.value.filter((item) => dirtyKeySet.value.has(item.key)).length,
);

function fieldTitle(item: SystemConfigItem) {
  return item.schema?.title || item.key;
}

function fieldDescription(item: SystemConfigItem) {
  return item.schema?.description || '';
}

function fieldPlaceholder(item: SystemConfigItem) {
  const examples = item.schema?.examples || [];
  return examples.length > 0 ? `示例：${examples[0]}` : item.key;
}

function formatDateTime(value?: null | string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function isBooleanTrue(value?: string) {
  return String(value || '').toLowerCase() === 'true';
}

function modelList() {
  return llmForm.models
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionItems(item: SystemConfigItem) {
  return (item.schema?.options || []).map((option) => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }

    return option as SystemConfigOption;
  });
}

function statusTone(success?: boolean) {
  return success ? 'success' : 'error';
}

function setBooleanValue(key: string, checked: boolean) {
  draftValues[key] = checked ? 'true' : 'false';
}

function setDraftValue(key: string, value?: number | string) {
  draftValues[key] = value === undefined ? '' : String(value);
}

function dirtyUpdateItems() {
  return dirtyKeys.value.map((key) => ({
    key,
    value: draftValues[key] ?? '',
  }));
}

function syncDraft(nextItems: SystemConfigItem[]) {
  for (const key of Object.keys(draftValues)) {
    delete draftValues[key];
  }

  for (const item of nextItems) {
    draftValues[item.key] = item.value;
  }
}

async function loadConfig() {
  loading.value = true;
  errorMessage.value = '';
  validationIssues.value = [];

  try {
    const response = await getSystemConfigApi(true);
    configVersion.value = response.configVersion;
    maskToken.value = response.maskToken || '******';
    updatedAt.value = response.updatedAt || null;
    items.value = response.items;
    syncDraft(response.items);

    if (
      !categories.value.some((item) => item.category === activeCategory.value)
    ) {
      activeCategory.value = categories.value[0]?.category || 'base';
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '系统配置加载失败';
  } finally {
    loading.value = false;
  }
}

async function saveConfig() {
  const updates = dirtyUpdateItems();

  if (updates.length === 0) {
    message.info('没有需要保存的配置');
    return;
  }

  saving.value = true;
  validationIssues.value = [];

  try {
    const validation = await validateSystemConfigApi({ items: updates });
    validationIssues.value = validation.issues;

    if (validation.issues.some((issue) => issue.severity === 'error')) {
      message.error('配置校验失败，请修正后再保存');
      return;
    }

    const response = await updateSystemConfigApi({
      configVersion: configVersion.value,
      items: updates,
      maskToken: maskToken.value,
      reloadNow: true,
    });

    message.success(`已保存 ${response.appliedCount} 项配置`);
    await loadConfig();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存配置失败');
  } finally {
    saving.value = false;
  }
}

function resetDraft() {
  syncDraft(items.value);
  validationIssues.value = [];
  message.success('已恢复到上次加载的配置');
}

async function exportConfig() {
  exporting.value = true;

  try {
    const response = await exportSystemConfigApi();
    const blob = new Blob([response.content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dsa-env-${new Date().toISOString().slice(0, 10)}.env`;
    anchor.click();
    URL.revokeObjectURL(url);
    message.success('配置备份已导出');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导出配置失败');
  } finally {
    exporting.value = false;
  }
}

function openImportFile() {
  fileInputRef.value?.click();
}

async function handleImportFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  importing.value = true;

  try {
    const content = await file.text();
    const response = await importSystemConfigApi({
      configVersion: configVersion.value,
      content,
      reloadNow: true,
    });

    message.success(`已导入 ${response.appliedCount} 项配置`);
    await loadConfig();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导入配置失败');
  } finally {
    importing.value = false;
    target.value = '';
  }
}

async function runLlmTest() {
  testingLlm.value = true;
  llmResult.value = null;

  try {
    llmResult.value = await testLlmChannelApi({
      apiKey: llmForm.apiKey,
      baseUrl: llmForm.baseUrl,
      capabilityChecks: llmForm.capabilityChecks,
      models: modelList(),
      name: llmForm.name,
      protocol: llmForm.protocol,
      timeoutSeconds: 20,
    });
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'LLM 通道测试失败');
  } finally {
    testingLlm.value = false;
  }
}

async function discoverModels() {
  discoveringModels.value = true;
  modelDiscoveryResult.value = null;

  try {
    modelDiscoveryResult.value = await discoverLlmChannelModelsApi({
      apiKey: llmForm.apiKey,
      baseUrl: llmForm.baseUrl,
      models: modelList(),
      name: llmForm.name,
      protocol: llmForm.protocol,
      timeoutSeconds: 20,
    });

    if (modelDiscoveryResult.value.models.length > 0) {
      llmForm.models = modelDiscoveryResult.value.models.join(', ');
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '模型发现失败');
  } finally {
    discoveringModels.value = false;
  }
}

async function runNotificationTest() {
  testingNotification.value = true;
  notificationResult.value = null;

  try {
    notificationResult.value = await testNotificationChannelApi({
      channel: notificationForm.channel,
      content: notificationForm.content,
      items: allDraftItems.value,
      maskToken: maskToken.value,
      timeoutSeconds: 20,
      title: notificationForm.title,
    });
  } catch (error) {
    message.error(error instanceof Error ? error.message : '通知测试失败');
  } finally {
    testingNotification.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <Page
    auto-content-height
    description="集中管理后端 .env 配置、通道测试与配置备份。"
    title="系统设置"
  >
    <Alert
      v-if="errorMessage"
      class="mb-4"
      show-icon
      type="error"
      :message="errorMessage"
    />

    <div class="settings-layout">
      <aside class="settings-sidebar">
        <Card size="small" title="配置分类">
          <Space class="category-list" direction="vertical">
            <Button
              v-for="category in categories"
              :key="category.category"
              block
              class="category-button"
              :type="
                activeCategory === category.category ? 'primary' : 'default'
              "
              @click="activeCategory = category.category"
            >
              <span>{{ category.title }}</span>
              <span class="category-meta">
                {{ category.itemCount }}
                <Tag v-if="category.dirtyCount > 0" color="orange">
                  {{ category.dirtyCount }}
                </Tag>
              </span>
            </Button>
          </Space>
        </Card>

        <Card class="mt-4" size="small" title="配置版本">
          <Descriptions :column="1" size="small">
            <Descriptions.Item label="版本">
              {{ configVersion || '-' }}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {{ formatDateTime(updatedAt) }}
            </Descriptions.Item>
            <Descriptions.Item label="未保存">
              <Tag :color="dirtyKeys.length > 0 ? 'orange' : 'green'">
                {{ dirtyKeys.length }}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card class="mt-4" size="small" title="配置备份">
          <Space direction="vertical">
            <Button :loading="exporting" block @click="exportConfig">
              导出 .env
            </Button>
            <Button :loading="importing" block @click="openImportFile">
              导入 .env
            </Button>
            <input
              ref="fileInputRef"
              accept=".env,text/plain"
              class="hidden-file"
              type="file"
              @change="handleImportFile"
            />
          </Space>
        </Card>
      </aside>

      <main class="settings-main">
        <Card>
          <template #title>
            <div class="section-title">
              <span>{{
                categoryMeta[activeCategory]?.title || activeCategory
              }}</span>
              <Tag v-if="visibleDirtyCount > 0" color="orange">
                {{ visibleDirtyCount }} 项已修改
              </Tag>
            </div>
          </template>
          <template #extra>
            <Space>
              <Button @click="loadConfig">刷新</Button>
              <Button :disabled="dirtyKeys.length === 0" @click="resetDraft">
                重置
              </Button>
              <Button
                :disabled="dirtyKeys.length === 0"
                :loading="saving"
                type="primary"
                @click="saveConfig"
              >
                保存
              </Button>
            </Space>
          </template>

          <p class="section-description">{{ activeDescription }}</p>

          <Spin :spinning="loading">
            <Empty v-if="activeItems.length === 0" description="暂无配置项" />
            <div v-else class="field-list">
              <div
                v-for="item in activeItems"
                :key="item.key"
                class="field-row"
                :class="{ dirty: dirtyKeySet.has(item.key) }"
              >
                <div class="field-label">
                  <div>
                    <span class="field-title">{{ fieldTitle(item) }}</span>
                    <Tag v-if="item.schema?.isRequired" color="red">必填</Tag>
                    <Tag v-if="item.schema?.isSensitive" color="blue">敏感</Tag>
                    <Tag v-if="dirtyKeySet.has(item.key)" color="orange">
                      已修改
                    </Tag>
                  </div>
                  <p>{{ fieldDescription(item) }}</p>
                  <code>{{ item.key }}</code>
                </div>

                <div class="field-control">
                  <Switch
                    v-if="item.schema?.uiControl === 'switch'"
                    :checked="isBooleanTrue(draftValues[item.key])"
                    :disabled="item.schema?.isEditable === false"
                    @change="
                      (checked) => setBooleanValue(item.key, Boolean(checked))
                    "
                  />
                  <Select
                    v-else-if="item.schema?.uiControl === 'select'"
                    class="full-control"
                    :disabled="item.schema?.isEditable === false"
                    :options="optionItems(item)"
                    :placeholder="fieldPlaceholder(item)"
                    :value="draftValues[item.key]"
                    @change="(value) => setDraftValue(item.key, String(value))"
                  />
                  <Textarea
                    v-else-if="item.schema?.uiControl === 'textarea'"
                    v-model:value="draftValues[item.key]"
                    :disabled="item.schema?.isEditable === false"
                    :placeholder="fieldPlaceholder(item)"
                    :rows="4"
                  />
                  <Input
                    v-else
                    v-model:value="draftValues[item.key]"
                    :disabled="item.schema?.isEditable === false"
                    :placeholder="fieldPlaceholder(item)"
                    :type="
                      item.schema?.uiControl === 'password'
                        ? 'password'
                        : item.schema?.uiControl === 'number'
                          ? 'number'
                          : item.schema?.uiControl === 'time'
                            ? 'time'
                            : 'text'
                    "
                  />

                  <div
                    v-if="issuesByKey.get(item.key)?.length"
                    class="field-issues"
                  >
                    <Alert
                      v-for="issue in issuesByKey.get(item.key)"
                      :key="`${issue.key}-${issue.code}-${issue.message}`"
                      show-icon
                      :type="issue.severity === 'error' ? 'error' : 'warning'"
                      :message="issue.message"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Spin>
        </Card>

        <div class="tools-grid">
          <Card title="LLM 通道测试">
            <Form layout="vertical">
              <div class="tool-form-grid">
                <FormItem label="名称">
                  <Input v-model:value="llmForm.name" />
                </FormItem>
                <FormItem label="协议">
                  <Select
                    v-model:value="llmForm.protocol"
                    :options="[
                      { label: 'OpenAI Compatible', value: 'openai' },
                      { label: 'Anthropic', value: 'anthropic' },
                    ]"
                  />
                </FormItem>
                <FormItem label="Base URL">
                  <Input v-model:value="llmForm.baseUrl" />
                </FormItem>
                <FormItem label="API Key">
                  <Input v-model:value="llmForm.apiKey" type="password" />
                </FormItem>
                <FormItem label="模型列表">
                  <Input
                    v-model:value="llmForm.models"
                    placeholder="多个模型用英文逗号分隔"
                  />
                </FormItem>
                <FormItem label="能力检查">
                  <Select
                    v-model:value="llmForm.capabilityChecks"
                    mode="multiple"
                    :options="capabilityOptions"
                  />
                </FormItem>
              </div>
              <Space>
                <Button
                  :loading="testingLlm"
                  type="primary"
                  @click="runLlmTest"
                >
                  测试通道
                </Button>
                <Button :loading="discoveringModels" @click="discoverModels">
                  发现模型
                </Button>
              </Space>
            </Form>

            <Alert
              v-if="llmResult"
              class="mt-4"
              show-icon
              :type="statusTone(llmResult.success)"
              :message="llmResult.message"
              :description="
                llmResult.resolvedModel || llmResult.error || undefined
              "
            />
            <Alert
              v-if="modelDiscoveryResult"
              class="mt-4"
              show-icon
              :type="statusTone(modelDiscoveryResult.success)"
              :message="modelDiscoveryResult.message"
              :description="
                modelDiscoveryResult.models.join(', ') ||
                modelDiscoveryResult.error ||
                undefined
              "
            />
          </Card>

          <Card title="通知渠道测试">
            <Form layout="vertical">
              <FormItem label="渠道">
                <Select
                  v-model:value="notificationForm.channel"
                  :options="notificationChannelOptions"
                />
              </FormItem>
              <FormItem label="标题">
                <Input v-model:value="notificationForm.title" />
              </FormItem>
              <FormItem label="内容">
                <Textarea v-model:value="notificationForm.content" :rows="4" />
              </FormItem>
              <Button
                :loading="testingNotification"
                type="primary"
                @click="runNotificationTest"
              >
                发送测试
              </Button>
            </Form>

            <Alert
              v-if="notificationResult"
              class="mt-4"
              show-icon
              :type="statusTone(notificationResult.success)"
              :message="notificationResult.message"
            />
            <div
              v-if="notificationResult?.attempts.length"
              class="attempt-list"
            >
              <Tag
                v-for="attempt in notificationResult.attempts"
                :key="`${attempt.channel}-${attempt.stage}-${attempt.message}`"
                :color="attempt.success ? 'green' : 'red'"
              >
                {{ attempt.channel }} · {{ attempt.message }}
              </Tag>
            </div>
          </Card>
        </div>
      </main>
    </div>
  </Page>
</template>

<style scoped>
.settings-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}

.settings-sidebar {
  min-width: 0;
}

.settings-main {
  min-width: 0;
}

.category-list {
  width: 100%;
}

.category-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
}

.category-meta {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.hidden-file {
  display: none;
}

.section-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.section-description {
  margin-bottom: 16px;
  color: hsl(var(--muted-foreground));
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(220px, 34%) minmax(0, 1fr);
  gap: 18px;
  padding: 16px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.field-row.dirty {
  border-color: #faad14;
}

.field-label {
  min-width: 0;
}

.field-label p {
  margin: 6px 0 8px;
  color: hsl(var(--muted-foreground));
}

.field-label code {
  color: hsl(var(--muted-foreground));
  word-break: break-all;
}

.field-title {
  margin-right: 8px;
  font-weight: 600;
}

.field-control {
  min-width: 0;
}

.full-control {
  width: 100%;
}

.field-issues {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.tools-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.tool-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.attempt-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 1100px) {
  .settings-layout,
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
