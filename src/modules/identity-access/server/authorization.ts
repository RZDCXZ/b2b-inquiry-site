import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAuthorizationDecision,
  isAppRole,
  type AuthorizationDecision,
  type Permission,
} from "@/src/modules/identity-access/public/permissions";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import { auth } from "@/src/modules/identity-access/server/auth";
import { sessionAwareLoginPath } from "@/src/modules/identity-access/server/login-boundary";

export type { AdminActor } from "@/src/modules/identity-access/public/actor";

export async function getCurrentActor(
  requestHeaders?: Headers,
): Promise<AdminActor | null> {
  const session = await auth.api.getSession({
    headers: requestHeaders ?? (await headers()),
  });

  if (!session || !isAppRole(session.user.role)) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function authorizeRequest(
  requestHeaders: Headers,
  permission: Permission,
): Promise<{ actor: AdminActor | null; decision: AuthorizationDecision }> {
  const actor = await getCurrentActor(requestHeaders);
  return {
    actor,
    decision: getAuthorizationDecision(actor?.role ?? null, permission),
  };
}

export async function authorizeAdminPage(
  permission: Permission,
  nextPath: string,
): Promise<{ actor: AdminActor; allowed: boolean }> {
  const requestHeaders = await headers();
  const actor = await getCurrentActor(requestHeaders);

  if (!actor) {
    redirect(sessionAwareLoginPath(requestHeaders, nextPath));
  }

  return {
    actor,
    allowed: getAuthorizationDecision(actor.role, permission).allowed,
  };
}
