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
  Crown,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUpgradeModal } from '@/context/upgrade-context';
import { DynamicLinkIcon } from '@/components/social-icon';

interface DashboardStats {
  role: 'OWNER' | 'STUDENT';
  cards: {
    totalRegistered?: number;
    activeStudents?: number;
    categoriesStats?: { name: string; count: number }[];
    maxStudents?: number;
    isPro?: boolean;
    classesToday?: number;
    totalCapacity?: number;
    totalBooked?: number;
    occupancyRate?: number;
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
  const [orgLinks, setOrgLinks] = useState<{id: string, label: string, url: string}[]>([]);

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
      const [statsRes, configRes] = await Promise.all([
         api.get('/dashboard/stats'),
         api.get('/organizations/config')
      ]);

      setStats(statsRes.data);

      if (configRes.data?.links) {
          setOrgLinks(configRes.data.links);
      }

      if (statsRes.data.cards?.registerSlug && typeof window !== 'undefined') {
        const origin = window.location.origin;
        setInviteLink(`${origin}/register/${statsRes.data.cards.registerSlug}`);
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
                
                {/* GRILLA OPTIMIZADA: 1 col en móvil, 2 en tablet, 4 en PC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    
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
                             {isNearLimit && <span className="text-xs font-bold text-orange-600 mb-1">¡Casi lleno!</span>}
                          </div>
                          
                          {!stats.cards.isPro && (
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-3">
                                <div 
                                    className={`h-full rounded-full ${isNearLimit ? 'bg-orange-500' : 'bg-blue-600'}`} 
                                    style={{ width: `${percentage}%` }}
                                />
                              </div>
                          )}
                          {stats.cards.isPro && (
                              <p className="text-xs text-indigo-600 font-medium mb-3">
                                  {stats.cards.totalRegistered} registrados en total
                              </p>
                          )}

                          <div className="flex flex-col gap-2 mt-2">
                            {isNearLimit && (
                                <Button 
                                    size="sm" 
                                    className="w-full h-8 text-xs bg-linear-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0"
                                    onClick={openUpgradeModal}
                                >
                                    <Crown className="h-3 w-3 mr-1" />
                                    Aumentar Cupo
                                </Button>
                            )}
                            <Link href="/students" className="block w-full">
                                <Button size="sm" variant="outline" className="w-full h-8 text-xs">Administrar</Button>
                            </Link>
                          </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Clases Hoy</CardTitle>
                          <LayoutDashboard className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent className="flex flex-col justify-between h-[calc(100%-2.5rem)]">
                          <div>
                              <div className="text-2xl font-bold">{stats.cards.classesToday}</div>
                              <p className="text-xs text-muted-foreground mb-4">Sesiones programadas</p>
                          </div>
                          <Link href="/classes" className="mt-auto block w-full">
                             <Button size="sm" variant="outline" className="w-full h-8 text-xs">Ver Calendario</Button>
                          </Link>
                      </CardContent>
                    </Card>

                    <Card className={stats.cards.expiringPacks! > 0 ? "border-red-200 bg-red-50/30" : ""}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className={`text-sm font-medium ${stats.cards.expiringPacks! > 0 ? 'text-red-700' : ''}`}>Packs por Vencer</CardTitle>
                          <AlertTriangle className={`h-4 w-4 ${stats.cards.expiringPacks! > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                      </CardHeader>
                      <CardContent className="flex flex-col justify-between h-[calc(100%-2.5rem)]">
                          <div>
                              <div className={`text-2xl font-bold ${stats.cards.expiringPacks! > 0 ? 'text-red-700' : ''}`}>{stats.cards.expiringPacks}</div>
                              <p className={`text-xs mb-4 ${stats.cards.expiringPacks! > 0 ? 'text-red-600/80' : 'text-muted-foreground'}`}>Vencen en próximos 7 días</p>
                          </div>
                          {stats.cards.expiringPacks! > 0 && (
                             <Link href="/students" className="mt-auto block w-full">
                                 <Button size="sm" variant="ghost" className="w-full h-8 text-xs text-red-600 hover:bg-red-100 hover:text-red-700">
                                   Revisar Alumnos
                                 </Button>
                             </Link>
                          )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Disciplinas (Activos)</CardTitle>
                          <Tag className="h-4 w-4 text-purple-500" />
                      </CardHeader>
                      <CardContent>
                          <div className="space-y-2.5 mt-1 overflow-y-auto max-h-27.5 pr-1 custom-scrollbar">
                              {stats.cards.categoriesStats && stats.cards.categoriesStats.length > 0 ? (
                                  stats.cards.categoriesStats.map((cat, index) => (
                                      <div key={index} className="flex items-center justify-between text-xs">
                                          <span className="text-gray-600 truncate mr-2">{cat.name}</span>
                                          <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-900">{cat.count}</span>
                                      </div>
                                  ))
                              ) : (
                                  <p className="text-xs text-gray-400 italic">No hay datos aún.</p>
                              )}
                          </div>
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
              </div>
            )}
            
            {orgLinks.length > 0 && (
                <div className="mt-12 pt-6 pb-2 flex justify-center border-t border-gray-200">
                  <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
                    {orgLinks
                      .filter(link => (link as any).isActive !== false)
                      .map(link => (
                      <a 
                        key={link.id} 
                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        <DynamicLinkIcon url={link.url} className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                        <span className="text-xs font-medium">
                            {link.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}