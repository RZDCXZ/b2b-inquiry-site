import { afterAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { setProductLifecycle } from "@/src/modules/catalog/server/product-lifecycle-service";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://torquelis:torquelis_local_only@127.0.0.1:55432/torquelis_demo?schema=public";
const prisma = createPrismaClient(databaseUrl);

describe("标准替换件生命周期", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("已停产产品可以关联并移除一个有效替代产品", async () => {
    try {
      await expect(
        setProductLifecycle({
          partNumber: "TQ-AF-2000",
          prisma,
          replacementPartNumber: "tq af 2106",
          status: "discontinued",
        }),
      ).resolves.toEqual({
        partNumber: "TQ-AF-2000",
        replacementPartNumber: "TQ-AF-2106",
        status: "discontinued",
      });
    } finally {
      await setProductLifecycle({
        partNumber: "TQ-AF-2000",
        prisma,
        status: "discontinued",
      });
    }
  });

  it("替代产品不能指向自身", async () => {
    await expect(
      setProductLifecycle({
        partNumber: "TQ-FL-4720",
        prisma,
        replacementPartNumber: "tq fl 4720",
        status: "discontinued",
      }),
    ).rejects.toMatchObject({ code: "REPLACEMENT_SELF_REFERENCE" });
  });

  it("替代关系不能形成循环", async () => {
    try {
      await expect(
        setProductLifecycle({
          partNumber: "TQ-FL-4827",
          prisma,
          replacementPartNumber: "TQ-FL-4720",
          status: "discontinued",
        }),
      ).rejects.toMatchObject({ code: "REPLACEMENT_CYCLE" });
    } finally {
      await setProductLifecycle({
        partNumber: "TQ-FL-4827",
        prisma,
        status: "published",
      });
    }
  });
});
