import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { listRecentAuditLogs } from "@/src/modules/identity-access/server/audit-query";
import { authorizeRequest } from "@/src/modules/identity-access/server/authorization";

export async function GET(request: Request): Promise<Response> {
  const { decision } = await authorizeRequest(
    request.headers,
    PERMISSIONS.AUDIT_VIEW,
  );

  if (!decision.allowed) {
    return Response.json(
      {
        error: {
          code: decision.code,
          message: decision.message,
        },
      },
      { status: decision.status },
    );
  }

  const records = await listRecentAuditLogs(50);

  return Response.json({ records });
}
