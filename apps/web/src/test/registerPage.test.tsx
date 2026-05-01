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

describe("register page", () => {
  afterEach(cleanup);

  it("shows superadmin role badge", () => {
    renderAt("/register");
    expect(screen.getByTestId("role-badge-superadmin")).toBeTruthy();
  });

  it("has all required registration fields with accessible labels", () => {
    renderAt("/register");
    expect(screen.getByLabelText(/nama organisasi/i)).toBeTruthy();
    expect(screen.getByLabelText(/nama lengkap/i)).toBeTruthy();
    expect(screen.getByLabelText(/^email$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
    expect(screen.getByLabelText(/konfirmasi password/i)).toBeTruthy();
  });

  it("has a submit button", () => {
    renderAt("/register");
    expect(screen.getByRole("button", { name: /buat akun/i })).toBeTruthy();
  });

  it("has link back to login", () => {
    renderAt("/register");
    expect(screen.getByRole("link", { name: /masuk/i })).toBeTruthy();
  });

  it("has link back to landing page", () => {
    renderAt("/register");
    expect(screen.getByRole("link", { name: /kembali ke beranda/i })).toBeTruthy();
  });
});
