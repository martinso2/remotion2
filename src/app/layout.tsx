import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remotion + Next.js",
  description: "Programmatic video with Remotion embedded in Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
