import { listOperationsAuditLogPage } from "@/src/application/operations-audit";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { parseAuditLogFilters } from "@/src/modules/identity-access/server/audit-query";
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

  const parsed = parseAuditLogFilters(new URL(request.url).searchParams);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_FILTERS",
          message: "审计筛选条件无效。",
        },
      },
      { status: 400 },
    );
  }

  const page = await listOperationsAuditLogPage({
    cursor: parsed.cursor,
    filters: parsed.filters,
    take: 50,
  });

  return Response.json(page);
}
