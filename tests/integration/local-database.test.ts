import { afterAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import {
  LOCAL_DATABASE_ID,
  LOCAL_ENVIRONMENT_MARKER,
} from "@/src/modules/site-config/public/local-demo-target";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

describe("fresh local database", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("contains the verified environment identity and minimum site data", async () => {
    const identity = await prisma.environmentIdentity.findUnique({
      where: { key: "primary" },
    });
    const site = await prisma.siteConfiguration.findUnique({
      where: { key: "primary" },
    });

    expect(identity).toMatchObject({
      databaseId: LOCAL_DATABASE_ID,
      environmentMarker: LOCAL_ENVIRONMENT_MARKER,
    });
    expect(site).toMatchObject({
      companyNameEn: "Torquelis Filters",
      companyNameZhCn: "拓擎利滤清",
      contactEmail: "inquiries@torquelis.example",
    });
  });
});
