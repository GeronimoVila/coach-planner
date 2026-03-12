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
  Building2, Clock, CalendarClock, AlertTriangle, Plus, Trash2, Link as LinkIcon,
  Eye, EyeOff, Pencil
} from 'lucide-react';
import { DynamicLinkIcon } from '@/components/social-icon';

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
  bookingWindowMinutes: number;
}

interface OrgLink {
  id: string;
  label: string;
  url: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'gym'>('profile');
  
  const [userData, setUserData] = useState({
    fullName: '',
    email: '', 
    phoneNumber: '',
    password: '', 
  });

  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const [gymData, setGymData] = useState<GymConfig>({
    name: '', openHour: 7, closeHour: 22, slotDurationMinutes: 60, cancellationWindow: 2, bookingWindowMinutes: 15
  });

  const [links, setLinks] = useState<OrgLink[]>([]);
  const [newLink, setNewLink] = useState({ label: '', url: '' });
  const [addingLink, setAddingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const isProfileEmpty = !userData.fullName?.trim() && !userData.phoneNumber?.trim() && !userData.password?.trim();

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
      const userRes = await api.get('/users/me');
      setUserData(prev => ({ 
        ...prev, 
        fullName: userRes.data.fullName || '', 
        email: userRes.data.email,
        phoneNumber: userRes.data.phoneNumber || ''
      }));

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

      if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
         try {
            const orgRes = await api.get('/organizations/config'); 
            if (orgRes.data) {
                setGymData({
                    name: orgRes.data.name || '',
                    openHour: orgRes.data.openHour,
                    closeHour: orgRes.data.closeHour,
                    slotDurationMinutes: orgRes.data.slotDurationMinutes,
                    cancellationWindow: orgRes.data.cancellationWindow ?? 2,
                    bookingWindowMinutes: orgRes.data.bookingWindowMinutes ?? 15
                });
                
                if (orgRes.data.links) {
                    setLinks(orgRes.data.links);
                }
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
      const payload: any = { fullName: userData.fullName, phoneNumber: userData.phoneNumber };
      if (userData.password) payload.password = userData.password;

      await api.patch('/users/me', payload);
      toast.success('Perfil actualizado');
      setUserData(prev => ({ ...prev, password: '' }));
    } catch (error: any) {
      const msg = error.response?.data?.message;
      const displayMsg = Array.isArray(msg) ? msg[0] : (msg || 'Error al actualizar perfil');
      toast.error(displayMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch('/organizations/config', {
        slotDurationMinutes: Number(gymData.slotDurationMinutes),
        cancellationWindow: Number(gymData.cancellationWindow),
        openHour: Number(gymData.openHour),
        closeHour: Number(gymData.closeHour),
        bookingWindowMinutes: Number(gymData.bookingWindowMinutes)
      });
      
      toast.success('Configuración del gimnasio guardada');
    } catch (error: any) {
      toast.error('Error al guardar configuración');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveLink = async () => {
    if (!newLink.label.trim() || !newLink.url.trim()) return;
    setAddingLink(true);
    try {
      if (editingLinkId) {
        await api.patch(`/organizations/links/${editingLinkId}`, newLink);
        toast.success('Enlace actualizado');
      } else {
        await api.post('/organizations/links', newLink);
        toast.success('Enlace agregado correctamente');
      }
      setNewLink({ label: '', url: '' });
      setEditingLinkId(null);
      fetchData(); 
    } catch (error) {
      toast.error('Error al guardar el enlace');
    } finally {
      setAddingLink(false);
    }
  };

  const handleEditClick = (link: OrgLink) => {
    setNewLink({ label: link.label, url: link.url });
    setEditingLinkId(link.id);
  };

  const handleCancelEdit = () => {
    setNewLink({ label: '', url: '' });
    setEditingLinkId(null);
  };

  const handleToggleLinkStatus = async (link: OrgLink) => {
    try {
      await api.patch(`/organizations/links/${link.id}`, { isActive: !link.isActive });
      toast.success(link.isActive ? 'Enlace ocultado' : 'Enlace activado');
      fetchData();
    } catch (error) {
      toast.error('Error al cambiar el estado');
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    try {
      await api.delete(`/organizations/links/${linkId}`);
      toast.success('Enlace eliminado');
      setLinks(links.filter(l => l.id !== linkId));
    } catch (error) {
      toast.error('Error al eliminar el enlace');
    }
  };

  if (authLoading || loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

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

        {(activeTab === 'profile') && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                
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
                                <Input value={userData.fullName} onChange={e => setUserData({...userData, fullName: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Número de Celular</Label>
                                <Input 
                                    type="tel"
                                    value={userData.phoneNumber} 
                                    onChange={e => setUserData({...userData, phoneNumber: e.target.value})} 
                                    placeholder="Ej: 11 1234-5678"
                                />
                            </div>
                            <div className="pt-4 border-t space-y-2">
                                <Label>Cambiar Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        type="password" 
                                        placeholder="Nueva contraseña (mínimo 8 caracteres)" 
                                        className="pl-9"
                                        value={userData.password}
                                        onChange={e => setUserData({...userData, password: e.target.value})}
                                        minLength={6}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={submitting || isProfileEmpty}>
                                    {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Guardar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )}

        {(activeTab === 'gym' && isOwner) && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Card>
                    <CardHeader>
                        <CardTitle>Configuración del Negocio</CardTitle>
                        <CardDescription>Define los horarios y reglas de tu organización</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateGym} className="space-y-6">
                            
                            <div className="space-y-2">
                                <Label>Nombre del Gimnasio</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        value={gymData.name} 
                                        disabled
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
                                        <Input type="number" min="0" max="23" className="pl-9" value={gymData.openHour} onChange={e => {
                                            const val = e.target.value;
                                            setGymData({
                                                ...gymData, 
                                                openHour: val === '' ? '' : Number(val)
                                            } as any);
                                        }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Hora Cierre</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input type="number" min="0" max="23" className="pl-9" value={gymData.closeHour} onChange={e => setGymData({...gymData, closeHour: e.target.value === '' ? '' : Number(e.target.value)} as any)} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Duración Bloque (min)</Label>
                                    <div className="relative">
                                        <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input type="number" min="15" step="15" className="pl-9" value={gymData.slotDurationMinutes} onChange={e => setGymData({...gymData, slotDurationMinutes: e.target.value === '' ? '' : Number(e.target.value)} as any)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cancelación (horas antes)</Label>
                                    <div className="relative">
                                        <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input type="number" min="0" className="pl-9" value={gymData.cancellationWindow} onChange={e => setGymData({...gymData, cancellationWindow: e.target.value === '' ? '' : Number(e.target.value)} as any)} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Cierre de inscripciones (minutos antes de la clase)</Label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input 
                                        type="number" 
                                        min="0" 
                                        className="pl-9" 
                                        value={gymData.bookingWindowMinutes} 
                                        onChange={e => setGymData({...gymData, bookingWindowMinutes: e.target.value === '' ? '' : Number(e.target.value)} as any)} 
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500">
                                    Ejemplo: 15 = Los alumnos no podrán anotarse si faltan menos de 15 minutos para que empiece.
                                </p>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Guardar Configuración
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5 text-blue-600" /> Enlaces Externos
                        </CardTitle>
                        <CardDescription>Agrega botones directos a tu grupo de WhatsApp, Instagram o tienda para que los alumnos los vean en su panel.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        
                        {links.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {links.map(link => (
                                    <div key={link.id} className={`flex items-center justify-between p-3 border rounded-lg shadow-sm transition-opacity ${!link.isActive ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                                        <div className="flex items-center gap-3 min-w-0 pr-4">
                                            <div className="p-2 bg-gray-50 rounded-full shrink-0 border">
                                                <DynamicLinkIcon url={link.url} className={`h-5 w-5 ${!link.isActive ? 'grayscale opacity-50' : ''}`} />
                                            </div>
                                            
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm text-gray-900 truncate">
                                                    {link.label} {!link.isActive && <span className="text-xs text-gray-500 font-normal ml-2">(Oculto)</span>}
                                                </p>
                                                <a href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                                                    {link.url}
                                                </a>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleToggleLinkStatus(link)} 
                                                className="text-gray-500 hover:text-gray-900"
                                                title={link.isActive ? "Ocultar a los alumnos" : "Mostrar a los alumnos"}
                                            >
                                                {link.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleEditClick(link)} 
                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                title="Editar enlace"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveLink(link.id)} 
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                title="Eliminar enlace"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4 italic border rounded-lg bg-gray-50">
                                Aún no has agregado ningún enlace.
                            </p>
                        )}

                        <div className={`flex flex-col md:flex-row gap-3 items-start md:items-end pt-4 border-t relative ${editingLinkId ? 'bg-blue-50/50 p-4 rounded-lg border-blue-100 mt-2' : 'mt-4'}`}>                          
                            {editingLinkId && (
                                <p className="absolute top-1 left-4 text-xs font-medium text-blue-700">
                                    Editando enlace...
                                </p>
                            )}
                            <div className="space-y-2 w-full md:flex-1">
                                <Label className="text-xs">Nombre del Botón</Label>
                                <Input 
                                    placeholder="Ej: Grupo de WhatsApp" 
                                    value={newLink.label} 
                                    onChange={e => setNewLink({...newLink, label: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2 w-full md:flex-1">
                                <Label className="text-xs">URL (Enlace)</Label>
                                <Input 
                                    placeholder="https://chat.whatsapp.com/..." 
                                    value={newLink.url} 
                                    onChange={e => setNewLink({...newLink, url: e.target.value})} 
                                />
                            </div>
                            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 shrink-0">
                                {editingLinkId && (
                                    <Button 
                                        onClick={handleCancelEdit} 
                                        variant="outline"
                                        className="w-full sm:w-auto h-10 bg-white"
                                    >
                                        Cancelar
                                    </Button>
                                )}
                                <Button 
                                    onClick={handleSaveLink} 
                                    disabled={addingLink || !newLink.label.trim() || !newLink.url.trim()} 
                                    className="w-full sm:w-auto h-10 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {addingLink ? (
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    ) : (
                                        editingLinkId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />
                                    )} 
                                    {editingLinkId ? 'Guardar' : 'Agregar'}
                                </Button>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        )}

      </div>
    </div>
  );
}