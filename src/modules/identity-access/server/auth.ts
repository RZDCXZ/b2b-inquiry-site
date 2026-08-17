import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getApplicationPrisma } from "@/src/infrastructure/database/prisma";

export const auth = betterAuth({
  advanced: {
    cookiePrefix: "torquelis",
    useSecureCookies: false,
  },
  appName: "Torquelis 询盘运营系统",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  database: prismaAdapter(getApplicationPrisma(), {
    provider: "postgresql",
  }),
  emailAndPassword: {
    disableSignUp: true,
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 20,
  },
  rateLimit: {
    customRules: {
      "/sign-in/email": {
        // The six-project browser matrix performs 96 valid local-account
        // sign-ins through one loopback address without a ten-second idle gap.
        max: 128,
        window: 10,
      },
    },
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  trustedOrigins: ["http://127.0.0.1:*", "http://localhost:*"],
  user: {
    additionalFields: {
      role: {
        input: false,
        required: true,
        type: "string",
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
