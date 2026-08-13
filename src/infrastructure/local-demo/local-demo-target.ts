import { z } from "zod";

import {
  LOCAL_DATABASE_NAME,
  LOCAL_DATABASE_PORT,
  LOCAL_DATABASE_USER,
  LOCAL_ENVIRONMENT_MARKER,
} from "@/src/modules/site-config/public/local-demo-target";

const databaseUrlSchema = z
  .url({ error: "Refusing demo operation: DATABASE_URL is invalid." })
  .transform((value) => {
    const target = new URL(value);

    return {
      databaseName: target.pathname.slice(1),
      host: target.hostname,
      port: target.port,
      protocol: target.protocol,
      user: target.username,
    };
  })
  .pipe(
    z.object({
      databaseName: z.literal(LOCAL_DATABASE_NAME, {
        error: `Refusing demo operation: database name must be ${LOCAL_DATABASE_NAME}.`,
      }),
      host: z.enum(["127.0.0.1", "localhost", "[::1]"], {
        error: "Refusing demo operation: database host must be loopback.",
      }),
      port: z.literal(LOCAL_DATABASE_PORT, {
        error: `Refusing demo operation: database port must be ${LOCAL_DATABASE_PORT}.`,
      }),
      protocol: z.enum(["postgresql:", "postgres:"], {
        error: "Refusing demo operation: database protocol must be PostgreSQL.",
      }),
      user: z.literal(LOCAL_DATABASE_USER, {
        error: `Refusing demo operation: database user must be ${LOCAL_DATABASE_USER}.`,
      }),
    }),
  );

const localDemoTargetSchema = z.object({
  databaseUrl: databaseUrlSchema,
  environmentMarker: z.literal(LOCAL_ENVIRONMENT_MARKER, {
    error: "Refusing demo operation: environment marker is unknown.",
  }),
});

type LocalDemoTargetInput = {
  databaseUrl: string;
  environmentMarker: string;
};

type LocalDemoTarget = {
  databaseName: typeof LOCAL_DATABASE_NAME;
  host: string;
};

export function assertLocalDemoTarget(
  input: LocalDemoTargetInput,
): LocalDemoTarget {
  const result = localDemoTargetSchema.safeParse(input);

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message);
  }

  return {
    databaseName: result.data.databaseUrl.databaseName,
    host: result.data.databaseUrl.host,
  };
}
