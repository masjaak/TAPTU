import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

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
    expect(screen.getByRole("heading", { name: /dari check-in sampai laporan/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /ruang kerja berbeda untuk tiap peran/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /approval mengikuti struktur tim/i })).toBeTruthy();
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

  it("answers the updated workflow questions", () => {
    renderAt("/");
    expect(screen.getByText(/apa yang bisa dicoba di demo/i)).toBeTruthy();
    expect(screen.getByText(/apakah hr bisa mengatur divisi/i)).toBeTruthy();
    expect(screen.getByText(/apakah pengajuan langsung disetujui hr/i)).toBeTruthy();
    expect(screen.getByText(/apakah data absensi langsung masuk laporan/i)).toBeTruthy();
    expect(screen.getByText(/apa yang perlu disiapkan sebelum produksi/i)).toBeTruthy();
  });

  it("CTA section uses a visually distinct action link, not the primary blue-on-blue pattern", () => {
    renderAt("/");
    expect(screen.getByTestId("cta-demo-action")).toBeTruthy();
  });

  it("CTA section has supporting sub-copy to reduce hesitation", () => {
    renderAt("/");
    expect(screen.getByTestId("cta-sub-copy")).toBeTruthy();
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
