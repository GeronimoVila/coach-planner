'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ownerNavItems, studentNavItems, adminNavItems, staffNavItems } from '@/config/nav-items';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Dumbbell, 
  Menu, 
  X,
  Crown,
  Building2,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useUpgradeModal } from '@/context/upgrade-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function Sidebar() {
  const { user, logout, switchOrganization } = useAuth();
  const { openUpgradeModal } = useUpgradeModal();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [gyms, setGyms] = useState<any[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    if (user && user.role === 'STUDENT') {
      api.get('/auth/my-gyms')
         .then(res => setGyms(res.data))
         .catch(err => console.error("Error al cargar gimnasios en sidebar", err));
    }
  }, [user]);

  const handleSwitchGym = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetOrgId = e.target.value;
    if (targetOrgId === user?.organizationId) return;

    setIsSwitching(true);
    const toastId = toast.loading('Cambiando de gimnasio...');

    try {
      const res = await api.post('/auth/switch-gym', { targetOrgId });
      toast.success('¡Listo!', { id: toastId });
      switchOrganization(res.data.access_token);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar', { id: toastId });
      setIsSwitching(false);
    }
  };

  if (!user) return null;

  let navItems = studentNavItems;
  if (user.role === 'ADMIN') {
    navItems = adminNavItems;
  } else if (user.role === 'OWNER') {
    navItems = ownerNavItems;
  } else if (user.role === 'INSTRUCTOR' || user.role === 'STAFF') {
    navItems = staffNavItems;
  }

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <Dumbbell className="h-6 w-6" /> CoachPlanner
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMobile}>
          {isMobileOpen ? <X /> : <Menu />}
        </Button>
      </div>
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsMobileOpen(false)} />
      )}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r transition-transform duration-300 ease-in-out md:translate-x-0 pt-16 md:pt-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="hidden md:flex h-16 items-center px-6 border-b">
            <div className="flex items-center gap-2 font-bold text-xl text-primary">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <Dumbbell className="h-5 w-5" />
              </div>
              CoachPlanner
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            {user.role === 'STUDENT' && gyms.length > 0 && (
                <div className="md:hidden px-3 mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mi Gimnasio</p>
                    <div className={`relative flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 ${isSwitching ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Building2 className="h-4 w-4 text-blue-600 mr-2 shrink-0" />
                        <select
                            value={user.organizationId || ''}
                            onChange={handleSwitchGym}
                            disabled={isSwitching}
                            className="appearance-none bg-transparent border-none text-sm font-bold text-gray-800 pr-6 cursor-pointer focus:outline-none w-full truncate"
                        >
                            {gyms.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        {isSwitching ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500 absolute right-3 pointer-events-none" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400 absolute right-3 pointer-events-none" />
                        )}
                    </div>
                </div>
            )}
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {user.role === 'ADMIN' ? 'Administración' : 'Menú Principal'}
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}>
                    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-400")} />
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-4">
             {(user.role === 'OWNER' && user.plan !== 'PRO') && (
                 <div className="mb-4">
                    <Button 
                        onClick={openUpgradeModal}
                        className="w-full bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md border-0"
                    >
                        <Crown className="mr-2 h-4 w-4" />
                        Pasar a PRO
                    </Button>
                 </div>
             )}
             <div className="flex items-center gap-3 mb-4 px-2">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                   {user.fullName?.[0] || user.email[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                   <p className="text-sm font-medium truncate">{user.fullName || 'Usuario'}</p>
                   <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
             </div>
             
             <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                onClick={logout}
             >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
             </Button>
          </div>

        </div>
      </aside>
    </>
  );
}