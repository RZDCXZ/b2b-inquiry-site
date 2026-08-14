"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  saveSiteConfiguration,
  SiteConfigurationError,
} from "@/src/application/site-configuration";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

export type SettingsMutationState = {
  conflict?: {
    latestModifiedAt: string;
    latestModifiedBy: string;
    latestVersion: number;
  };
  fieldErrors?: Record<string, string>;
  message: string;
  status: "error" | "idle" | "success";
  version?: number;
};

const schema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
});

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseSocialLinks(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("|");
        if (separator < 1)
          throw new SiteConfigurationError("INVALID_SETTINGS", [
            {
              field: "socialLinks",
              message: "每行使用“名称 | https://地址”。",
            },
          ]);
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim(),
        ];
      }),
  );
}

export async function saveSiteConfigurationAction(
  _previousState: SettingsMutationState,
  formData: FormData,
): Promise<SettingsMutationState> {
  const parsed = schema.safeParse({
    expectedVersion: formData.get("expectedVersion"),
  });
  if (!parsed.success) return { message: "保存请求无效。", status: "error" };
  try {
    const authorization = await authorizeAdminPage(
      PERMISSIONS.SETTINGS_MANAGE,
      "/admin/settings",
    );
    if (!authorization.allowed) throw new SiteConfigurationError("FORBIDDEN");
    const roles = ["administrator", "content_editor", "sales"].filter((role) =>
      formData.getAll("notificationRecipientRoles").includes(role),
    ) as Array<"administrator" | "content_editor" | "sales">;
    const saved = await saveSiteConfiguration({
      actor: authorization.actor,
      expectedVersion: parsed.data.expectedVersion,
      input: {
        addressEn: text(formData, "addressEn"),
        addressZhCn: text(formData, "addressZhCn"),
        companyNameEn: text(formData, "companyNameEn"),
        companyNameZhCn: text(formData, "companyNameZhCn"),
        contactEmail: text(formData, "contactEmail"),
        contactPhone: text(formData, "contactPhone"),
        defaultSeoDescriptionEn: text(formData, "defaultSeoDescriptionEn"),
        defaultSeoDescriptionZhCn: text(formData, "defaultSeoDescriptionZhCn"),
        defaultSeoTitleEn: text(formData, "defaultSeoTitleEn"),
        defaultSeoTitleZhCn: text(formData, "defaultSeoTitleZhCn"),
        notificationRecipientRoles: roles,
        socialLinks: parseSocialLinks(text(formData, "socialLinks")),
      },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/en", "layout");
    revalidatePath("/zh-cn", "layout");
    return {
      message: "站点配置已保存并应用到公开企业信息。",
      status: "success",
      version: saved.version,
    };
  } catch (error) {
    if (!(error instanceof SiteConfigurationError))
      return { message: "保存未完成，请重试。", status: "error" };
    return {
      conflict: error.conflict
        ? {
            latestModifiedAt: error.conflict.latestModifiedAt.toISOString(),
            latestModifiedBy: error.conflict.latestModifiedBy,
            latestVersion: error.conflict.latestVersion,
          }
        : undefined,
      fieldErrors: Object.fromEntries(
        error.fieldErrors.map(({ field, message }) => [field, message]),
      ),
      message:
        error.code === "CONFLICT"
          ? "配置已由其他窗口更新，本次保存未覆盖较新内容。"
          : error.code === "FORBIDDEN"
            ? "只有管理员可以维护站点配置。"
            : "配置未通过服务端校验。",
      status: "error",
    };
  }
}
