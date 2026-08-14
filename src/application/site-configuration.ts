import { z } from "zod";

import type { AppRole, Prisma } from "@/src/generated/prisma/client";
import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import type { AdminActor } from "@/src/modules/identity-access/public/actor";
import {
  hasPermission,
  PERMISSIONS,
} from "@/src/modules/identity-access/public/permissions";

const socialLinksSchema = z
  .record(
    z.string().trim().min(1).max(40),
    z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), {
        message: "社交链接必须使用 https。",
      }),
  )
  .refine((value) => Object.keys(value).length <= 8, {
    message: "社交链接不能超过 8 项。",
  });

const settingsInputSchema = z.object({
  addressEn: z.string().trim().min(1).max(500),
  addressZhCn: z.string().trim().min(1).max(500),
  companyNameEn: z.string().trim().min(1).max(200),
  companyNameZhCn: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().email().max(320),
  contactPhone: z.string().trim().min(1).max(80),
  defaultSeoDescriptionEn: z.string().trim().min(1).max(500),
  defaultSeoDescriptionZhCn: z.string().trim().min(1).max(500),
  defaultSeoTitleEn: z.string().trim().min(1).max(200),
  defaultSeoTitleZhCn: z.string().trim().min(1).max(200),
  notificationRecipientRoles: z
    .array(z.enum(["administrator", "content_editor", "sales"]))
    .min(1)
    .max(3)
    .transform((roles) => [...new Set(roles)]),
  socialLinks: socialLinksSchema,
});

export type SiteConfigurationInput = Omit<
  z.input<typeof settingsInputSchema>,
  "notificationRecipientRoles"
> & {
  notificationRecipientRoles: ReadonlyArray<AppRole>;
};

export type SiteConfigurationErrorCode =
  "CONFLICT" | "FORBIDDEN" | "INVALID_SETTINGS" | "NOT_FOUND";

export class SiteConfigurationError extends Error {
  constructor(
    public readonly code: SiteConfigurationErrorCode,
    public readonly fieldErrors: Array<{ field: string; message: string }> = [],
    public readonly conflict?: {
      latestModifiedAt: Date;
      latestModifiedBy: string;
      latestVersion: number;
    },
  ) {
    super(code);
    this.name = "SiteConfigurationError";
  }
}

function database(prisma?: ApplicationDatabase): ApplicationDatabase {
  return prisma ?? getApplicationPrisma();
}

function parseSocialLinks(value: Prisma.JsonValue): Record<string, string> {
  const parsed = socialLinksSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function toView(record: {
  addressEn: string;
  addressZhCn: string;
  companyNameEn: string;
  companyNameZhCn: string;
  contactEmail: string;
  contactPhone: string;
  defaultSeoDescriptionEn: string;
  defaultSeoDescriptionZhCn: string;
  defaultSeoTitleEn: string;
  defaultSeoTitleZhCn: string;
  lastModifiedBy: { name: string } | null;
  notificationRecipientRoles: AppRole[];
  socialLinks: Prisma.JsonValue;
  updatedAt: Date;
  version: number;
}) {
  return {
    addressEn: record.addressEn,
    addressZhCn: record.addressZhCn,
    companyNameEn: record.companyNameEn,
    companyNameZhCn: record.companyNameZhCn,
    contactEmail: record.contactEmail,
    contactPhone: record.contactPhone,
    defaultSeoDescriptionEn: record.defaultSeoDescriptionEn,
    defaultSeoDescriptionZhCn: record.defaultSeoDescriptionZhCn,
    defaultSeoTitleEn: record.defaultSeoTitleEn,
    defaultSeoTitleZhCn: record.defaultSeoTitleZhCn,
    lastModifiedAt: record.updatedAt,
    lastModifiedBy: record.lastModifiedBy?.name ?? "系统",
    notificationRecipientRoles: record.notificationRecipientRoles,
    socialLinks: parseSocialLinks(record.socialLinks),
    version: record.version,
  };
}

const settingsInclude = {
  lastModifiedBy: { select: { name: true } },
} as const;

export async function getEditableSiteConfiguration({
  actor,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  prisma?: ApplicationDatabase;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.SETTINGS_MANAGE)) {
    throw new SiteConfigurationError("FORBIDDEN");
  }
  const record = await database(providedPrisma).siteConfiguration.findUnique({
    include: settingsInclude,
    where: { key: "primary" },
  });
  if (!record) throw new SiteConfigurationError("NOT_FOUND");
  return toView(record);
}

export async function getPublicSiteConfiguration({
  prisma: providedPrisma,
}: { prisma?: ApplicationDatabase } = {}) {
  const record = await database(providedPrisma).siteConfiguration.findUnique({
    include: settingsInclude,
    where: { key: "primary" },
  });
  if (!record) throw new SiteConfigurationError("NOT_FOUND");
  return toView(record);
}

export async function saveSiteConfiguration({
  actor,
  expectedVersion,
  input,
  prisma: providedPrisma,
}: {
  actor: AdminActor;
  expectedVersion: number;
  input: SiteConfigurationInput;
  prisma?: ApplicationDatabase;
}) {
  if (!hasPermission(actor.role, PERMISSIONS.SETTINGS_MANAGE)) {
    throw new SiteConfigurationError("FORBIDDEN");
  }
  const parsed = settingsInputSchema.safeParse({
    ...input,
    notificationRecipientRoles: [...input.notificationRecipientRoles],
  });
  if (!parsed.success) {
    throw new SiteConfigurationError(
      "INVALID_SETTINGS",
      parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const prisma = database(providedPrisma);
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.siteConfiguration.findUnique({
      include: settingsInclude,
      where: { key: "primary" },
    });
    if (!existing) throw new SiteConfigurationError("NOT_FOUND");
    if (existing.version !== expectedVersion) {
      throw new SiteConfigurationError("CONFLICT", [], {
        latestModifiedAt: existing.updatedAt,
        latestModifiedBy: existing.lastModifiedBy?.name ?? "系统",
        latestVersion: existing.version,
      });
    }
    const updated = await transaction.siteConfiguration.updateMany({
      data: {
        ...parsed.data,
        lastModifiedByUserId: actor.id,
        socialLinks: parsed.data.socialLinks,
        version: { increment: 1 },
      },
      where: { key: "primary", version: expectedVersion },
    });
    if (updated.count !== 1) {
      const latest = await transaction.siteConfiguration.findUnique({
        include: settingsInclude,
        where: { key: "primary" },
      });
      throw new SiteConfigurationError(
        "CONFLICT",
        [],
        latest
          ? {
              latestModifiedAt: latest.updatedAt,
              latestModifiedBy: latest.lastModifiedBy?.name ?? "系统",
              latestVersion: latest.version,
            }
          : undefined,
      );
    }
    await transaction.auditLog.create({
      data: {
        actorRole: actor.role,
        actorUserId: actor.id,
        event: "SITE_CONFIGURATION_UPDATED",
        outcome: "SUCCESS",
        summary: "更新企业公开资料、默认 SEO 或模拟通知收件角色。",
        targetId: "primary",
        targetType: "SITE_CONFIGURATION",
      },
    });
    const saved = await transaction.siteConfiguration.findUniqueOrThrow({
      include: settingsInclude,
      where: { key: "primary" },
    });
    return toView(saved);
  });
}
