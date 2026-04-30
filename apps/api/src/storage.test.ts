import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { createStorageAdapter } from "./storage";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("storage adapter", () => {
  it("loads local demo store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hadiri-adapter-"));
    tempRoots.push(dir);
    const adapter = createStorageAdapter("local-demo", join(dir, "store.json"));

    const store = await adapter.load();
    expect(store.requests.length).toBeGreaterThan(0);
  });

  it("keeps production adapter path compatible with current demo persistence", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hadiri-adapter-"));
    tempRoots.push(dir);
    const adapter = createStorageAdapter("production-adapter", join(dir, "store.json"));

    const store = await adapter.load();
    expect(store.scanner.token).toBeTruthy();
  });
});
