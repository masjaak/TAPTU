import { clsx } from "clsx";

type Props = {
  children: string;
  tone?: "green" | "amber" | "slate";
};

export function StatusPill({ children, tone = "green" }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        {
          "bg-[#e7f6ef] text-[#15795a]": tone === "green",
          "bg-[#fff3e7] text-[#aa6a26]": tone === "amber",
          "bg-[#eff3ef] text-[#566660]": tone === "slate"
        }
      )}
    >
      {children}
    </span>
  );
}
