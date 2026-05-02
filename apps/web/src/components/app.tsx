import { clsx } from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Loader2 } from "lucide-react";

export interface AppNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  description?: string;
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
  return (
    <div className="min-h-screen bg-[#e9eaec] px-4 py-4 text-[#101217] sm:px-6 lg:px-8" data-testid="app-shell" data-visual-language="landing-canvas">
      <main className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl gap-4 overflow-hidden rounded-[34px] border border-white/70 bg-[#f9fafc] p-4 shadow-[0_34px_90px_rgba(20,24,31,0.16)] lg:grid-cols-[260px_1fr] lg:p-6">
        <aside className="flex flex-col rounded-[28px] border border-[#edf0f5] bg-white p-4 shadow-[0_16px_42px_rgba(20,24,31,0.07)]">
          <div className="flex items-center gap-3 px-1 py-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#111827] text-sm font-black text-white">T</span>
            <div>
              <p className="text-sm font-black tracking-[-0.02em] text-[#111827]">Taptu</p>
              <p className="text-xs font-semibold text-[#7a8495]">Attendance OS</p>
            </div>
          </div>

          <nav className="mt-6 grid gap-2" aria-label="Workspace navigation">
            {navigation.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item)}
                className={clsx(
                  "flex items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]",
                  activeKey === item.key
                    ? "bg-[#111827] text-white shadow-[0_14px_30px_rgba(20,24,31,0.16)]"
                    : "text-[#596172] hover:bg-[#f0f4ff] hover:text-[#111827]"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-[22px] border border-[#edf0f5] bg-[#f9fafc] p-4 lg:mt-auto">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1769ff]">{user.roleLabel}</p>
            <p className="mt-2 text-sm font-black text-[#111827]">{user.fullName}</p>
            <p className="mt-1 text-xs font-semibold text-[#7a8495]">{user.organizationName}</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          {actions ? (
            <div className="flex justify-end">
              {actions}
            </div>
          ) : null}
          {children}
        </section>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="rounded-[28px] border border-[#edf0f5] bg-white p-5 shadow-[0_16px_42px_rgba(20,24,31,0.07)] sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1769ff]">{eyebrow}</p>
          <h1 className="mt-3 text-2xl font-black leading-tight tracking-[-0.03em] text-[#101217] sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-base leading-7 text-[#596172]">{description}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Panel({ eyebrow, title, children, className }: { eyebrow?: string; title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-[30px] border border-[#edf0f5] bg-white p-5 shadow-[0_16px_42px_rgba(20,24,31,0.07)] sm:p-6", className)}>
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1769ff]">{eyebrow}</p> : null}
      {title ? <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#101217]">{title}</h2> : null}
      <div className={title || eyebrow ? "mt-5" : undefined}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-[26px] border border-[#edf0f5] bg-[#f9fafc] p-5">
      <p className="text-sm font-bold text-[#596172]">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-[-0.04em] text-[#111827]">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-[#667085]">{detail}</p> : null}
    </article>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "neutral" | "info" }) {
  return (
    <span
      className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]", {
        "bg-[#e9f7ef] text-[#11703d]": tone === "success",
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
        "inline-flex items-center justify-center rounded-2xl bg-[#1769ff] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(23,105,255,0.22)] transition hover:bg-[#0d5be8] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]",
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
        "inline-flex items-center justify-center rounded-2xl border border-[#d8dde7] bg-white px-5 py-3 text-sm font-bold text-[#111827] transition hover:border-[#b9c2d3] hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]",
        className
      )}
      {...props}
    />
  );
}

export function FormInput({ label, id, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-2 block text-sm font-bold text-[#111827]">{label}</span>
      <input
        id={inputId}
        className={clsx(
          "w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-5 py-4 text-base text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function SelectInput({ label, id, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={selectId} className="block">
      <span className="mb-2 block text-sm font-bold text-[#111827]">{label}</span>
      <select
        id={selectId}
        className={clsx(
          "w-full rounded-2xl border border-[#e2e7f0] bg-[#f9fafc] px-5 py-4 text-base text-[#111827] outline-none transition focus:border-[#1769ff] focus:bg-white focus:ring-2 focus:ring-[#1769ff]/10",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
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
    <div className="overflow-hidden rounded-[24px] border border-[#edf0f5]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#edf0f5] bg-white">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-[#f9fafc]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-[#667085]">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f5]">
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 text-sm font-semibold text-[#111827]">
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
    <div className="rounded-[24px] border border-dashed border-[#d8dde7] bg-[#f9fafc] px-5 py-8 text-center">
      <p className="text-base font-black text-[#111827]">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#596172]">{description}</p>
    </div>
  );
}

export function LoadingState({ label = "Memuat data" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-[#edf0f5] bg-white p-4 text-sm font-bold text-[#596172]">
      <Loader2 className="h-4 w-4 animate-spin text-[#1769ff]" />
      {label}
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[24px] border border-[#f2caca] bg-[#fff5f5] p-4">
      <AlertCircle className="mt-0.5 h-5 w-5 text-[#a54c2f]" />
      <div>
        <p className="text-sm font-black text-[#8a2f2f]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[#a54c2f]">{description}</p>
      </div>
    </div>
  );
}

export function Dialog({ title, open, children, onClose }: { title: string; open: boolean; children: ReactNode; onClose: () => void }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#101217]/45 px-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-[30px] border border-[#edf0f5] bg-white p-6 shadow-[0_34px_90px_rgba(20,24,31,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-black tracking-[-0.03em] text-[#111827]">{title}</h2>
          <SecondaryButton onClick={onClose}>Tutup</SecondaryButton>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
