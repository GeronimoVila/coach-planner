'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Loader2, ExternalLink, Users, Dumbbell, Ban, CheckCircle2, UserCircle, ScanFace, Search, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Organization {
  id: string; name: string; slug: string; plan: 'FREE' | 'PRO' | string;
  owner: { id: string; name: string; email: string; };
  createdAt: string; totalClasses: number; activeStudents: number; isActive: boolean;
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchOrgs = async (currentPage = page, currentSearch = search) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/organizations', {
        params: { page: currentPage, limit: 10, search: currentSearch, status: statusFilter, plan: planFilter }
      });
      setOrgs(data.data);
      setTotalPages(data.meta.totalPages);
      setTotalRecords(data.meta.total);
    } catch (error) {
      toast.error('Error cargando gimnasios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrgs(1, search);
      if (search !== '') setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, statusFilter, planFilter]);

  useEffect(() => {
    fetchOrgs(page, search);
  }, [page]);

  const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      setOrgs(orgs.map(org => org.id === orgId ? { ...org, isActive: !org.isActive } : org));
      await api.patch(`/admin/organizations/${orgId}/status`);
      toast.success(`Gimnasio ${currentStatus ? 'suspendido' : 'activado'} correctamente`);
    } catch (error) {
      toast.error('Error al cambiar el estado');
      fetchOrgs();
    }
  };

  const handleChangePlan = async (orgId: string, newPlan: string, orgName: string) => {
    if (!confirm(`¿Seguro que quieres cambiar el plan de "${orgName}" a ${newPlan}?`)) return;
    try {
      setOrgs(orgs.map(org => org.id === orgId ? { ...org, plan: newPlan } : org));
      await api.patch(`/admin/organizations/${orgId}/plan`, { plan: newPlan });
      toast.success(`Plan actualizado a ${newPlan}`);
    } catch (error) {
      toast.error('Error al cambiar el plan');
      fetchOrgs();
    }
  };

  const handleImpersonate = async (ownerId: string, ownerEmail: string, ownerName: string) => {
    if (!confirm(`¿Estás seguro que quieres entrar al sistema como ${ownerEmail}?`)) return;
    setImpersonatingId(ownerId);
    try {
      const { data } = await api.post('/auth/impersonate', { userId: ownerId });
      localStorage.setItem('token', data.access_token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      document.cookie = `token=${data.access_token}; path=/;`;
      toast.success(`Iniciando sesión como ${ownerName || ownerEmail}...`);
      window.location.href = '/dashboard'; 
    } catch (error) {
      toast.error('Error al intentar suplantar identidad');
      setImpersonatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Gimnasios</h2>
        <p className="text-muted-foreground">Gestión y control de acceso de organizaciones.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar por nombre o slug..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <option value="SUSPENDED">Solo Suspendidos</option>
            </select>
          </div>
          <select 
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="ALL">Todos los Planes</option>
            <option value="FREE">Plan FREE</option>
            <option value="PRO">Plan PRO</option>
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
          ) : orgs.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
               No se encontraron gimnasios con estos filtros.
             </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-6 py-3">Estado</th>
                      <th className="px-6 py-3">Plan</th>
                      <th className="px-6 py-3">Nombre</th>
                      <th className="px-6 py-3">Dueño</th>
                      <th className="px-6 py-3 text-center">Alumnos</th>
                      <th className="px-6 py-3 text-center">Clases</th>
                      <th className="px-6 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => (
                      <tr key={org.id} className={`border-b hover:bg-gray-50 ${!org.isActive ? 'bg-red-50/50' : 'bg-white'}`}>
                        <td className="px-6 py-4">
                          {org.isActive ? <Badge className="bg-green-600 hover:bg-green-700">Activo</Badge> : <Badge variant="destructive">Suspendido</Badge>}
                        </td>
                        <td className="px-6 py-4">
                            <select 
                                value={org.plan}
                                onChange={(e) => handleChangePlan(org.id, e.target.value, org.name)}
                                className={`text-xs font-semibold rounded-full px-2 py-1 outline-none cursor-pointer border ${org.plan === 'PRO' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                            >
                                <option value="FREE">FREE</option>
                                <option value="PRO">PRO</option>
                            </select>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {org.name}
                          <div className="text-xs text-gray-400 font-normal">{org.slug}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/admin/users/${org.owner.id}`} className="group flex items-center gap-2">
                            <div>
                              <div className="font-medium text-blue-600 group-hover:underline cursor-pointer">{org.owner.name}</div>
                              <div className="text-xs text-gray-400">{org.owner.email}</div>
                            </div>
                            <UserCircle className="h-4 w-4 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100" />
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-gray-400" /> <span className="font-semibold">{org.activeStudents}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex items-center justify-center gap-1">
                            <Dumbbell className="h-3 w-3 text-gray-400" /> <span className="font-semibold">{org.totalClasses}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleImpersonate(org.owner.id, org.owner.email, org.owner.name)} disabled={impersonatingId === org.owner.id} className="text-orange-500 hover:text-orange-700 hover:bg-orange-50" title="Acceder como este dueño">
                              {impersonatingId === org.owner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/register/${org.slug}`} target="_blank" title="Ver portal del gimnasio"><ExternalLink className="h-4 w-4 text-blue-600" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(org.id, org.isActive)} className={org.isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}>
                              {org.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </Button>
                          </div>
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