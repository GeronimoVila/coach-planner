'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  Activity, 
  ArrowUpRight, 
  Loader2,
  AlertCircle,
  Megaphone,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input'; 
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface DashboardStats {
  gyms: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    new24h: number;
  };
  activity: {
    classesToday: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [announcementData, setAnnouncementData] = useState({ message: '', isActive: false, type: 'INFO' });
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  const [limits, setLimits] = useState({ maxStudents: 5, maxClasses: 5, maxCategories: 2 });
  const [savingLimits, setSavingLimits] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        toast.dismiss();

        const [statsRes, announceRes, limitsRes] = await Promise.all([
           api.get('/admin/dashboard'),
           api.get('/admin/announcement'),
           api.get('/plans/limits')
        ]);

        setStats(statsRes.data);
        
        if (announceRes.data) {
           setAnnouncementData(announceRes.data);
        }
        
        if (limitsRes.data) {
            setLimits({
                maxStudents: limitsRes.data.maxStudents,
                maxClasses: limitsRes.data.maxClasses,
                maxCategories: limitsRes.data.maxCategories
            });
        }
      } catch (error) {
        console.error("Error cargando dashboard admin", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveAnnouncement = async () => {
    if (announcementData.isActive && !announcementData.message.trim()) {
      toast.warning('Debes escribir un mensaje para activar el anuncio');
      return;
    }

    setSavingAnnouncement(true);
    toast.dismiss();

    try {
      await api.post('/admin/announcement', announcementData);
      
      if (announcementData.isActive) {
        toast.success('Anuncio publicado correctamente');
      } else {
        toast.success('Anuncio desactivado');
      }
      
    } catch {
      toast.error('Error guardando anuncio');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleSaveLimits = async () => {
      setSavingLimits(true);
      toast.dismiss();

      try {
          await api.patch('/plans/limits', {
              maxStudents: Number(limits.maxStudents),
              maxClasses: Number(limits.maxClasses),
              maxCategories: Number(limits.maxCategories)
          });
          toast.success('Límites actualizados correctamente');
      } catch {
          toast.error('Error al actualizar límites');
      } finally {
          setSavingLimits(false);
      }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Global</h2>
        <p className="text-muted-foreground">Bienvenido al centro de control.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gimnasios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.gyms.active} <span className="text-muted-foreground text-lg font-normal">/ {stats.gyms.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Organizaciones activas vs totales
            </p>
            {stats.gyms.inactive > 0 && (
              <div className="mt-2 flex items-center text-xs text-red-600 font-medium">
                 <AlertCircle className="mr-1 h-3 w-3" />
                 {stats.gyms.inactive} suspendidos
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <div className="flex items-center gap-1 mt-1">
               {stats.users.new24h > 0 ? (
                 <span className="text-xs font-medium text-green-600 flex items-center bg-green-50 px-1.5 py-0.5 rounded-full">
                   <ArrowUpRight className="h-3 w-3 mr-1" />
                   +{stats.users.new24h} hoy
                 </span>
               ) : (
                 <span className="text-xs text-muted-foreground">Sin registros hoy</span>
               )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividad Hoy</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activity.classesToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clases programadas para hoy
            </p>
            <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-green-500 animate-pulse" style={{ width: stats.activity.classesToday > 0 ? '100%' : '5%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-500" /> Anuncio Global
              </CardTitle>
              <p className="text-sm text-muted-foreground">Este mensaje aparecerá a todos los usuarios.</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                   <label className="flex items-center gap-2 cursor-pointer select-none">
                     <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${announcementData.isActive ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                        {announcementData.isActive && <ArrowUpRight className="h-3 w-3 text-white rotate-45" />}
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={announcementData.isActive} 
                          onChange={(e) => setAnnouncementData({...announcementData, isActive: e.target.checked})}
                        />
                     </div>
                     <span className="text-sm font-medium text-gray-700">Activar Anuncio</span>
                   </label>

                   <select 
                     className="text-sm border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                     value={announcementData.type}
                     onChange={(e) => setAnnouncementData({...announcementData, type: e.target.value})}
                   >
                     <option value="INFO">Información (Azul)</option>
                     <option value="WARNING">Advertencia (Amarillo)</option>
                     <option value="ERROR">Crítico (Rojo)</option>
                   </select>
                </div>

                <div className="flex gap-2">
                  <Input 
                    placeholder="Mensaje del anuncio..." 
                    value={announcementData.message}
                    onChange={(e) => setAnnouncementData({...announcementData, message: e.target.value})}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSaveAnnouncement} 
                    disabled={savingAnnouncement}
                    className="min-w-24"
                  >
                    {savingAnnouncement ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-700" /> Límites Plan Gratuito
              </CardTitle>
              <p className="text-sm text-muted-foreground">Controla las restricciones para cuentas FREE.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Alumnos</Label>
                          <Input 
                              type="number" 
                              value={limits.maxStudents} 
                              onChange={(e) => setLimits({...limits, maxStudents: e.target.value === '' ? '' : Number(e.target.value)} as any)}
                          />
                      </div>
                      <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Clases Activas</Label>
                          <Input 
                              type="number" 
                              value={limits.maxClasses} 
                              onChange={(e) => setLimits({...limits, maxClasses: e.target.value === '' ? '' : Number(e.target.value)} as any)}
                          />
                      </div>
                      <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Max Categorías</Label>
                          <Input 
                              type="number" 
                              value={limits.maxCategories} 
                              onChange={(e) => setLimits({...limits, maxCategories: e.target.value === '' ? '' : Number(e.target.value)} as any)}
                          />
                      </div>
                  </div>
                  <Button 
                    onClick={handleSaveLimits} 
                    disabled={savingLimits}
                    className="w-full bg-gray-800 hover:bg-gray-900"
                  >
                    {savingLimits ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Actualizar Límites
                  </Button>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}