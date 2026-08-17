import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedProduct } from "@/src/application/public-catalog";
import { getInquiryReceipt } from "@/src/application/public-inquiry";
import { getPublicSiteShellData } from "@/src/application/public-site-shell";
import {
  bilingualPublicPaths,
  createLocalizedPageMetadata,
} from "@/src/application/public-seo";
import { InquirySuccessPage } from "@/src/components/public/inquiry-success-page";
import { getInquiryCopy } from "@/src/modules/content-publishing/public/inquiry-copy";
import { INQUIRY_REFERENCE_SCHEMA } from "@/src/modules/inquiry-operations/public/inquiry-submission";
import { isPublicLocale } from "@/src/modules/site-config/public/locales";

type InquirySuccessRouteProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reference?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: InquirySuccessRouteProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    return {};
  }

  return createLocalizedPageMetadata({
    indexable: false,
    locale,
    paths: bilingualPublicPaths("/inquiry/success"),
    title: getInquiryCopy(locale).successMetadataTitle,
  });
}

export default async function InquirySuccessRoute({
  params,
  searchParams,
}: InquirySuccessRouteProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);

  if (!isPublicLocale(locale)) {
    notFound();
  }

  const parsedReference = INQUIRY_REFERENCE_SCHEMA.safeParse(query.reference);

  if (!parsedReference.success) {
    notFound();
  }

  const receipt = await getInquiryReceipt({
    referenceNumber: parsedReference.data,
  });

  if (!receipt) {
    notFound();
  }

  const [product, shell] = await Promise.all([
    receipt.productPartNumber
      ? getPublishedProduct({
          locale,
          partNumber: receipt.productPartNumber,
        })
      : Promise.resolve(null),
    getPublicSiteShellData({ locale }),
  ]);

  return (
    <InquirySuccessPage
      locale={locale}
      product={product}
      referenceNumber={receipt.referenceNumber}
      shell={shell}
    />
  );
}
