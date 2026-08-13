export function loginErrorMessage(status: number): string {
  if (status === 429) {
    return "尝试次数过多，请稍后再试。";
  }

  if (status >= 500) {
    return "系统暂时无法完成登录，请稍后重试；当前操作未创建会话。";
  }

  return "邮箱或密码不正确，请重试。";
}
