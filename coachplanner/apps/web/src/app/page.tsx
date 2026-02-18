'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  LayoutDashboard, 
  Users, 
  Dumbbell, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Flame,
  AlertTriangle,
  Clock,
  Crown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUpgradeModal } from '@/context/upgrade-context';

interface DashboardStats {
  role: 'OWNER' | 'STUDENT';
  cards: {
    activeStudents?: number;
    maxStudents?: number;
    isPro?: boolean;
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
  const { openUpgradeModal } = useUpgradeModal();
  const router = useRouter();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    if ((user.role as string) === 'ADMIN') {
        router.replace('/admin');
        return;
    }

    fetchDashboardStats();
  }, [user, router]);

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
      if ((user?.role as string) !== 'ADMIN') {
          toast.error('No se pudo cargar el resumen');
      }
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

  if (!user || (user.role as string) === 'ADMIN') return null;

  const isOwner = user.role === 'OWNER' || user.role === 'ADMIN' || user.role === 'INSTRUCTOR';

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const students = stats?.cards.activeStudents || 0;
  const maxStudents = stats?.cards.maxStudents || 1;
  const percentage = Math.min((students / maxStudents) * 100, 100);
  const isNearLimit = !stats?.cards.isPro && percentage >= 80;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
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
          
          {isOwner && stats?.cards && (
             <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border flex items-center gap-2 w-fit ${stats.cards.isPro ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {stats.cards.isPro ? <Crown className="h-4 w-4 text-indigo-600" /> : <Dumbbell className="h-4 w-4" />}
                Plan {stats.cards.isPro ? 'PRO' : 'GRATUITO'}
             </div>
          )}
        </div>

        {loadingStats ? (
           <div className="flex justify-center py-12">
             <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
           </div>
        ) : (
          <>
            {isOwner && stats?.cards && (
              <div className="space-y-6">
                
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Cupo de Alumnos</CardTitle>
                          <Users className={`h-4 w-4 ${isNearLimit ? 'text-orange-500' : 'text-blue-500'}`} />
                      </CardHeader>
                      <CardContent>
                          <div className="flex items-end justify-between mb-2">
                             <div className="text-2xl font-bold">
                                {stats.cards.activeStudents}
                                <span className="text-sm text-muted-foreground font-normal ml-1">
                                   / {stats.cards.isPro ? '∞' : stats.cards.maxStudents}
                                </span>
                             </div>
                             {isNearLimit && <span className="text-xs font-bold text-orange-600 mb-1">¡Sin cupos disponibles!</span>}
                          </div>
                          
                          {!stats.cards.isPro && (
                              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${isNearLimit ? 'bg-orange-500' : 'bg-blue-600'}`} 
                                    style={{ width: `${percentage}%` }}
                                />
                              </div>
                          )}
                          {stats.cards.isPro && (
                              <p className="text-xs text-indigo-600 font-medium">Sin límites de registro</p>
                          )}

                          <div className="mt-4 space-y-2">
                            {isNearLimit && (
                                <Button 
                                    size="sm" 
                                    className="w-full h-8 text-xs bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 animate-pulse"
                                    onClick={openUpgradeModal}
                                >
                                    <Crown className="h-3 w-3 mr-2" />
                                    Aumentar Cupo
                                </Button>
                            )}

                            <Link href="/students" className="block">
                                <Button size="sm" variant="outline" className="w-full h-8 text-xs">Administrar alumnos</Button>
                            </Link>
                          </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Clases Hoy</CardTitle>
                          <LayoutDashboard className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{stats.cards.classesToday}</div>
                          <p className="text-xs text-muted-foreground mb-4">Sesiones programadas</p>
                          <Link href="/classes">
                             <Button size="sm" variant="outline" className="w-full h-8 text-xs">Ver Calendario</Button>
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
                          <p className="text-xs text-red-600/80 mb-4">Vencen en próximos 7 días</p>
                          {stats.cards.expiringPacks! > 0 && (
                             <Button size="sm" variant="ghost" className="w-full h-8 text-xs text-red-600 hover:bg-red-100 hover:text-red-700">
                               Revisar Alumnos
                             </Button>
                          )}
                      </CardContent>
                    </Card>
                </div>

                {inviteLink && (
                    <Card className={`border-blue-200 ${isNearLimit ? 'bg-orange-50 border-orange-200' : 'bg-blue-50'}`}>
                        <CardHeader className="pb-3">
                            <CardTitle className={`text-lg flex items-center gap-2 ${isNearLimit ? 'text-orange-800' : 'text-blue-800'}`}>
                                <LinkIcon className="h-5 w-5" /> 
                                {isNearLimit ? 'Cupo Limitado - Enlace de Registro' : 'Invita a tus Alumnos'}
                            </CardTitle>
                            <CardDescription className={isNearLimit ? 'text-orange-700' : 'text-blue-600/80'}>
                                {isNearLimit 
                                    ? 'Ten cuidado, te quedan pocos lugares. Si se llena, este enlace dejará de funcionar.'
                                    : 'Comparte este enlace para que se registren directamente.'
                                }
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