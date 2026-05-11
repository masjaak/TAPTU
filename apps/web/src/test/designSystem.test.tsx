import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home, Users } from "lucide-react";

import {
  AppShell,
  CategorySelect,
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

  it("CategorySelect renders trigger with selected label and closed state", () => {
    const groups = [
      { label: "Utama", options: [{ id: "izin", label: "Izin" }, { id: "cuti_tahunan", label: "Cuti Tahunan" }] }
    ];
    render(<CategorySelect label="Kategori" value="Izin" onChange={vi.fn()} groups={groups} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain("Izin");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("CategorySelect opens dropdown and shows all options and groups on click", () => {
    const groups = [
      { label: "Utama", options: [{ id: "izin", label: "Izin" }, { id: "cuti_tahunan", label: "Cuti Tahunan" }] },
      { label: "Cuti Khusus", options: [{ id: "cuti_menikah", label: "Cuti Menikah" }] }
    ];
    render(<CategorySelect label="Kategori" value="Izin" onChange={vi.fn()} groups={groups} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getByText("Cuti Tahunan")).toBeTruthy();
    expect(screen.getByText("Cuti Menikah")).toBeTruthy();
    expect(screen.getByText("Cuti Khusus")).toBeTruthy();
  });

  it("CategorySelect calls onChange and closes when option is clicked", () => {
    const handleChange = vi.fn();
    const groups = [
      { label: "Utama", options: [{ id: "izin", label: "Izin" }, { id: "cuti_tahunan", label: "Cuti Tahunan" }] }
    ];
    render(<CategorySelect label="Kategori" value="Izin" onChange={handleChange} groups={groups} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Cuti Tahunan" }));
    expect(handleChange).toHaveBeenCalledWith("Cuti Tahunan");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("CategorySelect closes on Escape key", () => {
    const groups = [{ label: "Utama", options: [{ id: "izin", label: "Izin" }] }];
    render(<CategorySelect label="Kategori" value="Izin" onChange={vi.fn()} groups={groups} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("CategorySelect marks selected option with aria-selected true", () => {
    const groups = [
      { label: "Utama", options: [{ id: "izin", label: "Izin" }, { id: "cuti_tahunan", label: "Cuti Tahunan" }] }
    ];
    render(<CategorySelect label="Kategori" value="Izin" onChange={vi.fn()} groups={groups} />);
    fireEvent.click(screen.getByRole("combobox"));
    const selectedOpt = screen.getByRole("option", { name: "Izin" });
    const unselectedOpt = screen.getByRole("option", { name: "Cuti Tahunan" });
    expect(selectedOpt.getAttribute("aria-selected")).toBe("true");
    expect(unselectedOpt.getAttribute("aria-selected")).toBe("false");
  });

  it("CategorySelect closes when clicking outside the trigger and listbox", () => {
    const groups = [{ label: "Utama", options: [{ id: "izin", label: "Izin" }] }];
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <CategorySelect label="Kategori" value="Izin" onChange={vi.fn()} groups={groups} />
      </div>
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("CategorySelect stays open when scroll event fires inside the listbox", () => {
    const groups = [
      { label: "Utama", options: Array.from({ length: 12 }, (_, i) => ({ id: `opt-${i}`, label: `Option ${i}` })) }
    ];
    render(<CategorySelect label="Kategori" value="Option 0" onChange={vi.fn()} groups={groups} />);
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeTruthy();
    fireEvent.scroll(listbox);
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("AppShell hides the burger button when bottom nav is active (employee with schedule/payslip)", () => {
    const { CalendarDays, Clock3, History, Home, TimerReset, UserRound, WalletCards } = require("lucide-react");
    const employeeNav = [
      { key: "home", label: "Beranda", icon: Home, path: "/app" },
      { key: "attendance", label: "Presensi", icon: Clock3, path: "/app/attendance" },
      { key: "history", label: "Riwayat", icon: History, path: "/app/history" },
      { key: "requests", label: "Pengajuan", icon: TimerReset, path: "/app/requests" },
      { key: "schedule", label: "Jadwal", icon: CalendarDays, path: "/app/schedule" },
      { key: "payslip", label: "Slip Gaji", icon: WalletCards, path: "/app/payslip" },
      { key: "profile", label: "Profil", icon: UserRound, path: "/app/profile" }
    ];
    render(
      <AppShell
        user={{ fullName: "Fikri Maulana", organizationName: "TAPTU HQ", roleLabel: "Employee" }}
        activeKey="home"
        navigation={employeeNav}
        onNavigate={vi.fn()}
      >
        <div>content</div>
      </AppShell>
    );
    expect(screen.getByRole("navigation", { name: /navigasi utama mobile/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /buka navigasi/i })).toBeNull();
  });

  it("AppShell shows burger button when bottom nav is not active (admin role)", () => {
    render(
      <AppShell
        user={{ fullName: "Nadia Putri", organizationName: "TAPTU HQ", roleLabel: "Admin HR" }}
        activeKey="home"
        navigation={[
          { key: "home", label: "Beranda", icon: Home, path: "/app" },
          { key: "team", label: "Tim", icon: Users, path: "/app/team" }
        ]}
        onNavigate={vi.fn()}
      >
        <div>content</div>
      </AppShell>
    );
    expect(screen.getByRole("button", { name: /buka navigasi/i })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: /navigasi utama mobile/i })).toBeNull();
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
