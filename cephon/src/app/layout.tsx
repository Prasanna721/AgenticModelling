import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TZAFON // Job Automation System",
  description: "Automated job posting interface powered by Tzafon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
