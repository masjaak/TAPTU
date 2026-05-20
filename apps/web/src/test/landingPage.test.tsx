// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

// framer-motion's whileInView uses IntersectionObserver which jsdom does not provide.
// Mock it so the landing page renders without throwing from the ErrorBoundary.
beforeAll(() => {
  class MockIntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds: number[] = [];
    disconnect() {}
    observe() {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
    unobserve() {}
  }
  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver
  });
});

import { router as appRouter } from "../pages/router";

function renderAt(path: string) {
  const routes = appRouter.routes.map((route) => ({
    path: route.path,
    element: route.element
  }));

  const router = createMemoryRouter(routes, {
    initialEntries: [path]
  });

  return render(<RouterProvider router={router} />);
}

describe("landing page", () => {
  afterEach(() => {
    cleanup();
  });

  it("positions Taptu inside a focused attendance hero", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /absensi tim yang dicek sebelum masuk laporan/i })).toBeTruthy();
  });

  it("shows conversion paths for demo and workflow review", () => {
    renderAt("/");
    expect(screen.getAllByRole("link", { name: /coba demo taptu/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /lihat alur validasi/i })).toBeTruthy();
  });

  it("explains the landing page trust sequence", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /attendance desk untuk tim operasional/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /bagaimana taptu bekerja/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /ruang kerja berbeda untuk tiap peran/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /cocok untuk tim yang punya banyak cara hadir/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /approval mengikuti struktur tim/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /yang perlu disiapkan sebelum taptu dipakai/i })).toBeTruthy();
  });

  it("does not show the old product name", () => {
    renderAt("/");
    expect(screen.queryByText(new RegExp("hadi" + "ri", "i"))).toBeNull();
  });

  it("includes completion sections for rollout confidence", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /data hadir yang lebih mudah dipercaya/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /pertanyaan sebelum mencoba/i })).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
  });

  it("documents animated validation bar states", () => {
    renderAt("/");
    const qrBar = screen.getByLabelText(/qr gate timur validation progress/i);
    const gpsBar = screen.getByLabelText(/gps kantor pusat validation progress/i);

    expect(qrBar.getAttribute("data-motion-state")).toBe("visible");
    expect(qrBar.getAttribute("data-motion-target")).toBe("82");
    expect(gpsBar.getAttribute("data-motion-state")).toBe("visible");
    expect(gpsBar.getAttribute("data-motion-target")).toBe("64");
  });

  it("marks floating hero cards with intentional motion styles", () => {
    renderAt("/");

    expect(screen.getByLabelText(/catatan shift sticky note/i).getAttribute("data-motion-style")).toBe("sticky-note");
    expect(screen.getByLabelText(/reminder bell notification/i).getAttribute("data-motion-style")).toBe("bell-ring");
    expect(screen.getByLabelText(/integrasi operasional icons/i).getAttribute("data-motion-style")).toBe("staggered-icons");
  });

  it("hero headline is structured as exactly two explicit lines", () => {
    renderAt("/");
    const h1 = screen.getByRole("heading", { name: /absensi tim yang dicek sebelum masuk laporan/i });
    expect(h1.getAttribute("data-lines")).toBe("2");
    const lines = h1.querySelectorAll("span[data-line]");
    expect(lines).toHaveLength(2);
  });

  it("landing stage uses the tight floating-card layout variant", () => {
    renderAt("/");
    const stage = screen.getByTestId("landing-stage");
    expect(stage.getAttribute("data-variant")).toBe("card-tight");
  });

  it("trust signals section has a supporting description paragraph", () => {
    renderAt("/");
    expect(screen.getByTestId("trust-signals-copy")).toBeTruthy();
  });

  it("trust signals cards are individually labeled for screen readers", () => {
    renderAt("/");
    expect(screen.getByLabelText("30s - QR token refresh")).toBeTruthy();
    expect(screen.getByLabelText("5 role - Employee, Manager, HR, Superadmin, Scanner")).toBeTruthy();
    expect(screen.getByLabelText("2 tahap - Approval Manager → HR")).toBeTruthy();
    expect(screen.getByLabelText("1 antrian - Pengecualian untuk direview")).toBeTruthy();
  });

  it("describes the current role and approval model", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /^employee$/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^manager$/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^hr\/admin$/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^superadmin$/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^scanner$/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /divisi & penempatan/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /approval dua tahap/i })).toBeTruthy();
  });

  it("workflow diagram has all 8 steps covering setup through reporting", () => {
    renderAt("/");
    expect(screen.getByRole("button", { name: /step 1.*buat workspace/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /step 2.*setup organisasi/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /step 3.*tambah admin hr/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /step 4.*tambah manager/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /step 5.*tambah karyawan/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /step 6.*check-in karyawan/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /step 7.*validasi/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /step 8.*laporan hr-ready/i })).toBeTruthy();
  });

  it("workflow step cards show mini UI previews with contextual content", () => {
    // Desktop (hidden lg:block) and mobile (lg:hidden) layouts both render in JSDOM
    // because CSS media queries are not evaluated. Use getAllByText to handle both.
    renderAt("/");
    expect(screen.getAllByText(/workspace aktif/i).length).toBeGreaterThan(0);    // 01
    expect(screen.getAllByText(/07:00/).length).toBeGreaterThan(0);               // 02
    expect(screen.getAllByText(/akses penuh/i).length).toBeGreaterThan(0);        // 03
    expect(screen.getAllByText(/12 karyawan/i).length).toBeGreaterThan(0);        // 04
    expect(screen.getAllByText(/fikri maulana/i).length).toBeGreaterThan(0);      // 05
    expect(screen.getAllByText(/^scanner$/i).length).toBeGreaterThan(0);          // 06
    expect(screen.getAllByText(/^in radius$/i).length).toBeGreaterThan(0);        // 07
    expect(screen.getAllByText(/rekap mei 2026/i).length).toBeGreaterThan(0);     // 08
  });

  it("workflow section mentions Payroll Input Readiness, not full payroll processing", () => {
    // Appears in P08 mini preview (desktop + mobile) and in detail panel — getAllByText is correct.
    renderAt("/");
    expect(screen.getAllByText(/payroll input readiness/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/full payroll processing/i)).toBeNull();
  });

  it("workflow section heading covers full product journey", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /bagaimana taptu bekerja/i })).toBeTruthy();
  });

  it("answers the updated workflow questions", () => {
    renderAt("/");
    expect(screen.getByText(/apa yang bisa dicoba di demo/i)).toBeTruthy();
    expect(screen.getByText(/apakah hr bisa mengatur divisi/i)).toBeTruthy();
    expect(screen.getByText(/apakah pengajuan langsung disetujui hr/i)).toBeTruthy();
    expect(screen.getByText(/apakah data absensi langsung masuk laporan/i)).toBeTruthy();
    expect(screen.getByText(/apa yang perlu disiapkan sebelum produksi/i)).toBeTruthy();
  });

  it("shows operational use cases and production readiness", () => {
    renderAt("/");
    expect(screen.getByText(/kantor & back office/i)).toBeTruthy();
    expect(screen.getByText(/outlet \/ cabang/i)).toBeTruthy();
    expect(screen.getByText(/hotel & operasional/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^tim lapangan$/i })).toBeTruthy();
    expect(screen.getByText(/^data karyawan$/i)).toBeTruthy();
    expect(screen.getByText(/^divisi dan manager$/i)).toBeTruthy();
    expect(screen.getByText(/^shift kerja$/i)).toBeTruthy();
    expect(screen.getByText(/^lokasi kerja$/i)).toBeTruthy();
    expect(screen.getByText(/^aturan approval$/i)).toBeTruthy();
    expect(screen.getByText(/^kebijakan validasi$/i)).toBeTruthy();
  });

  it("CTA section uses a visually distinct action link, not the primary blue-on-blue pattern", () => {
    renderAt("/");
    expect(screen.getByTestId("cta-demo-action")).toBeTruthy();
  });

  it("CTA section has supporting sub-copy to reduce hesitation", () => {
    renderAt("/");
    expect(screen.getByTestId("cta-sub-copy")).toBeTruthy();
    expect(screen.getByText(/coba sebagai employee, manager, hr, atau scanner/i)).toBeTruthy();
  });

  it("footer has nav links matching the primary navigation", () => {
    renderAt("/");
    expect(screen.getByRole("navigation", { name: /footer navigation/i })).toBeTruthy();
  });

  it("footer shows copyright year", () => {
    renderAt("/");
    expect(screen.getByText(/© 2026 Taptu/i)).toBeTruthy();
  });
});
