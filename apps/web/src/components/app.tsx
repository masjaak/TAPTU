import { clsx } from "clsx";
import { createPortal } from "react-dom";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Check, ChevronDown, Loader2, Menu, X } from "lucide-react";

export interface AppNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  description?: string;
  badge?: number;
}

export interface AppShellUser {
  fullName: string;
  organizationName: string;
  roleLabel: string;
}

export function AppShell({
  user,
  navigation,
  activeKey,
  onNavigate,
  children,
  actions
}: {
  user: AppShellUser;
  navigation: AppNavItem[];
  activeKey: string;
  onNavigate: (item: AppNavItem) => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeItem = navigation.find((item) => item.key === activeKey) ?? navigation[0];
  const mobilePrimaryKeys = ["home", "attendance", "history", "requests", "profile"];
  const hasEmployeeSelfService = navigation.some((item) => item.key === "schedule" || item.key === "payslip");
  const isManagerNav = navigation.some((item) => item.key === "exceptions") && !navigation.some((item) => item.key === "locations");
  const managerMobileKeys = ["home", "team", "requests", "exceptions", "profile"];
  const mobileNavigation = isManagerNav
    ? navigation.filter((item) => managerMobileKeys.includes(item.key))
    : hasEmployeeSelfService
      ? navigation.filter((item) => mobilePrimaryKeys.includes(item.key))
      : [];

  function handleNavigate(item: AppNavItem) {
    onNavigate(item);
    setDrawerOpen(false);
  }

  const navButtonClass = (key: string) =>
    clsx(
      "flex min-w-0 items-center gap-3 rounded-[18px] px-3 py-2 text-left text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]",
      activeKey === key
        ? "bg-[#111827] font-semibold text-white shadow-[0_10px_24px_rgba(20,24,31,0.14)]"
        : "text-[#596172] hover:bg-[#f0f4ff] hover:text-[#111827]"
    );

  return (
    <div className="min-h-screen bg-[#e9eaec] px-2 pb-24 pt-2 text-[#101217] sm:px-6 sm:py-4 lg:px-8" data-testid="app-shell" data-visual-language="landing-canvas">
      <main className="mx-auto flex max-w-7xl flex-col gap-4 overflow-hidden rounded-[22px] border border-white/70 bg-[#f9fafc] p-2 shadow-[0_24px_70px_rgba(20,24,31,0.14)] sm:rounded-[34px] sm:p-4 lg:grid lg:min-h-[calc(100vh-32px)] lg:grid-cols-[256px_1fr] lg:gap-5 lg:p-6">
        <header data-testid="mobile-app-header" className="flex items-center justify-between rounded-[20px] border border-[#edf0f5] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(20,24,31,0.07)] sm:px-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#111827] text-sm font-black text-white">T</span>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-[-0.02em] text-[#111827]">Taptu</p>
              <p className="truncate text-xs font-medium text-[#596172]">{activeItem?.label ?? "Workspace"}</p>
            </div>
          </div>
          {mobileNavigation.length === 0 ? (
            <button
              type="button"
              aria-label="Buka navigasi"
              onClick={() => setDrawerOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#d8dde7] bg-white text-[#111827] transition hover:bg-[#f8faff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]"
            >
              <Menu className="h-4 w-4" />
            </button>
          ) : null}
        </header>

        <aside data-testid="desktop-app-sidebar" className="hidden flex-col rounded-[28px] border border-[#edf0f5] bg-white p-4 shadow-[0_16px_42px_rgba(20,24,31,0.07)] lg:flex">
          <div className="flex items-center gap-3 px-1 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#111827] text-sm font-black text-white">T</span>
            <div>
              <p className="text-sm font-bold tracking-[-0.02em] text-[#111827]">Taptu</p>
              <p className="text-xs font-medium text-[#7a8495]">Attendance OS</p>
            </div>
          </div>

          <nav className="mt-5 grid gap-1" aria-label="Workspace navigation">
            {navigation.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigate(item)}
                className={navButtonClass(item.key)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 break-words text-left">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    data-testid={`nav-badge-${item.key}`}
                    className="ml-auto shrink-0 rounded-full bg-[#1769ff] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <div className="mt-5 rounded-[18px] border border-[#edf0f5] bg-[#f9fafc] p-3.5 lg:mt-auto">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8099c8]">{user.roleLabel}</p>
            <p className="mt-1.5 text-[13px] font-semibold text-[#111827]">{user.fullName}</p>
            <p className="mt-0.5 text-[12px] font-medium text-[#7a8495]">{user.organizationName}</p>
            {actions ? <div className="mt-3 grid gap-2">{actions}</div> : null}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-4 lg:gap-5">
          {children}
        </section>
      </main>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-[#101217]/45 p-3 lg:hidden" role="presentation">
          <div
            data-testid="mobile-nav-drawer"
            className="ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto rounded-[24px] border border-[#edf0f5] bg-white p-3 shadow-[0_34px_90px_rgba(20,24,31,0.24)] sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi workspace"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#111827] text-sm font-black text-white">T</span>
                <div>
                  <p className="text-sm font-bold tracking-[-0.02em] text-[#111827]">Taptu</p>
                  <p className="text-xs font-medium text-[#596172]">{user.organizationName}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup navigasi"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[#d8dde7] bg-white text-[#111827] transition hover:bg-[#f8faff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-5 grid gap-1" aria-label="Mobile workspace navigation">
              {navigation.map((item) => (
                <button key={item.key} type="button" onClick={() => handleNavigate(item)} className={navButtonClass(item.key)}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 break-words text-left">{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-auto shrink-0 rounded-full bg-[#1769ff] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-[18px] border border-[#edf0f5] bg-[#f9fafc] p-3.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8099c8]">{user.roleLabel}</p>
              <p className="mt-1.5 text-[13px] font-semibold text-[#111827]">{user.fullName}</p>
              <p className="mt-0.5 text-[12px] font-medium text-[#7a8495]">{user.organizationName}</p>
              {actions ? <div className="mt-3 grid gap-2">{actions}</div> : null}
            </div>
          </div>
        </div>
      ) : null}

      {mobileNavigation.length > 0 ? (
        <nav
          aria-label="Navigasi utama mobile"
          className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 gap-1 rounded-[24px] border border-[#edf0f5] bg-white/95 p-2 shadow-[0_18px_50px_rgba(20,24,31,0.18)] backdrop-blur lg:hidden"
        >
          {mobileNavigation.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-label={`Mobile ${item.label}`}
              aria-current={activeKey === item.key ? "page" : undefined}
              onClick={() => handleNavigate(item)}
              className={clsx(
                "grid min-h-13 min-w-0 place-items-center gap-1 rounded-[18px] px-1 py-2 text-[10px] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]",
                activeKey === item.key ? "bg-[#111827] text-white" : "text-[#667085] hover:bg-[#f1f5ff] hover:text-[#111827]"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="rounded-[22px] border border-[#edf0f5] bg-white p-4 shadow-[0_16px_42px_rgba(20,24,31,0.07)] sm:rounded-[28px] sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="break-words text-[11px] font-medium uppercase tracking-[0.10em] text-[#8099c8]">{eyebrow}</p>
          <h1 className="mt-1.5 break-words text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[#101217] sm:mt-2 sm:text-[26px] sm:tracking-[-0.03em] lg:text-[24px]">{title}</h1>
          {description ? <p className="mt-1.5 max-w-2xl break-words text-[13px] leading-6 text-[#596172] sm:mt-2">{description}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Panel({ eyebrow, title, children, className }: { eyebrow?: string; title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("min-w-0 rounded-[22px] border border-[#edf0f5] bg-white p-4 shadow-[0_16px_42px_rgba(20,24,31,0.07)] sm:rounded-[28px] sm:p-5", className)}>
      {eyebrow ? <p className="break-words text-[11px] font-medium uppercase tracking-[0.08em] text-[#8099c8]">{eyebrow}</p> : null}
      {title ? <h2 className="mt-1.5 break-words text-[15px] font-semibold tracking-[-0.01em] text-[#101217] sm:text-[16px]">{title}</h2> : null}
      <div className={title || eyebrow ? "mt-4 min-w-0" : "min-w-0"}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="min-w-0 rounded-[20px] border border-[#edf0f5] bg-[#f9fafc] p-4 sm:rounded-[22px]">
      <p className="break-words text-[11px] font-medium uppercase tracking-[0.08em] text-[#7a8495]">{label}</p>
      <p className="mt-2 break-words tabular-nums text-[20px] font-bold tracking-[-0.01em] text-[#111827] lg:text-[18px]">{value}</p>
      {detail ? <p className="mt-1 break-words text-[12px] leading-5 text-[#667085]">{detail}</p> : null}
    </article>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "neutral" | "info" }) {
  return (
    <span
      className={clsx("inline-flex max-w-full shrink-0 items-center rounded-full px-2.5 py-1 text-left text-[11px] font-semibold tracking-[0.04em]", {
        "bg-[#edf4ff] text-[#174ea6]": tone === "success",
        "bg-[#fff3dc] text-[#92600a]": tone === "warning",
        "bg-[#fff2ee] text-[#a54c2f]": tone === "danger",
        "bg-[#f1f5ff] text-[#1769ff]": tone === "info",
        "bg-[#eff3f7] text-[#596172]": tone === "neutral"
      })}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#1769ff] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[0_16px_34px_rgba(23,105,255,0.22)] transition hover:bg-[#0d5be8] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff] sm:px-5",
        className
      )}
      {...props}
    />
  );
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#d8dde7] bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#111827] transition hover:border-[#b9c2d3] hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff] sm:px-5",
        className
      )}
      {...props}
    />
  );
}

export function FormInput({
  label,
  id,
  className,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#596172]">{label}</span>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={clsx(
          "w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-4 py-2.5 text-[13px] text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10",
          error ? "border-[#e7b4b4] bg-[#fffafa]" : undefined,
          className
        )}
        {...props}
      />
      {error ? <p id={`${inputId}-error`} className="mt-1.5 text-xs font-semibold text-[#a54c2f]">{error}</p> : null}
      {!error && hint ? <p id={`${inputId}-hint`} className="mt-1.5 text-xs leading-5 text-[#667085]">{hint}</p> : null}
    </label>
  );
}

export function SelectInput({
  label,
  id,
  className,
  children,
  error,
  hint,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode; error?: string; hint?: string }) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <label htmlFor={selectId} className="block">
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#596172]">{label}</span>
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={clsx(
          "w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-4 py-2.5 text-[13px] text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10",
          error ? "border-[#e7b4b4] bg-[#fffafa]" : undefined,
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <p id={`${selectId}-error`} className="mt-1.5 text-xs font-semibold text-[#a54c2f]">{error}</p> : null}
      {!error && hint ? <p id={`${selectId}-hint`} className="mt-1.5 text-xs leading-5 text-[#667085]">{hint}</p> : null}
    </label>
  );
}

export interface CategorySelectOption {
  id: string;
  label: string;
}

export interface CategorySelectGroup {
  label: string;
  options: CategorySelectOption[];
}

export function CategorySelect({
  label,
  value,
  onChange,
  groups,
  error,
  hint
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  groups: CategorySelectGroup[];
  error?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    groups.flatMap((g) => g.options).find((o) => o.label === value || o.id === value)?.label ?? value;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    }

    function handleScroll(e: Event) {
      if (listRef.current?.contains(e.target as Node)) return;
      close();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, close]);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(true);
  }

  function handleSelect(optionLabel: string) {
    onChange(optionLabel);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const inputId = label.toLowerCase().replace(/\s+/g, "-");
  const listboxId = `${inputId}-listbox`;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  const dropdownStyle: React.CSSProperties = triggerRect
    ? {
        position: "fixed",
        top: `${triggerRect.bottom + 4}px`,
        left: `${triggerRect.left}px`,
        width: `${triggerRect.width}px`,
        maxHeight: "300px",
        zIndex: 9999,
        overflowY: "auto"
      }
    : { position: "fixed", top: "0", left: "0", width: "0", maxHeight: "300px", zIndex: 9999 };

  return (
    <div className="block">
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.05em] text-[#596172]">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onClick={handleToggle}
        className={clsx(
          "flex w-full items-center justify-between rounded-2xl border bg-[#f9fafc] px-4 py-2.5 text-left text-[13px] text-[#111827] outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]",
          open
            ? "border-[#1769ff] bg-white ring-2 ring-[#1769ff]/10"
            : error
              ? "border-[#e7b4b4] bg-[#fffafa]"
              : "border-[#e2e7f0] hover:border-[#c8d0e0] hover:bg-white"
        )}
      >
        <span className="min-w-0 truncate font-medium">{selectedLabel}</span>
        <ChevronDown
          className={clsx(
            "ml-2 h-4 w-4 shrink-0 text-[#667085] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            style={dropdownStyle}
            className="rounded-2xl border border-[#e2e7f0] bg-white shadow-[0_8px_32px_rgba(20,24,31,0.14)]"
          >
            {groups.map((group) => (
              <div key={group.label} role="group" aria-label={group.label}>
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9aa3b2]">
                  {group.label}
                </p>
                {group.options.map((option) => {
                  const isSelected = option.label === value || option.id === value;
                  return (
                    <div
                      key={option.id}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onMouseDown={() => handleSelect(option.label)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelect(option.label);
                        }
                      }}
                      className={clsx(
                        "flex cursor-pointer items-center justify-between px-4 py-2 text-[13px] transition",
                        isSelected
                          ? "bg-[#edf4ff] font-semibold text-[#1769ff]"
                          : "font-medium text-[#111827] hover:bg-[#f4f7ff]"
                      )}
                    >
                      <span>{option.label}</span>
                      {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#1769ff]" /> : null}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="h-2" />
          </div>,
          document.body
        )}

      {error ? <p id={`${inputId}-error`} className="mt-1.5 text-xs font-semibold text-[#a54c2f]">{error}</p> : null}
      {!error && hint ? <p id={`${inputId}-hint`} className="mt-1.5 text-xs leading-5 text-[#667085]">{hint}</p> : null}
    </div>
  );
}

export interface FilterSelectOption {
  value: string;
  label: string;
}

export function FilterSelect({
  ariaLabel,
  value,
  onChange,
  options
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "";

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    }

    function handleScroll(e: Event) {
      if (listRef.current?.contains(e.target as Node)) return;
      close();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, close]);

  function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(true);
  }

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const listboxId = `filter-select-${ariaLabel.toLowerCase().replace(/\s+/g, "-")}-listbox`;

  const dropdownStyle: React.CSSProperties = triggerRect
    ? {
        position: "fixed",
        top: `${triggerRect.bottom + 4}px`,
        left: `${triggerRect.left}px`,
        width: `${Math.max(triggerRect.width, 160)}px`,
        maxHeight: "260px",
        zIndex: 9999,
        overflowY: "auto"
      }
    : { position: "fixed", top: "0", left: "0", width: "0", maxHeight: "260px", zIndex: 9999 };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={handleToggle}
        className={clsx(
          "flex w-full items-center justify-between rounded-2xl border bg-white py-2.5 pl-3 pr-3 text-left text-sm text-[#111827] outline-none transition",
          open
            ? "border-[#1769ff] ring-2 ring-[#1769ff]/10"
            : "border-[#e2e7f0] hover:border-[#c8d0e0]"
        )}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown
          className={clsx(
            "ml-2 h-4 w-4 shrink-0 text-[#667085] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            style={dropdownStyle}
            className="rounded-2xl border border-[#e2e7f0] bg-white shadow-[0_8px_32px_rgba(20,24,31,0.14)]"
          >
            <div className="py-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onMouseDown={() => handleSelect(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect(option.value);
                      }
                    }}
                    className={clsx(
                      "flex cursor-pointer items-center justify-between px-3.5 py-2 text-sm transition",
                      isSelected
                        ? "bg-[#edf4ff] font-semibold text-[#1769ff]"
                        : "font-medium text-[#111827] hover:bg-[#f4f7ff]"
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#1769ff]" /> : null}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export function DataTable({
  caption,
  columns,
  rows
}: {
  caption: string;
  columns: Array<{ key: string; header: string }>;
  rows: Array<Record<string, ReactNode> & { id: string | number }>;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[20px] border border-[#edf0f5] sm:rounded-[24px]">
      <div className="overflow-x-auto">
        <table className="min-w-[680px] divide-y divide-[#edf0f5] bg-white sm:min-w-full">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-[#f9fafc]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#667085]">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f5]">
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className="max-w-[240px] break-words px-3 py-3.5 text-sm text-[#111827] sm:px-4">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[#d8dde7] bg-[#f9fafc] px-4 py-4 text-center" role="status">
      <p className="break-words text-[12px] font-semibold text-[#596172]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-5 text-[#9aa3b2]">{description}</p>
    </div>
  );
}

export function LoadingState({ label = "Memuat data" }: { label?: string }) {
  return (
    <div className="rounded-[24px] border border-[#edf0f5] bg-white p-4" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 text-sm font-medium text-[#596172]">
        <Loader2 className="h-4 w-4 animate-spin text-[#1769ff]" />
        {label}
      </div>
      <div className="mt-4 grid gap-3">
        <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-[#edf0f5]" />
        <div className="h-2.5 w-full animate-pulse rounded-full bg-[#f1f5ff]" />
        <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-[#edf0f5]" />
      </div>
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[24px] border border-[#f2caca] bg-[#fff5f5] p-4" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#a54c2f]" />
      <div>
        <p className="text-sm font-bold text-[#8a2f2f]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[#a54c2f]">{description}</p>
      </div>
    </div>
  );
}

export function Dialog({
  title,
  open,
  children,
  onClose,
  closeDisabled = false,
  closeDisabledReason
}: {
  title: string;
  open: boolean;
  children: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  closeDisabledReason?: string;
}) {
  if (!open) {
    return null;
  }

  const titleId = `dialog-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#101217]/45 px-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="w-full max-w-lg rounded-[24px] border border-[#edf0f5] bg-white p-4 shadow-[0_34px_90px_rgba(20,24,31,0.24)] sm:rounded-[30px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="break-words text-lg font-bold tracking-[-0.01em] text-[#111827] sm:text-xl">{title}</h2>
          <SecondaryButton
            onClick={onClose}
            aria-label={`Tutup dialog ${title}`}
            disabled={closeDisabled}
            title={closeDisabled ? closeDisabledReason : undefined}
          >
            Tutup
          </SecondaryButton>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
