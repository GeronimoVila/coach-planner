'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, User, Lock, Save, CreditCard, Tag, 
  Building2, Clock, CalendarClock, AlertTriangle
} from 'lucide-react';

interface StudentInfo {
  categoryName?: string;
  credits: number;
  role: string;
}

interface GymConfig {
  name: string;
  openHour: number;
  closeHour: number;
  slotDurationMinutes: number;
  cancellationWindow: number;
}

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'gym'>('profile');
  
  // Datos del Usuario
  const [userData, setUserData] = useState({
    fullName: '',
    email: '', 
    password: '', 
  });

  // Datos del Alumno
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  // Datos del Gimnasio (Solo Profe)
  const [gymData, setGymData] = useState<GymConfig>({
    name: '', openHour: 7, closeHour: 22, slotDurationMinutes: 60, cancellationWindow: 2
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Datos de Usuario
      const userRes = await api.get('/users/me');
      setUserData(prev => ({ 
        ...prev, 
        fullName: userRes.data.fullName || '', 
        email: userRes.data.email 
      }));

      // 2. Si es Alumno -> Datos de Membresía
      if (user?.role === 'STUDENT') {
        try {
            const studentRes = await api.get('/students/me');
            setStudentInfo({
                credits: studentRes.data.credits,
                categoryName: studentRes.data.category?.name || 'General',
                role: studentRes.data.role
            });
        } catch (err) {}
      }

      // 3. Si es Dueño -> Datos de Organización
      if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
         try {
            const orgRes = await api.get('/organizations/config'); 
            // Asumimos que este endpoint devuelve la info completa o creamos uno nuevo GET /organizations/me
            // Si /organizations/config solo devuelve config, necesitamos uno que devuelva el nombre también.
            // Por ahora usaremos el endpoint de config y asumimos que devuelve todo, o lo ajustamos.
            if (orgRes.data) {
                setGymData({
                    name: orgRes.data.name || '', // Asegúrate que el backend devuelva name
                    openHour: orgRes.data.openHour,
                    closeHour: orgRes.data.closeHour,
                    slotDurationMinutes: orgRes.data.slotDurationMinutes,
                    cancellationWindow: orgRes.data.cancellationWindow ?? 2
                });
            }
         } catch (err) {}
      }

    } catch (error) {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { fullName: userData.fullName };
      if (userData.password) payload.password = userData.password;

      await api.patch('/users/me', payload);
      toast.success('Perfil actualizado');
      setUserData(prev => ({ ...prev, password: '' }));
    } catch (error: any) {
      toast.error('Error al actualizar perfil');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Actualizar Configuración Numérica
      await api.patch('/organizations/config', {
        slotDurationMinutes: Number(gymData.slotDurationMinutes),
        cancellationWindow: Number(gymData.cancellationWindow),
        openHour: Number(gymData.openHour),
        closeHour: Number(gymData.closeHour)
      });

      // 2. Actualizar Nombre (Si tienes un endpoint separado, úsalo. Si no, agrégalo a updateConfig o usa updateOrganization)
      // Como creamos updateConfig solo para números, idealmente tendrías otro para el nombre.
      // Por simplicidad del MVP, asumiremos que solo se guardan las configs numéricas por ahora
      // O si quieres guardar el nombre, deberías agregar `name` al DTO `UpdateConfigDto` en el backend.
      
      toast.success('Configuración del gimnasio guardada');
    } catch (error: any) {
      toast.error('Error al guardar configuración');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header con TABS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                <p className="text-muted-foreground text-sm">Administra tu cuenta {isOwner && 'y tu negocio'}</p>
            </div>
          </div>

          {isOwner && (
              <div className="flex bg-gray-200/50 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'profile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Mi Perfil
                  </button>
                  <button 
                    onClick={() => setActiveTab('gym')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'gym' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Mi Negocio
                  </button>
              </div>
          )}
        </div>

        {/* CONTENIDO TAB: PERFIL (Visible para todos o si está activo) */}
        {(activeTab === 'profile') && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                
                {/* Info Alumno */}
                {studentInfo && (
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                                    <CreditCard className="h-4 w-4 text-primary" /> Créditos
                                </CardDescription>
                                <CardTitle className="text-3xl font-bold text-primary">{studentInfo.credits}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                                    <Tag className="h-4 w-4 text-purple-500" /> Categoría
                                </CardDescription>
                                <CardTitle className="text-xl font-bold truncate">{studentInfo.categoryName}</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Datos Personales</CardTitle>
                        <CardDescription>Actualiza tu información básica</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-5">
                            <div className="space-y-2">
                                <Label>Correo Electrónico</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input value={userData.email} disabled className="pl-9 bg-gray-100" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Nombre Completo</Label>
                                <Input required value={userData.fullName} onChange={e => setUserData({...userData, fullName: e.target.value})} />
                            </div>
                            <div className="pt-4 border-t space-y-2">
                                <Label>Cambiar Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        type="password" 
                                        placeholder="Nueva contraseña (mínimo 6 caracteres)" 
                                        className="pl-9"
                                        value={userData.password}
                                        onChange={e => setUserData({...userData, password: e.target.value})}
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Guardar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* CONTENIDO TAB: GIMNASIO (Solo Owners) */}
        {(activeTab === 'gym' && isOwner) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card>
                    <CardHeader>
                        <CardTitle>Configuración del Negocio</CardTitle>
                        <CardDescription>Define los horarios y reglas de tu gimnasio</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateGym} className="space-y-6">
                            
                            <div className="space-y-2">
                                <Label>Nombre del Gimnasio</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        value={gymData.name} 
                                        disabled // Deshabilitado hasta que agregues el endpoint para cambiar nombre
                                        title="Contacta a soporte para cambiar el nombre"
                                        className="pl-9 bg-gray-100" 
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400">El nombre del gimnasio no se puede cambiar libremente para no afectar los enlaces.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Hora Apertura</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input type="number" min="0" max="23" className="pl-9" value={gymData.openHour} onChange={e => setGymData({...gymData, openHour: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Hora Cierre</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input type="number" min="0" max="23" className="pl-9" value={gymData.closeHour} onChange={e => setGymData({...gymData, closeHour: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Duración Bloque (min)</Label>
                                    <div className="relative">
                                        <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input type="number" min="15" step="15" className="pl-9" value={gymData.slotDurationMinutes} onChange={e => setGymData({...gymData, slotDurationMinutes: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cancelación (horas antes)</Label>
                                    <div className="relative">
                                        <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input type="number" min="0" className="pl-9" value={gymData.cancellationWindow} onChange={e => setGymData({...gymData, cancellationWindow: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Guardar Configuración
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )}

      </div>
    </div>
  );
}