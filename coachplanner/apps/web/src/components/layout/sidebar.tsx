'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { ownerNavItems, studentNavItems } from '@/config/nav-items';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Dumbbell, 
  Menu, 
  X,
  UserCircle
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  const isOwner = user.role === 'OWNER' || user.role === 'ADMIN';
  const navItems = isOwner ? ownerNavItems : studentNavItems;

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
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
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
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Menú Principal
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