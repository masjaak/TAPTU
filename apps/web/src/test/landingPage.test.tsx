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
});
