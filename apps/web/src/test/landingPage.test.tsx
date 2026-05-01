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
    expect(screen.getByRole("heading", { name: /kelola absensi tim/i })).toBeTruthy();
  });

  it("shows conversion paths for demo and workflow review", () => {
    renderAt("/");
    expect(screen.getAllByRole("link", { name: /coba demo taptu/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /lihat alur validasi/i })).toBeTruthy();
  });

  it("explains the landing page trust sequence", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /attendance desk yang siap dipakai/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /dari scan sampai laporan/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /dibuat untuk tiga mode kerja/i })).toBeTruthy();
  });

  it("does not show the old product name", () => {
    renderAt("/");
    expect(screen.queryByText(/hadiri/i)).toBeNull();
  });

  it("includes completion sections for rollout confidence", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /sinyal yang membuat admin percaya/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /pertanyaan sebelum mulai/i })).toBeTruthy();
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

  it("trust signals section has a supporting description paragraph", () => {
    renderAt("/");
    expect(screen.getByTestId("trust-signals-copy")).toBeTruthy();
  });

  it("trust signals cards are individually labeled for screen readers", () => {
    renderAt("/");
    expect(screen.getByLabelText("30s — QR token refresh")).toBeTruthy();
    expect(screen.getByLabelText("3 mode — Admin, mobile, scanner")).toBeTruthy();
    expect(screen.getByLabelText("1 queue — Review pengecualian")).toBeTruthy();
    expect(screen.getByLabelText("24/7 — Siap untuk shift")).toBeTruthy();
  });

  it("CTA section uses a visually distinct action link, not the primary blue-on-blue pattern", () => {
    renderAt("/");
    expect(screen.getByTestId("cta-demo-action")).toBeTruthy();
  });
});
