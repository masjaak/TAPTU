import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { DemoStore } from "./domain";
import { createInitialStore } from "./domain";

export async function ensureStoreFile(filePath: string): Promise<DemoStore> {
  try {
    return await loadStore(filePath);
  } catch {
    const initial = createInitialStore();
    await saveStore(filePath, initial);
    return initial;
  }
}

export async function loadStore(filePath: string): Promise<DemoStore> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as DemoStore;
}

export async function saveStore(filePath: string, store: DemoStore): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2), "utf8");
}
