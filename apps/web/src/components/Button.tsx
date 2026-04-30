import { clsx } from "clsx";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ children, className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        {
          "bg-ink text-white hover:bg-[#21332d]": variant === "primary",
          "border border-[#d7ddd7] bg-white text-ink hover:border-[#c0cbc2] hover:bg-[#f8f8f4]": variant === "secondary",
          "bg-transparent text-ink hover:bg-white/60": variant === "ghost"
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
