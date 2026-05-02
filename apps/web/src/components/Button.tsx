import { clsx } from "clsx";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff] disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-[#1769ff] text-white shadow-[0_16px_34px_rgba(23,105,255,0.22)] hover:bg-[#0d5be8]": variant === "primary",
          "border border-[#d8dde7] bg-white text-[#111827] hover:border-[#b9c2d3] hover:bg-[#f8faff]": variant === "secondary",
          "bg-transparent text-[#111827] hover:bg-white/70": variant === "ghost"
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
