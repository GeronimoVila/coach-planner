'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Mail, User as UserIcon, Shield, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface User {
  id: string; fullName: string | null; email: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'OWNER';
  createdAt: string; isDeleted: boolean;
  _count: { memberships: number; instructedClasses: number; organizationsOwned: number; };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchUsers = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { page: currentPage, limit: 10, q: currentSearch, role: roleFilter, status: statusFilter }
      });
      setUsers(data.data);
      setTotalPages(data.meta.totalPages);
      setTotalRecords(data.meta.total);
    } catch (error) {
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, search);
      if (search !== '') setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers(page, search);
  }, [page]);

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
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Usuarios</h2>
        <p className="text-muted-foreground">Base de datos global de usuarios del sistema.</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar por nombre o email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select 
              className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="DISABLED">Solo Desactivados</option>
            </select>
          </div>
          <select 
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Todos los Roles</option>
            <option value="STUDENT">Alumnos</option>
            <option value="INSTRUCTOR">Profesores</option>
            <option value="OWNER">Dueños (Owners)</option>
            <option value="ADMIN">Administradores</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultados ({totalRecords})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
             </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No se encontraron usuarios con estos filtros.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-6 py-3">Usuario</th>
                      <th className="px-6 py-3">Rol</th>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3">Detalles</th>
                      <th className="px-6 py-3">Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className={`border-b hover:bg-gray-50 transition-colors ${user.isDeleted ? 'bg-red-50/20 opacity-80' : 'bg-white'}`}>
                        <td className="px-6 py-4">
                          <Link href={`/admin/users/${user.id}`} className="group flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${user.isDeleted ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                              {user.role === 'ADMIN' ? <Shield className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 group-hover:text-blue-600 group-hover:underline">
                                {user.fullName || 'Sin nombre'}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {user.email}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4">
                          {user.isDeleted ? (
                              <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50">Desactivado</Badge>
                          ) : (
                              <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Activo</Badge>
                          )}
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Página <span className="font-medium text-gray-900">{page}</span> de {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}