import {
  ArrowLeft,
  Info,
  PaperPlaneTilt,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { PublishedProductDetail } from "@/src/application/public-catalog";
import type { PublicSiteShellData } from "@/src/application/public-site-shell";
import { PublicFooter } from "@/src/components/public/public-footer";
import { PublicHeader } from "@/src/components/public/public-header";
import { productImageSource } from "@/src/components/product-image-source";
import { getHomeCopy } from "@/src/modules/content-publishing/public/home-copy";
import { getInquiryCopy } from "@/src/modules/content-publishing/public/inquiry-copy";
import type { CorePageTranslation } from "@/src/modules/content-publishing/public/core-page-contracts";
import type { PublicInquiryFieldName } from "@/src/modules/inquiry-operations/public/inquiry-submission";
import type { PublicLocale } from "@/src/modules/site-config/public/locales";

const inquiryFieldMaximumLengths: Partial<
  Record<PublicInquiryFieldName, number>
> = {
  company: 200,
  contactName: 120,
  countryRegion: 120,
  expectedQuantity: 120,
  phoneOrWhatsapp: 120,
  targetMarket: 160,
  workEmail: 320,
};

function InquiryField({
  children,
  errorMessage,
  label,
  locale,
  name,
  required = false,
  type = "text",
}: {
  children?: ReactNode;
  errorMessage?: string;
  label: string;
  locale: PublicLocale;
  name: PublicInquiryFieldName;
  required?: boolean;
  type?: "email" | "tel" | "text";
}) {
  const copy = getInquiryCopy(locale);
  const hasError = Boolean(errorMessage);

  return (
    <label
      className={`inquiry-field${hasError ? " inquiry-field--error" : ""}`}
    >
      <span>
        {label} <small>({required ? copy.required : copy.optional})</small>
      </span>
      {children ?? (
        <input
          aria-describedby={hasError ? `${name}-error` : undefined}
          aria-invalid={hasError || undefined}
          id={name}
          maxLength={inquiryFieldMaximumLengths[name]}
          name={name}
          required={required}
          type={type}
        />
      )}
      {errorMessage ? (
        <InquiryFieldError id={`${name}-error`} message={errorMessage} />
      ) : null}
    </label>
  );
}

function InquiryFieldError({ id, message }: { id: string; message: string }) {
  return (
    <span className="inquiry-field-error" id={id}>
      <Warning aria-hidden="true" size={15} weight="fill" />
      {message}
    </span>
  );
}

export function InquiryFormPage({
  contactContent,
  error,
  fieldErrors,
  locale,
  product,
  shell,
  token,
}: {
  contactContent: CorePageTranslation;
  error?: "expired" | "invalid" | "unavailable";
  fieldErrors: readonly PublicInquiryFieldName[];
  locale: PublicLocale;
  product: PublishedProductDetail | null;
  shell: PublicSiteShellData;
  token: string;
}) {
  const copy = getInquiryCopy(locale);
  const homeCopy = getHomeCopy(locale);
  const inquiryHref = (targetLocale: PublicLocale) =>
    `/${targetLocale}/inquiry${product ? `?product=${encodeURIComponent(product.partNumber)}` : ""}`;
  const errorMessage = error
    ? {
        expired: copy.errorExpired,
        invalid: copy.errorInvalid,
        unavailable: copy.errorUnavailable,
      }[error]
    : null;
  const hasFieldError = (fieldName: PublicInquiryFieldName) =>
    fieldErrors.includes(fieldName);
  const fieldLabels: Record<PublicInquiryFieldName, string> = {
    company: copy.company,
    contactName: copy.contactName,
    countryRegion: copy.countryRegion,
    customPackagingNeeded: copy.customPackaging,
    expectedQuantity: copy.expectedQuantity,
    message: copy.message,
    phoneOrWhatsapp: copy.phone,
    privacyConsent: copy.consent,
    privateLabelNeeded: copy.privateLabel,
    targetMarket: copy.targetMarket,
    workEmail: copy.workEmail,
  };
  const fieldErrorMessages: Record<PublicInquiryFieldName, string> = {
    company: copy.errorRequiredField,
    contactName: copy.errorRequiredField,
    countryRegion: copy.errorRequiredField,
    customPackagingNeeded: copy.errorChoice,
    expectedQuantity: copy.errorRequiredField,
    message: copy.errorMessageField,
    phoneOrWhatsapp: copy.errorOptionalField,
    privacyConsent: copy.errorConsent,
    privateLabelNeeded: copy.errorChoice,
    targetMarket: copy.errorOptionalField,
    workEmail: copy.errorEmail,
  };
  const fieldErrorMessage = (fieldName: PublicInquiryFieldName) =>
    hasFieldError(fieldName) ? fieldErrorMessages[fieldName] : undefined;

  return (
    <div className="public-shell">
      <PublicHeader
        activeNavigationAnchor="contact"
        descriptor={homeCopy.brandDescriptor}
        languageHrefs={{
          en: inquiryHref("en"),
          "zh-cn": inquiryHref("zh-cn"),
        }}
        languageLabel={homeCopy.languageLabel}
        locale={locale}
        mobileNavigationLabel={homeCopy.mobileNavigationLabel}
        navigation={homeCopy.nav}
        primaryNavigationLabel={homeCopy.primaryNavigationLabel}
        visibleNavigationAnchors={shell.visibleNavigationAnchors}
      />
      <main className="inquiry-page">
        <header className="inquiry-heading">
          <div>
            <p className="eyebrow">
              {product ? copy.productEyebrow : contactContent.eyebrow}
            </p>
            <h1>{product ? copy.productHeading : contactContent.title}</h1>
            <p>{product ? copy.productLede : contactContent.lede}</p>
          </div>
          <aside>
            <Info aria-hidden="true" size={20} weight="fill" />
            {copy.inquiryBoundary}
          </aside>
        </header>
        <section
          aria-label={locale === "en" ? "Inquiry guidance" : "询盘说明"}
          className="inquiry-content-guidance"
        >
          {contactContent.sections.map((section, index) => (
            <article key={section.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{section.heading}</h2>
                <p>{section.body}</p>
              </div>
            </article>
          ))}
        </section>
        <div
          className={`inquiry-layout${product ? "" : " inquiry-layout--general"}`}
        >
          {product ? (
            <aside className="inquiry-product-context">
              <p>{copy.productContext}</p>
              <figure>
                <Image
                  alt={`${product.name} ${product.partNumber}`}
                  fill
                  sizes="(max-width: 820px) 120px, 320px"
                  src={productImageSource(product.imagePath)}
                />
              </figure>
              <h2>{product.partNumber}</h2>
              <strong>{product.name}</strong>
              <dl>
                <div>
                  <dt>{locale === "en" ? "Category" : "分类"}</dt>
                  <dd>{product.category.name}</dd>
                </div>
              </dl>
              <Link href={product.href}>
                <ArrowLeft aria-hidden="true" size={17} />
                {copy.returnToProduct}
              </Link>
            </aside>
          ) : null}
          <form action="/api/inquiries" className="inquiry-form" method="post">
            <input name="locale" type="hidden" value={locale} />
            <input name="token" type="hidden" value={token} />
            {product ? (
              <input
                name="productPartNumber"
                type="hidden"
                value={product.partNumber}
              />
            ) : null}
            <label aria-hidden="true" className="inquiry-honeypot">
              Website
              <input autoComplete="off" name="honeypot" tabIndex={-1} />
            </label>
            {errorMessage ? (
              <div
                autoFocus
                className="inquiry-error-summary"
                role="alert"
                tabIndex={-1}
              >
                <strong>
                  {copy.errorHeading}
                  {fieldErrors.length > 0
                    ? ` · ${copy.errorCount(fieldErrors.length)}`
                    : ""}
                </strong>
                <p>{errorMessage}</p>
                {fieldErrors.length > 0 ? (
                  <ul>
                    {fieldErrors.map((fieldName) => (
                      <li key={fieldName}>
                        <a href={`#${fieldName}`}>{fieldLabels[fieldName]}</a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div className="inquiry-form-grid">
              <InquiryField
                errorMessage={fieldErrorMessage("contactName")}
                label={copy.contactName}
                locale={locale}
                name="contactName"
                required
              />
              <InquiryField
                errorMessage={fieldErrorMessage("workEmail")}
                label={copy.workEmail}
                locale={locale}
                name="workEmail"
                required
                type="email"
              />
              <InquiryField
                errorMessage={fieldErrorMessage("company")}
                label={copy.company}
                locale={locale}
                name="company"
                required
              />
              <InquiryField
                errorMessage={fieldErrorMessage("countryRegion")}
                label={copy.countryRegion}
                locale={locale}
                name="countryRegion"
                required
              />
              <InquiryField
                errorMessage={fieldErrorMessage("phoneOrWhatsapp")}
                label={copy.phone}
                locale={locale}
                name="phoneOrWhatsapp"
                type="tel"
              />
              <InquiryField
                errorMessage={fieldErrorMessage("expectedQuantity")}
                label={copy.expectedQuantity}
                locale={locale}
                name="expectedQuantity"
                required
              />
              <InquiryField
                errorMessage={fieldErrorMessage("targetMarket")}
                label={copy.targetMarket}
                locale={locale}
                name="targetMarket"
              />
            </div>
            <div className="inquiry-choice-row">
              <div className="inquiry-choice-field">
                <label>
                  <input
                    aria-describedby={
                      hasFieldError("privateLabelNeeded")
                        ? "privateLabelNeeded-error"
                        : undefined
                    }
                    aria-invalid={
                      hasFieldError("privateLabelNeeded") || undefined
                    }
                    id="privateLabelNeeded"
                    name="privateLabelNeeded"
                    type="checkbox"
                  />
                  <span>
                    {copy.privateLabel} <small>({copy.optional})</small>
                  </span>
                </label>
                {fieldErrorMessage("privateLabelNeeded") ? (
                  <InquiryFieldError
                    id="privateLabelNeeded-error"
                    message={fieldErrorMessages.privateLabelNeeded}
                  />
                ) : null}
              </div>
              <div className="inquiry-choice-field">
                <label>
                  <input
                    aria-describedby={
                      hasFieldError("customPackagingNeeded")
                        ? "customPackagingNeeded-error"
                        : undefined
                    }
                    aria-invalid={
                      hasFieldError("customPackagingNeeded") || undefined
                    }
                    id="customPackagingNeeded"
                    name="customPackagingNeeded"
                    type="checkbox"
                  />
                  <span>
                    {copy.customPackaging} <small>({copy.optional})</small>
                  </span>
                </label>
                {fieldErrorMessage("customPackagingNeeded") ? (
                  <InquiryFieldError
                    id="customPackagingNeeded-error"
                    message={fieldErrorMessages.customPackagingNeeded}
                  />
                ) : null}
              </div>
            </div>
            <InquiryField
              errorMessage={fieldErrorMessage("message")}
              label={copy.message}
              locale={locale}
              name="message"
              required
            >
              <textarea
                aria-describedby={
                  hasFieldError("message") ? "message-error" : undefined
                }
                aria-invalid={hasFieldError("message") || undefined}
                id="message"
                maxLength={5_000}
                minLength={10}
                name="message"
                required
                rows={7}
              />
            </InquiryField>
            <div className="inquiry-consent-field">
              <label className="inquiry-consent">
                <input
                  aria-describedby={
                    hasFieldError("privacyConsent")
                      ? "privacyConsent-error"
                      : undefined
                  }
                  aria-invalid={hasFieldError("privacyConsent") || undefined}
                  id="privacyConsent"
                  name="privacyConsent"
                  required
                  type="checkbox"
                />
                <span>
                  {copy.consent} <small>({copy.required})</small>
                </span>
              </label>
              {fieldErrorMessage("privacyConsent") ? (
                <InquiryFieldError
                  id="privacyConsent-error"
                  message={fieldErrorMessages.privacyConsent}
                />
              ) : null}
            </div>
            <footer className="inquiry-submit-row">
              <button className="primary-button" type="submit">
                {copy.send}
                <PaperPlaneTilt aria-hidden="true" size={18} />
              </button>
              <p>{copy.formHelper}</p>
            </footer>
          </form>
        </div>
      </main>
      <PublicFooter
        companyName={homeCopy.companyName}
        configuration={shell.configuration}
        contactHeading={homeCopy.footerContact}
        demoNotice={homeCopy.demoNotice}
        description={homeCopy.footerDescription}
        exploreHeading={homeCopy.footerExplore}
        informationHeading={homeCopy.footerInformation}
        locale={locale}
        navigation={homeCopy.nav}
        privacyLabel={homeCopy.footerPrivacy}
        visibleNavigationAnchors={shell.visibleNavigationAnchors}
      />
    </div>
  );
}
