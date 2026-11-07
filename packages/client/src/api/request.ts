/**
 * API 客户端封装：所有前端 JSON 请求都走这里，统一校验 `success` 标志。
 *
 * 约定：
 *   - 成功体：`{ success: true, ...payload }`，本模块返回 payload 本身；
 *   - 失败体：`{ success: false, error }`，抛 Error 并带上 `status`；
 *   - 非 JSON 响应直接按 HTTP 状态抛错；
 *   - 文件流（图片 / 音频）不走这里，用 `<img>` / `<audio>` 或 `fetch().blob()`。
 */

/** 请求失败错误：`status` 为 HTTP 状态码，0 表示没拿到响应 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** 请求失败时用于展示的文案 */
export function apiErrorMessage(error: unknown, fallback = '请求失败'): string {
  return error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : fallback;
}

interface ApiEnvelope {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

async function request(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => null)) as ApiEnvelope | null;

  if (!res.ok) {
    throw new ApiError(data?.error ?? `HTTP ${res.status}`, res.status);
  }
  if (!data || typeof data !== 'object' || !('success' in data)) {
    throw new ApiError(`非法响应：${url}`, res.status);
  }
  if (!data.success) {
    throw new ApiError(data.error ?? `请求失败：${url}`, res.status);
  }

  // 校验只负责判定成败；字段由调用方的类型约定
  return data as unknown as Record<string, unknown>;
}

/** GET 并返回 JSON 体 */
export function apiGet<T>(url: string): Promise<T> {
  return request(url, { method: 'GET' }) as Promise<T>;
}

/** PUT 并返回 JSON 体 */
export function apiPut<T>(url: string, body: unknown): Promise<T> {
  return request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Promise<T>;
}
