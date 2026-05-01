import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { createInitialStore } from "./domain";
import { ensureStoreFile, loadStore, saveStore } from "./store";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("demo store persistence", () => {
  it("creates store file when missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taptu-store-"));
    tempRoots.push(dir);
    const filePath = join(dir, "demo-store.json");

    const store = await ensureStoreFile(filePath);

    expect(store.requests.length).toBeGreaterThan(0);
    const saved = JSON.parse(await readFile(filePath, "utf8")) as ReturnType<typeof createInitialStore>;
    expect(saved.scanner.token).toBe(store.scanner.token);
  });

  it("round-trips updates to disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "taptu-store-"));
    tempRoots.push(dir);
    const filePath = join(dir, "demo-store.json");

    const store = await ensureStoreFile(filePath);
    store.scanner.scansToday = 200;
    await saveStore(filePath, store);

    const loaded = await loadStore(filePath);
    expect(loaded.scanner.scansToday).toBe(200);
  });
});
