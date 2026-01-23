'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings, 
  LogOut 
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Gimnasios',
    href: '/admin/organizations',
    icon: Building2,
  },
  {
    title: 'Usuarios',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Configuración',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-gray-900 text-white md:block w-64 min-h-screen flex-col">
      <div className="flex h-16 items-center border-b border-gray-800 px-6 font-bold text-lg tracking-wider">
        BACKOFFICE
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:text-white",
                  isActive 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "text-gray-400 hover:bg-gray-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-gray-800">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
            <span>Volver a la App</span>
        </Link>
      </div>
    </div>
  );
}