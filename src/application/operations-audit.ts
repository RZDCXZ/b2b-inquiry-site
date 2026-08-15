import type { ApplicationDatabase } from "@/src/infrastructure/database/prisma";
import { resolveCatalogAuditTargetLabels } from "@/src/modules/catalog/public/operations-audit";
import { resolveArticleAuditTargetLabels } from "@/src/modules/content-publishing/public/operations-audit";
import { CORE_PAGE_DEFINITIONS } from "@/src/modules/content-publishing/public/core-page-contracts";
import { resolveInquiryAuditTargetLabels } from "@/src/modules/inquiry-operations/public/operations-audit";
import {
  type AuditLogView,
  listAuditLogPage,
  type ListAuditLogPageInput,
} from "@/src/modules/identity-access/server/audit-query";

export type OperationsAuditLogView = Omit<AuditLogView, "targetId">;

export type OperationsAuditLogPage = {
  nextCursor: string | null;
  records: OperationsAuditLogView[];
};

function targetIds(
  records: readonly AuditLogView[],
  targetTypes: readonly string[],
): string[] {
  return records.flatMap((record) =>
    record.targetId &&
    record.targetType &&
    targetTypes.includes(record.targetType)
      ? [record.targetId]
      : [],
  );
}

function corePageLabel(targetId: string): string | undefined {
  return Object.hasOwn(CORE_PAGE_DEFINITIONS, targetId)
    ? CORE_PAGE_DEFINITIONS[targetId as keyof typeof CORE_PAGE_DEFINITIONS]
        .label
    : undefined;
}

export async function listOperationsAuditLogPage(
  input: ListAuditLogPageInput = {},
): Promise<OperationsAuditLogPage> {
  const page = await listAuditLogPage(input);
  const prisma = input.prisma as ApplicationDatabase | undefined;
  const [catalogLabels, inquiryLabels, articleLabels] = await Promise.all([
    resolveCatalogAuditTargetLabels({
      importBatchTargetIds: targetIds(page.records, ["ProductImportBatch"]),
      prisma,
      productTargetIds: targetIds(page.records, ["PRODUCT"]),
    }),
    resolveInquiryAuditTargetLabels({
      prisma,
      targetIds: targetIds(page.records, ["INQUIRY", "QUARANTINED_INQUIRY"]),
    }),
    resolveArticleAuditTargetLabels({
      prisma,
      targetIds: targetIds(page.records, ["ARTICLE"]),
    }),
  ]);

  return {
    nextCursor: page.nextCursor,
    records: page.records.map(({ targetId, ...record }) => {
      let identity: string | undefined;
      if (targetId) {
        if (record.targetType === "PRODUCT") {
          identity = catalogLabels.products.get(targetId);
        } else if (record.targetType === "ProductImportBatch") {
          identity = catalogLabels.importBatches.get(targetId);
        } else if (
          record.targetType === "INQUIRY" ||
          record.targetType === "QUARANTINED_INQUIRY"
        ) {
          identity = inquiryLabels.get(targetId);
        } else if (record.targetType === "ARTICLE") {
          identity = articleLabels.get(targetId);
        } else if (record.targetType === "CORE_PAGE") {
          identity = corePageLabel(targetId);
        }
      }

      return {
        ...record,
        target: identity ? `${record.target} · ${identity}` : record.target,
      };
    }),
  };
}
