import { clsx } from "clsx";

type Props = {
  children: string;
  tone?: "success" | "warning" | "neutral";
};

export function StatusPill({ children, tone = "success" }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
        {
          "bg-[#edf4ff] text-[#174ea6]": tone === "success",
          "bg-[#fff3dc] text-[#92600a]": tone === "warning",
          "bg-[#eff3f7] text-[#596172]": tone === "neutral"
        }
      )}
    >
      {children}
    </span>
  );
}
