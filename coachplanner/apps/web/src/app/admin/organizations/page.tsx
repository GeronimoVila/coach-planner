'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Loader2, 
  ExternalLink, 
  Users, 
  Dumbbell, 
  Ban, 
  CheckCircle2,
  UserCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO' | string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  totalClasses: number;
  activeStudents: number;
  isActive: boolean;
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = async () => {
    try {
      const { data } = await api.get('/admin/organizations');
      setOrgs(data);
    } catch (error) {
      toast.error('Error cargando gimnasios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      setOrgs(orgs.map(org => 
        org.id === orgId ? { ...org, isActive: !org.isActive } : org
      ));

      await api.patch(`/admin/organizations/${orgId}/status`);
      
      const action = currentStatus ? 'suspendido' : 'activado';
      toast.success(`Gimnasio ${action} correctamente`);
    } catch (error) {
      toast.error('Error al cambiar el estado');
      fetchOrgs();
    }
  };

  const handleChangePlan = async (orgId: string, newPlan: string, orgName: string) => {
    if (!confirm(`¿Seguro que quieres cambiar el plan de "${orgName}" a ${newPlan}?`)) {
        setOrgs([...orgs]); 
        return;
    }

    try {
      setOrgs(orgs.map(org => 
        org.id === orgId ? { ...org, plan: newPlan } : org
      ));

      await api.patch(`/admin/organizations/${orgId}/plan`, { plan: newPlan });
      toast.success(`Plan de ${orgName} actualizado a ${newPlan}`);
    } catch (error) {
      toast.error('Error al cambiar el plan');
      fetchOrgs();
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Gimnasios</h2>
        <p className="text-muted-foreground">Gestión y control de acceso de organizaciones.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizaciones ({orgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                      {org.isActive ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Activo</Badge>
                      ) : (
                        <Badge variant="destructive">Suspendido</Badge>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                        <select 
                            value={org.plan}
                            onChange={(e) => handleChangePlan(org.id, e.target.value, org.name)}
                            className={`text-xs font-semibold rounded-full px-2 py-1 outline-none cursor-pointer border ${
                                org.plan === 'PRO' 
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                            }`}
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
                          <div className="font-medium text-blue-600 group-hover:underline cursor-pointer">
                             {org.owner.name}
                          </div>
                          <div className="text-xs text-gray-400">{org.owner.email}</div>
                        </div>
                        <UserCircle className="h-4 w-4 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                      </Link>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="font-semibold">{org.activeStudents}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-1">
                        <Dumbbell className="h-3 w-3 text-gray-400" />
                        <span className="font-semibold">{org.totalClasses}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/register/${org.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                          </Link>
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleStatus(org.id, org.isActive)}
                          className={org.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                        >
                          {org.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}