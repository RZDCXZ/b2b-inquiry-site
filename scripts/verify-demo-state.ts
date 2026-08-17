import "dotenv/config";

import { verifyReproducibleDemoState } from "@/src/application/demo-reproduction";

const evidence = await verifyReproducibleDemoState({
  authSecret: process.env.BETTER_AUTH_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  environmentMarker: process.env.DEMO_ENVIRONMENT_ID,
});

console.log(JSON.stringify(evidence, null, 2));
