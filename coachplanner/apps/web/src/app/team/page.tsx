'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, Trash2, UserPlus, Clock, CheckCircle, XCircle, UserX } from 'lucide-react';

export default function TeamPage() {
  const { user, isLoading } = useAuth();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ email: '', role: 'INSTRUCTOR' });
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (user && user.role !== 'OWNER') {
      toast.error('Acceso denegado.');
      router.push('/');
      return;
    }

    if (user?.role === 'OWNER' && user?.organizationId) {
      fetchTeamData();
    }
  }, [user, isLoading, router]);

  const fetchTeamData = async () => {
    if (!user?.organizationId) return;
    try {
      const [invitesRes, staffRes] = await Promise.all([
        api.organizations.getInvitations(user.organizationId),
        api.organizations.getStaff(user.organizationId)
      ]);
      setInvitations(invitesRes.data);
      setActiveStaff(staffRes.data);
    } catch (error) {
      toast.error('Error al cargar la información del equipo');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;
    setIsSubmitting(true);
    
    try {
      await api.organizations.inviteStaff(user.organizationId, formData.email, formData.role);
      toast.success('Invitación enviada por correo electrónico');
      setFormData({ email: '', role: 'INSTRUCTOR' });
      fetchTeamData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al enviar invitación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!user?.organizationId || !confirm('¿Estás seguro de revocar esta invitación?')) return;
    
    try {
      await api.organizations.revokeInvitation(user.organizationId, invitationId);
      toast.success('Invitación revocada');
      fetchTeamData();
    } catch (error) {
      toast.error('Error al revocar invitación');
    }
  };

  const handleRemoveStaff = async (staffUserId: string, staffName: string) => {
    if (!user?.organizationId) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${staffName || 'este profesor'} de tu gimnasio?\n\nEsto solo revocará su acceso a tu gimnasio, no borrará su cuenta.`)) return;

    try {
      await api.organizations.removeStaff(user.organizationId, staffUserId);
      toast.success('Profesor eliminado del gimnasio');
      fetchTeamData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar personal');
    }
  };

  if (isLoading || loadingData) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Equipo</h1>
        <p className="text-gray-500">Administra los profesores y el staff de tu gimnasio.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Formulario de Invitación */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Invitar personal
            </CardTitle>
            <CardDescription>Enviaremos un correo con un enlace mágico para que configuren su cuenta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input 
                  type="email" 
                  placeholder="profe@gmail.com" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Rol en el gimnasio</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-500"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  disabled
                >
                  <option value="INSTRUCTOR">Profesor (Instructor)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  El rol de Staff/Recepción estará disponible en futuras actualizaciones.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Enviar Invitación
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Listas de Equipo */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Personal Activo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Activo</CardTitle>
              <CardDescription>Estos profesores ya tienen acceso a tu gimnasio.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeStaff.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed text-sm">
                  Aún no tienes profesores activos en tu equipo.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStaff.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{staff.user?.fullName || 'Usuario sin nombre'}</p>
                        <p className="text-xs text-gray-500">{staff.user?.email}</p>
                        <div className="mt-1">
                          <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {staff.role === 'INSTRUCTOR' ? 'Profesor' : 'Staff'}
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Eliminar profesor"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50" 
                        onClick={() => handleRemoveStaff(staff.user.id, staff.user.fullName)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invitaciones Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invitaciones Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed text-sm">
                  No hay invitaciones pendientes o históricas.
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium text-sm text-gray-700">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            {inv.role === 'INSTRUCTOR' ? 'Profesor' : 'Staff'}
                          </span>
                          
                          {inv.status === 'PENDING' && <span className="text-[10px] flex items-center gap-1 text-orange-600"><Clock className="h-3 w-3" /> Pendiente</span>}
                          {inv.status === 'ACCEPTED' && <span className="text-[10px] flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> Aceptada</span>}
                          {inv.status === 'EXPIRED' && <span className="text-[10px] flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> Expirada</span>}
                        </div>
                      </div>
                      
                      {inv.status === 'PENDING' && (
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleRevoke(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}