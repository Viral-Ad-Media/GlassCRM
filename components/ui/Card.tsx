import type { ReactNode } from "react";
export function Card({
  children,
  className = "",
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={`card ${noPadding ? "p-0" : ""} ${className}`}>
      {children}
    </div>
  );
}
