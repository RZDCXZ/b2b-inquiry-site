import { describe, expect, it } from "vitest";

import { assertLocalDemoTarget } from "@/src/infrastructure/local-demo/local-demo-target";
import { assertLocalDatabaseIdentity } from "@/src/modules/site-config/server/verify-local-database";

describe("local demo target safety", () => {
  it("accepts only the known local database and verifies its stored identity", () => {
    expect(() =>
      assertLocalDemoTarget({
        databaseUrl: "not-a-database-url",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toThrow("DATABASE_URL is invalid");

    expect(() =>
      assertLocalDemoTarget({
        databaseUrl: "mysql://torquelis:secret@localhost:55432/torquelis_demo",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toThrow("database protocol must be PostgreSQL");

    expect(() =>
      assertLocalDemoTarget({
        databaseUrl:
          "postgresql://demo:secret@db.example.com:5432/torquelis_demo",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toThrow("database host must be loopback");

    expect(() =>
      assertLocalDemoTarget({
        databaseUrl:
          "postgresql://demo:secret@127.0.0.1:55432/customer_database",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toThrow("database name must be torquelis_demo");

    expect(() =>
      assertLocalDemoTarget({
        databaseUrl:
          "postgresql://torquelis:secret@localhost:5432/torquelis_demo",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toThrow("database port must be 55432");

    expect(() =>
      assertLocalDemoTarget({
        databaseUrl:
          "postgresql://postgres:secret@localhost:55432/torquelis_demo",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toThrow("database user must be torquelis");

    expect(() =>
      assertLocalDemoTarget({
        databaseUrl:
          "postgresql://torquelis:secret@localhost:55432/torquelis_demo",
        environmentMarker: "unknown",
      }),
    ).toThrow("environment marker is unknown");

    const target = assertLocalDemoTarget({
      databaseUrl:
        "postgresql://torquelis:secret@127.0.0.1:55432/torquelis_demo",
      environmentMarker: "torquelis-local-demo",
    });

    expect(target).toEqual({
      databaseName: "torquelis_demo",
      host: "127.0.0.1",
    });

    expect(
      assertLocalDemoTarget({
        databaseUrl: "postgresql://torquelis:secret@[::1]:55432/torquelis_demo",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toEqual({
      databaseName: "torquelis_demo",
      host: "[::1]",
    });
    expect(() =>
      assertLocalDatabaseIdentity({
        databaseId: "different-database",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toThrow("database identity is unknown");
    expect(
      assertLocalDatabaseIdentity({
        databaseId: "torquelis-demo-v1",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toBeUndefined();
  });
});
