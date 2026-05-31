const BUSINESS_ERROR_MESSAGES: Record<string, string> = {
  config_version_conflict: '配置已被其他操作更新，请刷新后重试。',
  conflict: '数据已变化，请刷新后重试。',
  portfolio_busy: '持仓正在重算，请稍后再试。',
  portfolio_oversell: '卖出数量超过当前可用持仓，请检查代码、账户和数量。',
  validation_error: '提交内容校验失败，请检查输入项。',
};

function pickString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function parseDsaApiError(error: unknown, fallback = '操作失败') {
  if (error instanceof Error && error.message) {
    return BUSINESS_ERROR_MESSAGES[error.message] || error.message;
  }

  if (!error || typeof error !== 'object') return fallback;

  const payload = error as {
    message?: unknown;
    response?: {
      data?: {
        message?: unknown;
        result?: { error?: unknown; message?: unknown };
      };
      status?: number;
    };
  };
  const result = payload.response?.data?.result;
  const code = pickString(result?.error);
  const friendly = code ? BUSINESS_ERROR_MESSAGES[code] : '';

  return (
    friendly ||
    pickString(result?.message) ||
    pickString(payload.response?.data?.message) ||
    pickString(payload.message) ||
    (payload.response?.status
      ? `请求失败：HTTP ${payload.response.status}`
      : fallback)
  );
}
