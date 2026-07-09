/* Minimal layout for embed widget — no MobileShell, no nav, no header */
import type { ReactNode } from "react";

export const metadata = {
  title: "Sohbet",
  robots: "noindex, nofollow",
};

export default function WidgetLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
