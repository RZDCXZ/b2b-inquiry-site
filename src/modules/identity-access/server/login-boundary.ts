import { z } from "zod";

const loginSearchParamsSchema = z.object({
  loggedOut: z.preprocess(
    (value) => (value === "1" ? value : undefined),
    z.literal("1").optional(),
  ),
  next: z.preprocess(
    (value) => (typeof value === "string" ? value : undefined),
    z.string().optional(),
  ),
  reason: z.preprocess(
    (value) => (value === "expired" ? value : undefined),
    z.literal("expired").optional(),
  ),
});

export type LoginSearchParams = {
  loggedOut: "1" | undefined;
  nextPath: string;
  reason: "expired" | undefined;
};

export function safeAdminNextPath(value: string | undefined): string {
  if (
    value &&
    value.startsWith("/admin") &&
    !value.startsWith("//") &&
    !value.startsWith("/admin/login")
  ) {
    return value;
  }

  return "/admin";
}

export function parseLoginSearchParams(input: unknown): LoginSearchParams {
  const parsed = loginSearchParamsSchema.parse(input);

  return {
    loggedOut: parsed.loggedOut,
    nextPath: safeAdminNextPath(parsed.next),
    reason: parsed.reason,
  };
}

function hasSessionCookie(requestHeaders: Headers): boolean {
  return (requestHeaders.get("cookie") ?? "")
    .split(";")
    .map((cookie) => cookie.trim().split("=", 1)[0])
    .includes("torquelis.session_token");
}

export function sessionAwareLoginPath(
  requestHeaders: Headers,
  nextPath: string,
): string {
  const query = new URLSearchParams({ next: safeAdminNextPath(nextPath) });

  if (hasSessionCookie(requestHeaders)) {
    query.set("reason", "expired");
  }

  return `/admin/login?${query.toString()}`;
}
