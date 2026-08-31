import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradify — Market clarity, one conversation away",
  description: "Educational stock research, brought together in one intelligent conversation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
