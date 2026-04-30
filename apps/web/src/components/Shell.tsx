import type { PropsWithChildren } from "react";

export function Shell({ children }: PropsWithChildren) {
  return <div className="min-h-screen bg-sand text-ink">{children}</div>;
}
