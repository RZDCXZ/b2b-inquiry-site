import { describe, expect, it } from "vitest";

import {
  assertDatabaseIdentity,
  assertLocalDemoTarget,
} from "@/src/modules/site-config/public/local-demo-target";

describe("local demo target safety", () => {
  it("accepts only the known local database and verifies its stored identity", () => {
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
    expect(() =>
      assertDatabaseIdentity({
        databaseId: "different-database",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toThrow("database identity is unknown");
    expect(
      assertDatabaseIdentity({
        databaseId: "torquelis-demo-v1",
        environmentMarker: "torquelis-local-demo",
      }),
    ).toBeUndefined();
  });
});
