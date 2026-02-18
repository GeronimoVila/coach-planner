import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import { ClientLayout } from "@/components/layout/client-layout";
import { UpgradeProvider } from "@/context/upgrade-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoachPlanner",
  description: "Gestión de clases deportivas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased ${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <UpgradeProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
            <Toaster />
          </UpgradeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}