import { z } from "zod";

export const SEO_CANONICAL_ORIGIN = "https://torquelis.example";

const PUBLIC_SEO_MODE_SCHEMA = z.literal("public");

export function isPublicSeoMode(
  environment: Readonly<{ TORQUELIS_SEO_MODE?: string }> = {
    TORQUELIS_SEO_MODE: process.env.TORQUELIS_SEO_MODE,
  },
): boolean {
  return PUBLIC_SEO_MODE_SCHEMA.safeParse(environment.TORQUELIS_SEO_MODE)
    .success;
}
