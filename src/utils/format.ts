/**
 * 展示格式化：体积 / 播放时长 / 日期 / 计数。
 *
 * 视图里若要新增一类格式化，优先加到这里，不要就地写在组件的 `<script setup>` 中。
 */

/** 字节数 → `1.2 MB` */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** 秒 → `m:ss`（负数 / 非数字回「0:00」） */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

/** 秒 → `m:ss.d`（含一位小数，音效等短音频显示用） */
export function formatDurationDecimal(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00.0';
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const whole = Math.floor(secs);
  const tenth = Math.floor((secs - whole) * 10);
  return `${minutes}:${String(whole).padStart(2, '0')}.${tenth}`;
}

/** 秒 → `1:12:03`（小时为 0 时不显示小时，只有 m:ss） */
export function formatDurationLong(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return hh > 0 ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}

/** ISO 时间 → `YYYY-MM-DD HH:mm`（非法输入返回「未知」） */
export function formatDateTime(iso: string): string {
  if (!iso) {
    return '未知';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '未知';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** ISO 时间 → `YYYY-MM-DD`（非法输入返回空串） */
export function formatDate(iso: string): string {
  if (!iso) {
    return '';
  }
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) {
    return '';
  }
  return new Date(time).toISOString().slice(0, 10);
}

/** 计数 → 千分位分隔（0 返回空串，方便「没有就别画」） */
export function formatCount(count: number): string {
  if (!count) {
    return '';
  }
  return count.toLocaleString('zh-CN');
}
