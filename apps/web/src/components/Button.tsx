import { clsx } from "clsx";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        {
          "bg-ink text-white hover:bg-[#193028]": variant === "primary",
          "border border-[#d7dfd6] bg-white text-ink hover:border-[#bfd0c2] hover:bg-[#fafcf8]": variant === "secondary",
          "bg-transparent text-ink hover:bg-white/70": variant === "ghost"
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
