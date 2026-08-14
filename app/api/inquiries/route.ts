import { submitInquiry } from "@/src/application/public-inquiry";
import type { PublicInquiryFieldName } from "@/src/modules/inquiry-operations/public/inquiry-submission";
import { InquirySubmissionError } from "@/src/modules/inquiry-operations/server/inquiry-submission-service";
import {
  isPublicLocale,
  type PublicLocale,
} from "@/src/modules/site-config/public/locales";

function checkbox(form: FormData, name: string): boolean {
  return form.get(name) === "on" || form.get(name) === "true";
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function requestLocale(form: FormData): PublicLocale {
  const locale = text(form, "locale");
  return isPublicLocale(locale) ? locale : "en";
}

function formRedirectUrl(
  request: Request,
  form: FormData,
  error: "expired" | "invalid" | "unavailable",
  fieldNames: readonly PublicInquiryFieldName[] = [],
): URL {
  const locale = requestLocale(form);
  const url = new URL(`/${locale}/inquiry`, request.url);
  const productPartNumber = text(form, "productPartNumber");
  url.searchParams.set("error", error);

  if (fieldNames.length > 0) {
    url.searchParams.set("fields", fieldNames.join(","));
  }

  if (productPartNumber) {
    url.searchParams.set("product", productPartNumber.slice(0, 80));
  }

  return url;
}

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const fingerprintSecret = process.env.BETTER_AUTH_SECRET;

  if (!fingerprintSecret) {
    return Response.redirect(
      formRedirectUrl(request, form, "unavailable"),
      303,
    );
  }

  try {
    const result = await submitInquiry({
      clientAddress:
        request.headers
          .get("x-forwarded-for")
          ?.split(",")[0]
          ?.trim()
          .slice(0, 120) || "local-demo",
      fingerprintSecret,
      form: {
        company: text(form, "company"),
        contactName: text(form, "contactName"),
        countryRegion: text(form, "countryRegion"),
        customPackagingNeeded: checkbox(form, "customPackagingNeeded"),
        expectedQuantity: text(form, "expectedQuantity"),
        honeypot: text(form, "honeypot"),
        message: text(form, "message"),
        phoneOrWhatsapp: text(form, "phoneOrWhatsapp"),
        privacyConsent: checkbox(form, "privacyConsent"),
        privateLabelNeeded: checkbox(form, "privateLabelNeeded"),
        targetMarket: text(form, "targetMarket"),
        workEmail: text(form, "workEmail"),
      },
      token: text(form, "token"),
    });
    const successUrl = new URL(
      `/${result.receipt.locale}/inquiry/success`,
      request.url,
    );
    successUrl.searchParams.set("reference", result.receipt.referenceNumber);

    return Response.redirect(successUrl, 303);
  } catch (error) {
    if (error instanceof InquirySubmissionError) {
      return Response.redirect(
        formRedirectUrl(
          request,
          form,
          error.code === "invalid_fields" ? "invalid" : "expired",
          error.fieldNames,
        ),
        303,
      );
    }

    return Response.redirect(
      formRedirectUrl(request, form, "unavailable"),
      303,
    );
  }
}
