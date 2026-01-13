'use client';

import { useAuth } from "@/context/auth-context";
import Sidebar from "./sidebar";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  const publicRoutes = ['/login', '/register', '/register-business'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isLoading) return null;

  if (!user || isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="transition-all duration-300 ml-0 md:ml-64 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}