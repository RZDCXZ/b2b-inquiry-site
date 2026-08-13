import "dotenv/config";

import { assertLocalDemoTarget } from "@/src/infrastructure/local-demo/local-demo-target";

assertLocalDemoTarget({
  databaseUrl: process.env.DATABASE_URL ?? "",
  environmentMarker: process.env.DEMO_ENVIRONMENT_ID ?? "",
});

console.log("Verified the configured loopback Torquelis demo database target.");
