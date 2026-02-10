'use client';

import { usePathname } from 'next/navigation';
import AppShell from "@/components/layout/app-shell";
import { GlobalBanner } from "@/components/global-banner";

const FULL_SCREEN_ROUTES = [
  '/login',
  '/register',
  '/onboarding',      
  '/auth/callback'    
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isFullScreen = FULL_SCREEN_ROUTES.some(route => pathname.startsWith(route));

  if (isFullScreen) {
    return (
      <main className="flex min-h-screen flex-col">
        {children}
      </main>
    );
  }

  return (
    <>
      <GlobalBanner />
      <AppShell>
        {children}
      </AppShell>
    </>
  );
}