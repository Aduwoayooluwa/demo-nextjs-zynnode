import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Launch Checklist | launchpad-web",
  description: "A little checklist for your next big launch.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
