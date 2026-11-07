/**
 * 全局配置相关的 HTTP 请求。
 *
 * 字段名即 `global_config.yml` 的键（snake_case），不在这里做类型收敛；
 * 校验与默认值在 `useGlobalConfig` 里完成。
 */
import { apiGet, apiPut } from './request';

export interface GlobalConfigPayload {
  config: Record<string, unknown>;
}

/** 读取全局配置 */
export function fetchGlobalConfig(): Promise<GlobalConfigPayload> {
  return apiGet<GlobalConfigPayload>('/api/config');
}

/** 写入全局配置补丁（只提交变更项也可以） */
export function saveGlobalConfig(patch: Record<string, unknown>): Promise<GlobalConfigPayload> {
  return apiPut<GlobalConfigPayload>('/api/config', patch);
}
