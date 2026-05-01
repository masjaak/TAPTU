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

  it("positions Taptu as the attendance command center", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /absensi rapi tanpa chat berantakan/i })).toBeTruthy();
  });

  it("shows conversion paths for demo and workflow review", () => {
    renderAt("/");
    expect(screen.getAllByRole("link", { name: /coba demo taptu/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /lihat cara kerja/i })).toBeTruthy();
  });

  it("explains the landing page trust sequence", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /dibangun untuk keputusan operasional/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /alur yang jelas sebelum tim masuk/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /siap dipakai oleh tiga peran/i })).toBeTruthy();
  });

  it("does not show the old product name", () => {
    renderAt("/");
    expect(screen.queryByText(/hadiri/i)).toBeNull();
  });
});
