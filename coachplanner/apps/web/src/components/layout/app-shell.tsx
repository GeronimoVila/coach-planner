'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import Sidebar from "./sidebar";
import { usePathname } from "next/navigation";
import { NotificationsPopover } from "./notifications-popover";
import StudentGuard from "../auth/student-guard";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Building2, ChevronDown } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, switchOrganization } = useAuth();
  const pathname = usePathname();

  const [gyms, setGyms] = useState<any[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);

  const publicRoutes = ['/login', '/register', '/register-business'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (user && user.role === 'STUDENT' && !isPublicRoute) {
      api.get('/auth/my-gyms')
         .then(res => setGyms(res.data))
         .catch(err => console.error("Error al cargar la lista de gimnasios", err));
    }
  }, [user, isPublicRoute]);

  const handleSwitchGym = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetOrgId = e.target.value;
    
    if (targetOrgId === user?.organizationId) return;

    setIsSwitching(true);
    const toastId = toast.loading('Cambiando de gimnasio...');

    try {
      const res = await api.post('/auth/switch-gym', { targetOrgId });
      toast.success('¡Listo! Redirigiendo...', { id: toastId });
      
      switchOrganization(res.data.access_token);
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al intentar cambiar de gimnasio', { id: toastId });
      setIsSwitching(false);
    }
  };

  if (isLoading) return null;

  if (!user || isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <StudentGuard>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        
        <main className="transition-all duration-300 ml-0 md:ml-64 min-h-screen flex flex-col">          
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 md:px-8 bg-gray-50/80 backdrop-blur-sm md:bg-transparent">
              <div className="flex items-center">
                {user.role === 'STUDENT' && gyms.length > 0 && (
                  <div className={`hidden md:flex relative items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm transition-opacity ${isSwitching ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Building2 className="h-4 w-4 text-blue-600 mr-2 shrink-0" />                   
                    <select
                      value={user.organizationId || ''}
                      onChange={handleSwitchGym}
                      disabled={isSwitching}
                      className="appearance-none bg-transparent border-none text-sm font-bold text-gray-800 pr-6 cursor-pointer focus:outline-none focus:ring-0 w-full max-w-37.5 sm:max-w-62.5 truncate"
                    >
                      {gyms.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>                    
                    {isSwitching ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500 absolute right-3 pointer-events-none" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 pointer-events-none" />
                    )}
                  </div>
                )}
             </div>
             <div className="bg-white p-1.5 rounded-full shadow-sm md:shadow-none md:bg-transparent md:p-0 ml-2">
                <NotificationsPopover />
             </div>
          </header>

          <div className="flex-1 px-4 md:px-0">
            {children}
          </div>

        </main>
      </div>
    </StudentGuard>
  );
}