'use client';

import { useAuth } from "@/context/auth-context";
import Sidebar from "./sidebar";
import { usePathname } from "next/navigation";
import { NotificationsPopover } from "./notifications-popover"; // 👈 1. Importar

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();

  const publicRoutes = ['/login', '/register', '/register-business'];
  // Verificamos si la ruta actual empieza con alguna de las rutas públicas
  // (Esto maneja /register y /register/slug correctamente)
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isLoading) return null;

  if (!user || isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Ajuste de layout:
        Quitamos el pt-16 manual y usamos flex-col para manejar el header 
      */}
      <main className="transition-all duration-300 ml-0 md:ml-64 min-h-screen flex flex-col">
        
        {/* 👇 2. Header Superior para Notificaciones */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end px-4 md:px-8 bg-gray-50/80 backdrop-blur-sm md:bg-transparent">
           {/* Contenedor de la campanita con fondo blanco en móvil para que resalte */}
           <div className="bg-white p-1.5 rounded-full shadow-sm md:shadow-none md:bg-transparent md:p-0">
              <NotificationsPopover />
           </div>
        </header>

        {/* Contenido de la página */}
        <div className="flex-1 px-4 md:px-0">
          {children}
        </div>

      </main>
    </div>
  );
}