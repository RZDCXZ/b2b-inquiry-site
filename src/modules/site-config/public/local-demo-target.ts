export const LOCAL_DATABASE_ID = "torquelis-demo-v1";
export const LOCAL_DATABASE_NAME = "torquelis_demo";
export const LOCAL_DATABASE_PORT = "55432";
export const LOCAL_DATABASE_USER = "torquelis";
export const LOCAL_ENVIRONMENT_MARKER = "torquelis-local-demo";

const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);

type LocalDemoTargetInput = {
  databaseUrl: string;
  environmentMarker: string;
};

type LocalDemoTarget = {
  databaseName: typeof LOCAL_DATABASE_NAME;
  host: string;
};

type StoredDatabaseIdentity = {
  databaseId: string;
  environmentMarker: string;
};

export function assertLocalDemoTarget({
  databaseUrl,
  environmentMarker,
}: LocalDemoTargetInput): LocalDemoTarget {
  let target: URL;

  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error("Refusing demo operation: DATABASE_URL is invalid.");
  }

  if (target.protocol !== "postgresql:" && target.protocol !== "postgres:") {
    throw new Error(
      "Refusing demo operation: database protocol must be PostgreSQL.",
    );
  }

  if (!loopbackHosts.has(target.hostname)) {
    throw new Error("Refusing demo operation: database host must be loopback.");
  }

  if (target.port !== LOCAL_DATABASE_PORT) {
    throw new Error(
      `Refusing demo operation: database port must be ${LOCAL_DATABASE_PORT}.`,
    );
  }

  const databaseName = decodeURIComponent(target.pathname.slice(1));

  if (databaseName !== LOCAL_DATABASE_NAME) {
    throw new Error(
      `Refusing demo operation: database name must be ${LOCAL_DATABASE_NAME}.`,
    );
  }

  if (decodeURIComponent(target.username) !== LOCAL_DATABASE_USER) {
    throw new Error(
      `Refusing demo operation: database user must be ${LOCAL_DATABASE_USER}.`,
    );
  }

  if (environmentMarker !== LOCAL_ENVIRONMENT_MARKER) {
    throw new Error("Refusing demo operation: environment marker is unknown.");
  }

  return {
    databaseName: LOCAL_DATABASE_NAME,
    host: target.hostname,
  };
}

export function assertDatabaseIdentity(
  identity: StoredDatabaseIdentity | null,
): void {
  if (
    identity?.databaseId !== LOCAL_DATABASE_ID ||
    identity.environmentMarker !== LOCAL_ENVIRONMENT_MARKER
  ) {
    throw new Error("Refusing demo operation: database identity is unknown.");
  }
}
