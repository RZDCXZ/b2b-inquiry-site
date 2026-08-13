"use client";

import { ArrowRight, Warning } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

import { loginErrorMessage } from "@/src/components/admin/login-error-message";

type FieldErrors = {
  email?: string;
  password?: string;
};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const errorSummary = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const fieldErrors: FieldErrors = {};

    if (!email || !email.includes("@")) {
      fieldErrors.email = "请输入有效邮箱。";
    }
    if (!password) {
      fieldErrors.password = "请输入密码。";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setMessage("请检查标记的字段后重试。");
      requestAnimationFrame(() => errorSummary.current?.focus());
      return;
    }

    setErrors({});
    setMessage("");
    setPending(true);

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        body: JSON.stringify({ email, password, rememberMe: true }),
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setMessage(loginErrorMessage(response.status));
        requestAnimationFrame(() => errorSummary.current?.focus());
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setMessage("登录暂时不可用，请稍后重试。");
      requestAnimationFrame(() => errorSummary.current?.focus());
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-login-form" noValidate onSubmit={submit}>
      {message ? (
        <div
          aria-live="assertive"
          className="admin-form-error"
          ref={errorSummary}
          role="alert"
          tabIndex={-1}
        >
          <Warning aria-hidden="true" size={19} weight="fill" />
          <span>{message}</span>
        </div>
      ) : null}
      <label className={errors.email ? "has-error" : undefined}>
        <span>邮箱</span>
        <input
          aria-describedby={errors.email ? "login-email-error" : undefined}
          autoComplete="username"
          name="email"
          type="email"
        />
        {errors.email ? (
          <small id="login-email-error">{errors.email}</small>
        ) : null}
      </label>
      <label className={errors.password ? "has-error" : undefined}>
        <span>密码</span>
        <input
          aria-describedby={
            errors.password ? "login-password-error" : undefined
          }
          autoComplete="current-password"
          name="password"
          type="password"
        />
        {errors.password ? (
          <small id="login-password-error">{errors.password}</small>
        ) : null}
      </label>
      <button className="admin-primary-button" disabled={pending} type="submit">
        <span>{pending ? "正在登录…" : "登录"}</span>
        <ArrowRight aria-hidden="true" size={19} weight="bold" />
      </button>
    </form>
  );
}
