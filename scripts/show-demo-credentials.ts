import "dotenv/config";

import { createPrismaClient } from "@/src/infrastructure/database/prisma";
import { assertLocalDemoTarget } from "@/src/infrastructure/local-demo/local-demo-target";
import { readPresetCredentials } from "@/src/modules/identity-access/server/preset-credentials";
import { verifyLocalDatabaseIdentity } from "@/src/modules/site-config/server/verify-local-database";

const databaseUrl = process.env.DATABASE_URL ?? "";
assertLocalDemoTarget({
  databaseUrl,
  environmentMarker: process.env.DEMO_ENVIRONMENT_ID ?? "",
});

const prisma = createPrismaClient(databaseUrl);

try {
  await verifyLocalDatabaseIdentity(prisma);
  const credentials = await readPresetCredentials();

  console.log("Torquelis 本地演示后台凭据");
  for (const account of credentials.accounts) {
    console.log(`\n${account.roleLabel}`);
    console.log(`  邮箱：${account.email}`);
    console.log(`  密码：${account.password}`);
  }
  console.log("\n登录地址：http://127.0.0.1:3000/admin/login");
} finally {
  await prisma.$disconnect();
}
