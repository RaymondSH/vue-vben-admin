import { describe, expect, it } from 'vitest';

import { parseDsaApiError } from '../errors';

describe('parseDsaApiError', () => {
  it('maps known business errors to friendly messages', () => {
    expect(
      parseDsaApiError({
        response: {
          data: {
            result: {
              error: 'portfolio_oversell',
              message: 'raw oversell',
            },
          },
        },
      }),
    ).toContain('卖出数量超过');
  });

  it('falls back to backend message and HTTP status', () => {
    expect(
      parseDsaApiError({
        response: { data: { result: { message: 'backend message' } } },
      }),
    ).toBe('backend message');

    expect(parseDsaApiError({ response: { status: 503 } })).toBe(
      '请求失败：HTTP 503',
    );
  });
});
