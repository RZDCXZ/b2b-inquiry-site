export function formatAdminTime(value: Date): string {
  return value.toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  });
}

export function formatAdminDate(value: Date): string {
  return value.toLocaleDateString("zh-CN", {
    dateStyle: "medium",
    timeZone: "Asia/Shanghai",
  });
}
