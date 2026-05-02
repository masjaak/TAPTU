import type { PropsWithChildren } from "react";

export function Shell({ children }: PropsWithChildren) {
  return <div className="min-h-screen bg-[#e9eaec] text-[#101217]">{children}</div>;
}
