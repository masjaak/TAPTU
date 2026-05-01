import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { router as appRouter } from "../pages/router";

function renderAt(path: string) {
  const routes = appRouter.routes.map((route) => ({
    path: route.path,
    element: route.element
  }));
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe("login page", () => {
  afterEach(cleanup);

  it("shows Taptu brand identity", () => {
    renderAt("/login");
    expect(screen.getAllByText(/taptu/i).length).toBeGreaterThan(0);
  });

  it("has email and password inputs with accessible labels", () => {
    renderAt("/login");
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
  });

  it("shows demo account credentials panel", () => {
    renderAt("/login");
    expect(screen.getByTestId("demo-accounts-panel")).toBeTruthy();
  });

  it("has link to register superadmin account", () => {
    renderAt("/login");
    expect(screen.getByRole("link", { name: /daftarkan akun superadmin/i })).toBeTruthy();
  });

  it("has link back to landing page", () => {
    renderAt("/login");
    expect(screen.getByRole("link", { name: /kembali ke beranda/i })).toBeTruthy();
  });

  it("shows submit button", () => {
    renderAt("/login");
    expect(screen.getByRole("button", { name: /masuk/i })).toBeTruthy();
  });
});
