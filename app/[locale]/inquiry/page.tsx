import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { issueInquiryForm } from "@/src/application/public-inquiry";
import { InquiryFormPage } from "@/src/components/public/inquiry-form-page";
import { getInquiryCopy } from "@/src/modules/content-publishing/public/inquiry-copy";
import {
  PUBLIC_INQUIRY_FIELD_NAMES,
  type PublicInquiryFieldName,
} from "@/src/modules/inquiry-operations/public/inquiry-submission";
import {
  isPublicLocale,
  type PublicLocale,
} from "@/src/modules/site-config/public/locales";

type InquiryPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string | string[];
    fields?: string | string[];
    product?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: InquiryPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isPublicLocale(locale)) {
    return {};
  }

  const copy = getInquiryCopy(locale);
  return { description: copy.metadataDescription, title: copy.metadataTitle };
}

export default async function InquiryPage({
  params,
  searchParams,
}: InquiryPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);

  if (!isPublicLocale(locale)) {
    notFound();
  }

  const productPartNumber =
    typeof query.product === "string" ? query.product : undefined;
  const form = await issueInquiryForm({
    locale,
    productPartNumber,
  });

  if (!form) {
    notFound();
  }

  const error =
    typeof query.error === "string" &&
    ["expired", "invalid", "unavailable"].includes(query.error)
      ? (query.error as "expired" | "invalid" | "unavailable")
      : undefined;
  const fieldErrors =
    typeof query.fields === "string"
      ? query.fields
          .split(",")
          .filter((fieldName): fieldName is PublicInquiryFieldName =>
            PUBLIC_INQUIRY_FIELD_NAMES.includes(
              fieldName as PublicInquiryFieldName,
            ),
          )
      : [];

  return (
    <InquiryFormPage
      error={error}
      fieldErrors={fieldErrors}
      locale={locale as PublicLocale}
      product={form.product}
      token={form.token}
    />
  );
}
