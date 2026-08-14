export function formatAdminTime(value: Date): string {
  return value.toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  });
}
