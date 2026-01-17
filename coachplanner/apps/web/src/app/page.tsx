'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Dumbbell, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  ExternalLink,
  Flame,
  AlertTriangle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface DashboardStats {
  role: 'OWNER' | 'STUDENT';
  cards: {
    activeStudents?: number;
    classesToday?: number;
    expiringPacks?: number;
    registerSlug?: string;
    credits?: number;
    nextExpiration?: string | null;
    nextClass?: { title: string; date: string } | null;
    classesThisMonth?: number;
  }
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);

      if (res.data.cards?.registerSlug && typeof window !== 'undefined') {
        const origin = window.location.origin;
        setInviteLink(`${origin}/register/${res.data.cards.registerSlug}`);
      }

    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el resumen');
    } finally {
      setLoadingStats(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Enlace copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isOwner = user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'INSTRUCTOR';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };
  
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', { 
      day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 capitalize">
            Hola, {user.fullName?.split(' ')[0] || 'Usuario'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {isOwner 
              ? 'Aquí tienes el resumen operativo de hoy.'
              : `Bienvenido. Tienes ${stats?.cards?.credits || 0} créditos disponibles.`
            }
          </p>
        </div>

        {loadingStats ? (
           <div className="flex justify-center py-12">
             <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
           </div>
        ) : (
          <>
            {/* --- VISTA DE DUEÑO / PROFE --- */}
            {isOwner && stats?.cards && (
              <div className="space-y-6">
                
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Alumnos Activos</CardTitle>
                          <Users className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{stats.cards.activeStudents}</div>
                          <p className="text-xs text-muted-foreground">Inscriptos en el gym</p>
                          <Link href="/students" className="block mt-4">
                            <Button size="sm" variant="outline" className="w-full">Ver Lista</Button>
                          </Link>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Clases Hoy</CardTitle>
                          <LayoutDashboard className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{stats.cards.classesToday}</div>
                          <p className="text-xs text-muted-foreground">Sesiones programadas</p>
                          <Link href="/classes" className="block mt-4">
                             <Button size="sm" variant="outline" className="w-full">Ver Calendario</Button>
                          </Link>
                      </CardContent>
                    </Card>

                    <Card className={stats.cards.expiringPacks! > 0 ? "border-red-200 bg-red-50/30" : ""}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-red-700">Packs por Vencer</CardTitle>
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold text-red-700">{stats.cards.expiringPacks}</div>
                          <p className="text-xs text-red-600/80">Vencen en próximos 7 días</p>
                          {stats.cards.expiringPacks! > 0 && (
                             <Button size="sm" variant="ghost" className="w-full mt-4 text-red-600 hover:bg-red-100 hover:text-red-700 h-9">
                               Revisar Alumnos
                             </Button>
                          )}
                      </CardContent>
                    </Card>
                </div>

                {inviteLink && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                                <LinkIcon className="h-5 w-5" /> Invita a tus Alumnos
                            </CardTitle>
                            <CardDescription className="text-blue-600/80">
                                Comparte este enlace para que se registren directamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Input 
                                        value={inviteLink} 
                                        readOnly 
                                        className="pr-10 bg-white border-blue-200 text-gray-600 font-mono text-sm h-10" 
                                    />
                                </div>
                                <Button onClick={copyToClipboard} className="shrink-0 gap-2 min-w-28 bg-blue-600 hover:bg-blue-700 text-white">
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied ? '¡Listo!' : 'Copiar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                     <Card className="bg-linear-to-br from-gray-900 to-gray-800 text-white">
                        <CardHeader>
                            <CardTitle>Gestión Rápida</CardTitle>
                            <CardDescription className="text-gray-300">Accesos directos más usados</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3">
                            <Link href="/classes">
                               <Button variant="secondary" className="w-full h-12">📅 Calendario</Button>
                            </Link>
                            <Link href="/students">
                               <Button variant="secondary" className="w-full h-12">👥 Cargar Créditos</Button>
                            </Link>
                        </CardContent>
                     </Card>
                </div>
              </div>
            )}


            {/* --- VISTA DE ALUMNO --- */}
            {!isOwner && stats?.cards && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mis Créditos</CardTitle>
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{stats.cards.credits}</div>
                    <p className="text-xs text-muted-foreground mt-1">Clases disponibles</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Próxima Clase</CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    {stats.cards.nextClass ? (
                        <>
                         <div className="text-lg font-semibold truncate">{stats.cards.nextClass.title}</div>
                         <p className="text-xs text-blue-600 font-medium mt-1">
                            {formatDateTime(stats.cards.nextClass.date)}
                         </p>
                        </>
                    ) : (
                        <>
                         <div className="text-lg font-semibold text-gray-400">Sin reservas</div>
                         <p className="text-xs text-muted-foreground mt-1">Reserva tu lugar ahora</p>
                        </>
                    )}
                  </CardContent>
                </Card>

                <Card className={stats.cards.nextExpiration ? "" : "opacity-70"}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vencimiento Pack</CardTitle>
                    <AlertTriangle className={`h-4 w-4 ${stats.cards.credits! > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                        {stats.cards.nextExpiration ? formatDate(stats.cards.nextExpiration) : '-'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Fecha límite de uso</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Entrenamientos</CardTitle>
                    <Flame className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.cards.classesThisMonth}</div>
                    <p className="text-xs text-muted-foreground mt-1">Clases este mes 🔥</p>
                  </CardContent>
                </Card>

                <Card className="col-span-full lg:col-span-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <CardHeader>
                    <CardTitle className="text-white text-xl">¿Listo para entrenar?</CardTitle>
                    <CardDescription className="text-blue-100">
                      Revisa los horarios disponibles y asegura tu lugar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                  <Link href="/book">
                    <Button variant="secondary" className="w-full h-12 text-md font-semibold text-primary hover:bg-white">
                      📅 Ver Calendario de Clases
                    </Button>
                  </Link>
                </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}