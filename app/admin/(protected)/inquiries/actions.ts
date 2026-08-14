"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  assignInquiry,
  InquiryAssignmentError,
} from "@/src/application/admin-inquiries";
import { PERMISSIONS } from "@/src/modules/identity-access/public/permissions";
import { authorizeAdminPage } from "@/src/modules/identity-access/server/authorization";

const assignmentFormSchema = z.object({
  expectedVersion: z.coerce.number().int().positive(),
  newOwnerId: z.string().min(1).max(200),
  reason: z.string().trim().min(2).max(500),
  referenceNumber: z.string().min(1).max(80),
});

export type InquiryAssignmentActionState = {
  conflict?: {
    latestModifiedAt: string;
    latestModifiedBy: string;
    latestVersion: number;
  };
  message: string;
  status: "error" | "idle" | "success";
};

export async function assignInquiryAction(
  _previousState: InquiryAssignmentActionState,
  formData: FormData,
): Promise<InquiryAssignmentActionState> {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.INQUIRIES_ASSIGN,
    "/admin/inquiries",
  );

  if (!allowed) {
    return {
      message: "只有管理员可以分配当前负责人。",
      status: "error",
    };
  }

  const parsed = assignmentFormSchema.safeParse({
    expectedVersion: formData.get("expectedVersion"),
    newOwnerId: formData.get("newOwnerId"),
    reason: formData.get("reason"),
    referenceNumber: formData.get("referenceNumber"),
  });

  if (!parsed.success) {
    return {
      message: "请选择业务人员，并填写 2–500 字的分配原因。",
      status: "error",
    };
  }

  try {
    const result = await assignInquiry({ actor, ...parsed.data });
    const detailPath = `/admin/inquiries/${encodeURIComponent(parsed.data.referenceNumber)}`;
    revalidatePath("/admin");
    revalidatePath("/admin/inquiries");
    revalidatePath(detailPath);

    return {
      message: `已将当前负责人更新为${result.currentOwner.name}。`,
      status: "success",
    };
  } catch (error) {
    if (!(error instanceof InquiryAssignmentError)) {
      return {
        message: "分配暂时无法完成，请稍后重试。",
        status: "error",
      };
    }

    if (error.code === "CONFLICT" && error.conflict) {
      return {
        conflict: {
          latestModifiedAt: error.conflict.latestModifiedAt.toISOString(),
          latestModifiedBy: error.conflict.latestModifiedBy,
          latestVersion: error.conflict.latestVersion,
        },
        message: "这张询盘已被其他操作更新，请刷新页面后重试。",
        status: "error",
      };
    }

    const messages: Partial<Record<InquiryAssignmentError["code"], string>> = {
      FORBIDDEN: "只有管理员可以分配当前负责人。",
      INVALID_OWNER: "所选账号不是可分配的业务人员。",
      INVALID_REASON: "请填写 2–500 字的分配原因。",
      NOT_FOUND: "这张询盘不存在或已不可用。",
      OWNER_UNCHANGED: "所选业务人员已经是当前负责人。",
    };

    return {
      message: messages[error.code] ?? "分配暂时无法完成，请稍后重试。",
      status: "error",
    };
  }
}
