import {
  getApplicationPrisma,
  type ApplicationDatabase,
} from "@/src/infrastructure/database/prisma";
import {
  getPublishedProduct,
  getPublishedProductById,
} from "@/src/application/public-catalog";
import {
  createInquirySubmissionToken,
  submitInquiryWithToken,
  type InquirySubmissionResult,
} from "@/src/modules/inquiry-operations/server/inquiry-submission-service";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";
import { getPublicInquiryReceipt } from "@/src/modules/inquiry-operations/server/inquiry-query";
import { captureAdministratorInquiryNotification } from "@/src/modules/notifications/server/notification-outbox";

type StoredInquiryReceipt = InquirySubmissionResult["receipt"];

async function projectPublicInquiryReceipt({
  prisma,
  receipt,
}: {
  prisma: ApplicationDatabase;
  receipt: StoredInquiryReceipt;
}) {
  const product = receipt.productId
    ? await getPublishedProductById({
        locale: receipt.locale,
        prisma,
        productId: receipt.productId,
      })
    : null;

  return {
    locale: receipt.locale,
    productPartNumber: product?.partNumber ?? null,
    referenceNumber: receipt.referenceNumber,
  };
}

export async function issueInquiryForm({
  locale,
  now,
  prisma = getApplicationPrisma(),
  productPartNumber,
}: {
  locale: PublicLocale;
  now?: Date;
  prisma?: ApplicationDatabase;
  productPartNumber?: string;
}) {
  const product = productPartNumber
    ? await getPublishedProduct({
        locale,
        partNumber: productPartNumber,
        prisma,
      })
    : null;

  if (productPartNumber && !product) {
    return null;
  }

  const sourcePage = product?.href ?? `/${locale}/inquiry`;
  const token = await createInquirySubmissionToken({
    locale,
    now,
    prisma,
    productId: product?.id,
    sourcePage,
  });

  return { product, sourcePage, token };
}

export async function submitInquiry({
  clientAddress,
  fingerprintSecret,
  form,
  now,
  prisma = getApplicationPrisma(),
  token,
}: {
  clientAddress: string;
  fingerprintSecret: string;
  form: unknown;
  now?: Date;
  prisma?: ApplicationDatabase;
  token: string;
}): Promise<{
  duplicate: boolean;
  receipt: {
    locale: PublicLocale;
    productPartNumber: string | null;
    referenceNumber: string;
  };
}> {
  const result: InquirySubmissionResult = await submitInquiryWithToken({
    captureAdministratorNotification: captureAdministratorInquiryNotification,
    clientAddress,
    fingerprintSecret,
    form,
    now,
    prisma,
    token,
  });

  return {
    duplicate: result.duplicate,
    receipt: await projectPublicInquiryReceipt({
      prisma,
      receipt: result.receipt,
    }),
  };
}

export async function getInquiryReceipt({
  prisma = getApplicationPrisma(),
  referenceNumber,
}: {
  prisma?: ApplicationDatabase;
  referenceNumber: string;
}) {
  const receipt = await getPublicInquiryReceipt({ prisma, referenceNumber });

  if (!receipt) {
    return null;
  }

  return projectPublicInquiryReceipt({ prisma, receipt });
}
