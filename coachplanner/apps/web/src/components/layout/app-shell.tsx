'use client';

import { useAuth } from "@/context/auth-context";
import Sidebar from "./sidebar";
import { usePathname } from "next/navigation";
import { NotificationsPopover } from "./notifications-popover";

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
      
      <main className="transition-all duration-300 ml-0 md:ml-64 min-h-screen flex flex-col">
        
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end px-4 md:px-8 bg-gray-50/80 backdrop-blur-sm md:bg-transparent">
           <div className="bg-white p-1.5 rounded-full shadow-sm md:shadow-none md:bg-transparent md:p-0">
              <NotificationsPopover />
           </div>
        </header>

        <div className="flex-1 px-4 md:px-0">
          {children}
        </div>

      </main>
    </div>
  );
}