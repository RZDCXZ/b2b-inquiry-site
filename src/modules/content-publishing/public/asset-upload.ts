import path from "node:path";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export type AssetKind = "document" | "image";

export type AssetUploadValidationErrorCode =
  | "DOCUMENT_INVALID"
  | "EMPTY_FILE"
  | "EXTENSION_MISMATCH"
  | "FILE_TOO_LARGE"
  | "IMAGE_ALT_REQUIRED"
  | "MIME_MISMATCH"
  | "SIGNATURE_MISMATCH"
  | "UNSUPPORTED_MEDIA_TYPE";

export class AssetUploadValidationError extends Error {
  constructor(readonly code: AssetUploadValidationErrorCode) {
    super(code);
    this.name = "AssetUploadValidationError";
  }
}

type SupportedMedia = {
  extensions: readonly string[];
  kind: AssetKind;
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
};

const supportedMedia = [
  {
    extensions: [".jpg", ".jpeg"],
    kind: "image",
    mimeType: "image/jpeg",
  },
  { extensions: [".png"], kind: "image", mimeType: "image/png" },
  { extensions: [".webp"], kind: "image", mimeType: "image/webp" },
  {
    extensions: [".pdf"],
    kind: "document",
    mimeType: "application/pdf",
  },
] as const satisfies readonly SupportedMedia[];

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function asciiAt(bytes: Uint8Array, offset: number, value: string): boolean {
  return Array.from(value).every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}

function detectMimeType(bytes: Uint8Array): SupportedMedia["mimeType"] | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    bytes.byteLength >= 12 &&
    asciiAt(bytes, 0, "RIFF") &&
    asciiAt(bytes, 8, "WEBP")
  ) {
    return "image/webp";
  }
  if (asciiAt(bytes, 0, "%PDF-")) {
    return "application/pdf";
  }
  return null;
}

function displayFilename(originalFilename: string): string {
  const base = path.posix.basename(originalFilename.replaceAll("\\", "/"));
  const withoutControlCharacters = base
    .replaceAll(/[\u0000-\u001f\u007f]/gu, "")
    .trim()
    .slice(0, 255);

  return withoutControlCharacters || "upload";
}

export function validateAssetUpload({
  bytes,
  declaredMimeType,
  imageAltEn,
  imageAltZhCn,
  kind,
  originalFilename,
}: {
  bytes: Uint8Array;
  declaredMimeType: string;
  imageAltEn?: string;
  imageAltZhCn?: string;
  kind: AssetKind;
  originalFilename: string;
}) {
  if (bytes.byteLength === 0) {
    throw new AssetUploadValidationError("EMPTY_FILE");
  }

  const maximumBytes = kind === "image" ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES;
  if (bytes.byteLength > maximumBytes) {
    throw new AssetUploadValidationError("FILE_TOO_LARGE");
  }

  const declaredMedia = supportedMedia.find(
    (media) => media.mimeType === declaredMimeType,
  );
  if (!declaredMedia || declaredMedia.kind !== kind) {
    throw new AssetUploadValidationError("UNSUPPORTED_MEDIA_TYPE");
  }

  const detectedMimeType = detectMimeType(bytes);
  if (!detectedMimeType) {
    throw new AssetUploadValidationError("SIGNATURE_MISMATCH");
  }
  if (detectedMimeType !== declaredMimeType) {
    throw new AssetUploadValidationError("MIME_MISMATCH");
  }

  const safeDisplayFilename = displayFilename(originalFilename);
  const extension = path.extname(safeDisplayFilename).toLocaleLowerCase();
  if (!declaredMedia.extensions.includes(extension as never)) {
    throw new AssetUploadValidationError("EXTENSION_MISMATCH");
  }

  const normalizedImageAltEn = imageAltEn?.trim() ?? null;
  const normalizedImageAltZhCn = imageAltZhCn?.trim() ?? null;
  if (kind === "image" && (!normalizedImageAltEn || !normalizedImageAltZhCn)) {
    throw new AssetUploadValidationError("IMAGE_ALT_REQUIRED");
  }

  return {
    byteSize: bytes.byteLength,
    displayFilename: safeDisplayFilename,
    extension,
    imageAltEn: kind === "image" ? normalizedImageAltEn : null,
    imageAltZhCn: kind === "image" ? normalizedImageAltZhCn : null,
    kind,
    mimeType: detectedMimeType,
  };
}
