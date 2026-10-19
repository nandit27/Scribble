import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Scribble — Voice math tutor",
  description: "A worksheet-aware voice math tutor",
  icons: "/logo.png"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
