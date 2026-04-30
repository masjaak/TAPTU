import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";

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
  it("shows the main Hadiri heading", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /satu sistem absensi/i })).toBeTruthy();
  });

  it("shows the login call to action", () => {
    renderAt("/");
    expect(screen.getAllByRole("button", { name: /masuk ke aplikasi/i }).length).toBeGreaterThan(0);
  });
});
