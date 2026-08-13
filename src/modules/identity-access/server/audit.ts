import { z } from "zod";

import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";
import {
  APP_ROLES,
  type AppRole,
} from "@/src/modules/identity-access/public/permissions";

const successfulLoginResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    role: z.enum([
      APP_ROLES.ADMINISTRATOR,
      APP_ROLES.CONTENT_EDITOR,
      APP_ROLES.SALES,
    ]),
  }),
});

type LoginAudit =
  | { outcome: "FAILURE" }
  | { actorRole: AppRole; actorUserId: string; outcome: "SUCCESS" };

export async function recordLoginAudit(audit: LoginAudit): Promise<void> {
  await getApplicationPrisma().auditLog.create({
    data: {
      actorRole: audit.outcome === "SUCCESS" ? audit.actorRole : null,
      actorUserId: audit.outcome === "SUCCESS" ? audit.actorUserId : null,
      event: "LOGIN",
      outcome: audit.outcome,
    },
  });
}

export async function auditLoginResponse(response: Response): Promise<void> {
  if (!response.ok) {
    await recordLoginAudit({ outcome: "FAILURE" });
    return;
  }

  const responseData: unknown = await response.clone().json();
  const login = successfulLoginResponseSchema.parse(responseData);
  await recordLoginAudit({
    actorRole: login.user.role,
    actorUserId: login.user.id,
    outcome: "SUCCESS",
  });
}
