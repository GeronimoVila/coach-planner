'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (!isLoading && user && user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-1">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-700">Panel de Administración</h1>
          <div className="ml-auto flex items-center gap-2">
             <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                {user.fullName?.[0] || 'A'}
             </div>
             <span className="text-sm font-medium text-gray-600">{user.fullName}</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
        </main>
      </div>
    </div>
  );
}