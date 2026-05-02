import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home, Users } from "lucide-react";

import {
  AppShell,
  DataTable,
  EmptyState,
  ErrorState,
  FormInput,
  LoadingState,
  PageHeader,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  StatCard,
  StatusBadge
} from "../components/app";

describe("post-login design system", () => {
  afterEach(cleanup);

  it("renders the app shell with the landing-style canvas and role navigation", () => {
    render(
      <AppShell
        user={{
          fullName: "Nadia Putri",
          organizationName: "TAPTU HQ",
          roleLabel: "Admin HR"
        }}
        activeKey="home"
        navigation={[
          { key: "home", label: "Beranda", icon: Home, path: "/app" },
          { key: "team", label: "Tim", icon: Users, path: "/app/team" }
        ]}
        onNavigate={vi.fn()}
      >
        <PageHeader eyebrow="Workspace" title="Operasional hari ini" description="Ringkasan validasi absensi." />
      </AppShell>
    );

    expect(screen.getByTestId("app-shell").getAttribute("data-visual-language")).toBe("landing-canvas");
    expect(screen.getByRole("button", { name: /beranda/i })).toBeTruthy();
    expect(screen.getByText(/admin hr/i)).toBeTruthy();
  });

  it("uses a compact mobile header and drawer instead of exposing the desktop sidebar first", () => {
    render(
      <AppShell
        user={{
          fullName: "Nadia Putri",
          organizationName: "TAPTU HQ",
          roleLabel: "Admin HR"
        }}
        activeKey="home"
        navigation={[
          { key: "home", label: "Beranda", icon: Home, path: "/app" },
          { key: "team", label: "Tim", icon: Users, path: "/app/team" }
        ]}
        onNavigate={vi.fn()}
        actions={<SecondaryButton>Keluar</SecondaryButton>}
      >
        <PageHeader eyebrow="Workspace" title="Operasional hari ini" />
      </AppShell>
    );

    expect(screen.getByTestId("mobile-app-header")).toBeTruthy();
    expect(screen.getByTestId("desktop-app-sidebar").className).toContain("hidden");
    expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /buka navigasi/i }));

    const drawer = screen.getByTestId("mobile-nav-drawer");
    expect(drawer).toBeTruthy();
    expect(within(drawer).getByRole("button", { name: /tim/i })).toBeTruthy();
    expect(within(drawer).getByText("Nadia Putri")).toBeTruthy();
  });

  it("renders shared cards, badges, buttons, form controls, and states", () => {
    render(
      <Panel eyebrow="Panel" title="Validasi">
        <StatCard label="Hadir" value="91%" detail="Hari ini" />
        <StatusBadge tone="success">Aktif</StatusBadge>
        <PrimaryButton>Clock in</PrimaryButton>
        <SecondaryButton>Detail</SecondaryButton>
        <FormInput label="Nama" value="" onChange={() => undefined} />
        <SelectInput label="Role" value="employee" onChange={() => undefined}>
          <option value="employee">Employee</option>
        </SelectInput>
        <DataTable
          caption="Attendance data"
          columns={[
            { key: "name", header: "Nama" },
            { key: "status", header: "Status" }
          ]}
          rows={[{ id: "1", name: "Fikri", status: "Tepat waktu" }]}
        />
        <EmptyState title="Belum ada data" description="Data akan muncul setelah sinkron." />
        <LoadingState label="Memuat data" />
        <ErrorState title="Gagal memuat" description="Coba lagi nanti." />
      </Panel>
    );

    expect(screen.getByText("91%")).toBeTruthy();
    expect(screen.getByText("Aktif")).toBeTruthy();
    expect(screen.getByLabelText("Nama")).toBeTruthy();
    expect(screen.getByLabelText("Role")).toBeTruthy();
    expect(screen.getByRole("table", { name: /attendance data/i })).toBeTruthy();
    expect(screen.getByText("Belum ada data")).toBeTruthy();
    expect(screen.getByText("Memuat data")).toBeTruthy();
    expect(screen.getByText("Gagal memuat")).toBeTruthy();
  });

  it("does not keep old dashboard theme traces in active post-login source", () => {
    const files = [
      "apps/web/src/pages/AppPage.tsx",
      "apps/web/src/components/app.tsx",
      "apps/web/src/components/StatusPill.tsx",
      "apps/web/tailwind.config.js"
    ];
    const source = files.map((file) => readFileSync(resolve(process.cwd(), "..", "..", file), "utf8")).join("\n");

    const oldTokenPattern = new RegExp(
      [
        "mo" + "ss",
        "mi" + "st",
        "sa" + "nd",
        "clo" + "ud",
        "ste" + "el",
        "shadow-" + "panel",
        "text-" + "ink",
        "bg-" + "ink",
        "focus:border-" + "mo" + "ss"
      ].join("|")
    );
    const unrelatedHuePattern = new RegExp(["emer" + "ald", "te" + "al", "li" + "me"].join("|"));
    const oldColorPattern = new RegExp(
      [
        "#" + "2d5246",
        "#" + "10211c",
        "#" + "12261f",
        "#" + "173229",
        "#" + "97d7be",
        "#" + "11703d",
        "#" + "e9f7ef",
        "#" + "dae5db",
        "#" + "dfe6de",
        "#" + "e4ebe4",
        "#" + "fbfcf8",
        "#" + "fbfcfa"
      ].join("|")
    );

    expect(source).not.toMatch(oldTokenPattern);
    expect(source).not.toMatch(unrelatedHuePattern);
    expect(source).not.toMatch(oldColorPattern);
  });
});
