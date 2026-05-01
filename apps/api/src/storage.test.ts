import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { createInitialStore } from "./domain";
import { __test, createStorageAdapter } from "./storage";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("storage adapter", () => {
  it("loads local demo store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taptu-adapter-"));
    tempRoots.push(dir);
    const adapter = createStorageAdapter(
      {
        storageMode: "local-demo",
        supabase: {
          tableName: "taptu_app_store",
          storeKey: "demo"
        }
      },
      join(dir, "store.json")
    );

    const store = await adapter.load();
    expect(store.requests.length).toBeGreaterThan(0);
  });

  it("loads a Supabase store row", async () => {
    const store = createInitialStore();
    const fetchCalls: string[] = [];
    const fetcher = async (input: string | URL | Request) => {
      fetchCalls.push(String(input));
      return Response.json([{ id: "demo", payload: store }]);
    };

    const adapter = __test.createSupabaseStorageAdapter(
      {
        url: "https://ajlfwivpllbcmadscmkb.supabase.co",
        serviceRoleKey: "service-key",
        tableName: "taptu_app_store",
        storeKey: "demo"
      },
      fetcher as typeof fetch
    );

    await expect(adapter.load()).resolves.toEqual(store);
    expect(fetchCalls[0]).toBe("https://ajlfwivpllbcmadscmkb.supabase.co/rest/v1/taptu_app_store?id=eq.demo&select=id,payload");
  });

  it("seeds Supabase when the store row is missing", async () => {
    const requests: Request[] = [];
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push(new Request(input, init));

      if (!init?.method) {
        return Response.json([]);
      }

      return new Response(null, { status: 201 });
    };

    const adapter = __test.createSupabaseStorageAdapter(
      {
        url: "https://ajlfwivpllbcmadscmkb.supabase.co/",
        serviceRoleKey: "service-key",
        tableName: "taptu_app_store",
        storeKey: "demo"
      },
      fetcher as typeof fetch
    );

    const loaded = await adapter.load();
    const savedPayload = await requests[1].json();

    expect(loaded.scanner.token).toBeTruthy();
    expect(requests[1].method).toBe("POST");
    expect(savedPayload.id).toBe("demo");
    expect(savedPayload.payload.scanner.token).toBe(loaded.scanner.token);
  });

  it("requires Supabase credentials in Supabase mode", () => {
    expect(() =>
      createStorageAdapter(
        {
          storageMode: "supabase",
          supabase: {
            tableName: "taptu_app_store",
            storeKey: "demo"
          }
        },
        "unused.json"
      )
    ).toThrow("SUPABASE_URL is required");
  });
});
