/** 安全整数解析 */
export function safeInt(value: unknown, fallback: number): number {
  const num = parseInt(String(value), 10);
  return isNaN(num) ? fallback : num;
}
