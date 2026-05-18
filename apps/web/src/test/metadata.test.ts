import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Support running from monorepo root or from apps/web/ directly
const cwd = process.cwd();
const webRoot = cwd.endsWith("apps/web") ? cwd : resolve(cwd, "apps/web");

const indexHtml = readFileSync(resolve(webRoot, "index.html"), "utf8");

describe("site metadata", () => {
  it("describes the current Taptu product positioning", () => {
    expect(indexHtml).toContain("<title>Taptu — Attendance Validation OS</title>");
    expect(indexHtml).toContain(
      'content="Validasi absensi tim dari check-in, scanner gate, lokasi, approval, struktur tim, hingga laporan HR."'
    );
  });

  it("provides Open Graph and Twitter card metadata", () => {
    expect(indexHtml).toContain('property="og:type" content="website"');
    expect(indexHtml).toContain('property="og:site_name" content="Taptu"');
    expect(indexHtml).toContain('property="og:title" content="Taptu — Attendance Validation OS"');
    expect(indexHtml).toContain('property="og:image" content="/taptu-opengraph.png"');
    expect(indexHtml).toContain('property="og:image:width" content="1200"');
    expect(indexHtml).toContain('property="og:image:height" content="630"');
    expect(indexHtml).toContain('property="og:image:alt" content="Taptu Attendance Validation OS preview"');
    expect(indexHtml).toContain('name="twitter:card" content="summary_large_image"');
    expect(indexHtml).toContain('name="twitter:image" content="/taptu-opengraph.png"');
  });

  it("ships the referenced OG image asset", () => {
    expect(existsSync(resolve(webRoot, "public/taptu-opengraph.png"))).toBe(true);
  });
});
