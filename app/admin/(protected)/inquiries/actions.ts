"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  assignInquiry,
  InquiryAssignmentError,
} from "@/src/application/admin-inquiries";
import {
  appendInquiryFollowUp,
  closeInquiry,
  InquiryLifecycleError,
  reopenInquiry,
} from "@/src/application/inquiry-lifecycle";
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
      INVALID_STATUS: "已关闭询盘需要先重新打开，才能重新分配。",
      NOT_FOUND: "这张询盘不存在或已不可用。",
      OWNER_UNCHANGED: "所选业务人员已经是当前负责人。",
    };

    return {
      message: messages[error.code] ?? "分配暂时无法完成，请稍后重试。",
      status: "error",
    };
  }
}

const dateSchema = z.iso
  .date()
  .transform((value) => new Date(`${value}T00:00:00.000Z`));
const optionalDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  dateSchema.optional(),
);
const optionalReasonSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().min(2).max(1_000).optional(),
);
const lifecycleFormSchema = z.discriminatedUnion("operation", [
  z.object({
    expectedVersion: z.coerce.number().int().positive(),
    nextStepDate: optionalDateSchema,
    operation: z.literal("contact"),
    referenceNumber: z.string().min(1).max(80),
    summary: z.string().trim().min(2).max(2_000),
  }),
  z.object({
    expectedVersion: z.coerce.number().int().positive(),
    nextStepDate: optionalDateSchema,
    operation: z.literal("internal_note"),
    referenceNumber: z.string().min(1).max(80),
    summary: z.string().trim().min(2).max(2_000),
  }),
  z.object({
    correctionOfId: z.string().uuid(),
    expectedVersion: z.coerce.number().int().positive(),
    nextStepDate: optionalDateSchema,
    operation: z.literal("correction"),
    referenceNumber: z.string().min(1).max(80),
    summary: z.string().trim().min(2).max(2_000),
  }),
  z.object({
    expectedVersion: z.coerce.number().int().positive(),
    nextStepDate: optionalDateSchema,
    operation: z.literal("quote"),
    quoteAmount: z
      .string()
      .regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/u)
      .refine((value) => Number(value) > 0),
    quoteCurrency: z.enum(["USD", "EUR", "CNY"]),
    quoteValidUntil: dateSchema,
    referenceNumber: z.string().min(1).max(80),
    summary: z.string().trim().min(2).max(2_000),
  }),
  z.object({
    closeResult: z.enum(["won", "lost", "invalid"]),
    expectedVersion: z.coerce.number().int().positive(),
    operation: z.literal("close"),
    reason: optionalReasonSchema,
    referenceNumber: z.string().min(1).max(80),
  }),
  z.object({
    expectedVersion: z.coerce.number().int().positive(),
    operation: z.literal("reopen"),
    reason: optionalReasonSchema,
    referenceNumber: z.string().min(1).max(80),
  }),
]);

export type InquiryLifecycleActionState = {
  conflict?: {
    latestModifiedAt: string;
    latestModifiedBy: string;
    latestVersion: number;
  };
  message: string;
  status: "error" | "idle" | "success";
};

export async function mutateInquiryLifecycleAction(
  _previousState: InquiryLifecycleActionState,
  formData: FormData,
): Promise<InquiryLifecycleActionState> {
  const { actor, allowed } = await authorizeAdminPage(
    PERMISSIONS.INQUIRIES_VIEW,
    "/admin/inquiries",
  );

  if (!allowed) {
    return { message: "你没有处理询盘的权限。", status: "error" };
  }

  const parsed = lifecycleFormSchema.safeParse({
    closeResult: formData.get("closeResult"),
    correctionOfId: formData.get("correctionOfId"),
    expectedVersion: formData.get("expectedVersion"),
    nextStepDate: formData.get("nextStepDate"),
    operation: formData.get("operation"),
    quoteAmount: formData.get("quoteAmount"),
    quoteCurrency: formData.get("quoteCurrency"),
    quoteValidUntil: formData.get("quoteValidUntil"),
    reason: formData.get("reason"),
    referenceNumber: formData.get("referenceNumber"),
    summary: formData.get("summary"),
  });

  if (!parsed.success) {
    return {
      message: "请检查必填内容、日期和报价金额后重试。",
      status: "error",
    };
  }

  try {
    const input = parsed.data;

    switch (input.operation) {
      case "contact":
      case "internal_note":
        await appendInquiryFollowUp({
          actor,
          expectedVersion: input.expectedVersion,
          nextStepDate: input.nextStepDate,
          referenceNumber: input.referenceNumber,
          summary: input.summary,
          type: input.operation,
        });
        break;
      case "correction":
        await appendInquiryFollowUp({
          actor,
          correctionOfId: input.correctionOfId,
          expectedVersion: input.expectedVersion,
          nextStepDate: input.nextStepDate,
          referenceNumber: input.referenceNumber,
          summary: input.summary,
          type: input.operation,
        });
        break;
      case "quote":
        await appendInquiryFollowUp({
          actor,
          expectedVersion: input.expectedVersion,
          nextStepDate: input.nextStepDate,
          quoteAmount: input.quoteAmount,
          quoteCurrency: input.quoteCurrency,
          quoteValidUntil: input.quoteValidUntil,
          referenceNumber: input.referenceNumber,
          summary: input.summary,
          type: input.operation,
        });
        break;
      case "close":
        await closeInquiry({
          actor,
          closeResult: input.closeResult,
          expectedVersion: input.expectedVersion,
          reason: input.reason,
          referenceNumber: input.referenceNumber,
        });
        break;
      case "reopen":
        await reopenInquiry({
          actor,
          expectedVersion: input.expectedVersion,
          reason: input.reason,
          referenceNumber: input.referenceNumber,
        });
        break;
    }

    const detailPath = `/admin/inquiries/${encodeURIComponent(input.referenceNumber)}`;
    revalidatePath("/admin");
    revalidatePath("/admin/inquiries");
    revalidatePath(detailPath);

    return { message: "询盘历史已更新。", status: "success" };
  } catch (error) {
    if (!(error instanceof InquiryLifecycleError)) {
      return { message: "操作暂时无法完成，请稍后重试。", status: "error" };
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

    const messages: Partial<Record<InquiryLifecycleError["code"], string>> = {
      FORBIDDEN: "当前角色不能执行这项操作。",
      INVALID_RECORD: "记录内容无效，请检查后重试。",
      INVALID_TRANSITION: "当前询盘状态不允许这项操作。",
      NOT_CURRENT_OWNER: "你不再是这张询盘的当前负责人。",
      NOT_FOUND: "这张询盘不存在或已不可用。",
    };

    return {
      message: messages[error.code] ?? "操作暂时无法完成，请稍后重试。",
      status: "error",
    };
  }
}
