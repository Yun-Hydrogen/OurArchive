/**
 * 响应式类型工具。
 */
import { readonly, type Ref } from 'vue';

/**
 * 以只读形式暴露一个 ref。
 *
 * 与直接 `readonly(ref)` 的区别：**不把内部数据深冻结**。
 * `readonly()` 会把 `Ref<T[]>` 变成 `DeepReadonly<Ref<readonly T[]>>`，
 * 元素的每个字段都变成 `readonly`，于是 `pkg.contents.find((c) => ...)` 这类
 * 传参全部类型不兼容；而我们要表达的只是「调用方不能写 `.value`」。
 *
 * 运行时仍然是 Vue 的只读代理（写入会告警），类型上是 `Readonly<Ref<T>>`。
 */
export function readonlyRef<T>(source: Ref<T>): Readonly<Ref<T>> {
  return readonly(source) as unknown as Readonly<Ref<T>>;
}
