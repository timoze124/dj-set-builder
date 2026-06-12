import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DJ Set Builder",
  description: "AI-powered DJ playlist builder for genre, location, time and BPM."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
