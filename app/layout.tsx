import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Run Tracker · Sub-50 Project",
  description: "Track your 10K pace improvement from 8:00/km to 5:00/km",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Nav />
          <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:py-8 sm:pb-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
