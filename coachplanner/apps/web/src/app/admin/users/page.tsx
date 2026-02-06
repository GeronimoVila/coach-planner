'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Mail, User as UserIcon, Shield, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface User {
  id: string;
  fullName: string | null;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'OWNER';
  createdAt: string;
  _count: {
    memberships: number;
    instructedClasses: number;
    organizationsOwned: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async (query = '') => {
    setLoading(true);
    try {
      const url = query ? `/admin/users?q=${query}` : '/admin/users';
      const { data } = await api.get(url);
      setUsers(data);
    } catch (error) {
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Badge className="bg-purple-600 hover:bg-purple-700">Admin</Badge>;
      case 'OWNER': return <Badge className="bg-blue-600 hover:bg-blue-700">Dueño</Badge>;
      case 'INSTRUCTOR': return <Badge className="bg-orange-500 hover:bg-orange-600">Profe</Badge>;
      default: return <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300">Alumno</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Usuarios</h2>
          <p className="text-muted-foreground">Base de datos global de usuarios del sistema.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultados ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex h-40 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
             </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No se encontraron usuarios con "{search}"
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                  <tr>
                    <th className="px-6 py-3">Usuario</th>
                    <th className="px-6 py-3">Rol</th>
                    <th className="px-6 py-3">Detalles</th>
                    <th className="px-6 py-3">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b bg-white hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/admin/users/${user.id}`} className="group flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            {user.role === 'ADMIN' ? <Shield className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-blue-600 group-hover:underline">{user.fullName || 'Sin nombre'}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {user.email}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {user.role === 'OWNER' && <div>Gyms: {user._count.organizationsOwned}</div>}
                        {user.role === 'INSTRUCTOR' && <div>Clases: {user._count.instructedClasses}</div>}
                        {user.role === 'STUDENT' && <div>Membresías: {user._count.memberships}</div>}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(user.createdAt).toLocaleDateString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}