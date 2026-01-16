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
  ExternalLink 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  
  const [studentStats, setStudentStats] = useState({ credits: 0, bookings: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'STUDENT') {
      fetchStudentStats();
    } else if (user.role === 'OWNER' || user.role === 'ADMIN') {
      fetchOwnerConfig();
    }
  }, [user]);

  const fetchStudentStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/students/me');
      setStudentStats({ 
        credits: res.data.credits, 
        bookings: 0
      });
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar tu información de créditos');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchOwnerConfig = async () => {
    setLoadingConfig(true);
    try {
        const configRes = await api.get('/organizations/config');
        if (typeof window !== 'undefined' && configRes.data.slug) {
            const origin = window.location.origin;
            setInviteLink(`${origin}/register/${configRes.data.slug}`);
        }
    } catch (error) {
        console.error("Error cargando config para link", error);
    } finally {
        setLoadingConfig(false);
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

  const isOwner = user.role === 'OWNER' || user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Hola, {user.fullName?.split(' ')[0] || user.email.split('@')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {isOwner 
              ? 'Aquí tienes el resumen de tu actividad en el gimnasio.'
              : `Bienvenido. Tienes ${studentStats.credits} créditos disponibles para entrenar.`
            }
          </p>
        </div>

        {/* --- VISTA DE PROFESOR --- */}
        {isOwner ? (
          <div className="space-y-6">
            
            {inviteLink && (
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                            <LinkIcon className="h-5 w-5" /> Enlace de Registro para Alumnos
                        </CardTitle>
                        <CardDescription>
                            Comparte este link con tus alumnos para que se registren directamente en tu gimnasio.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input 
                                    value={inviteLink} 
                                    readOnly 
                                    className="pr-10 bg-white border-blue-200 text-gray-600 font-mono text-sm" 
                                />
                            </div>
                            <Button onClick={copyToClipboard} className="shrink-0 gap-2 min-w-25">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'Copiado' : 'Copiar'}
                            </Button>
                            <Link href={inviteLink} target="_blank">
                                <Button variant="ghost" size="icon" title="Probar enlace">
                                    <ExternalLink className="h-4 w-4 text-gray-500" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Clases Activas</CardTitle>
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-muted-foreground">Programadas esta semana</p>
                    <Link href="/categories">
                    <Button className="w-full mt-4" variant="outline">Configurar Categorías</Button>
                    </Link>
                </CardContent>
                </Card>

                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alumnos Totales</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-muted-foreground">Activos en el sistema</p>
                    <Link href="/students">
                    <Button className="w-full mt-4" variant="outline">Ver Alumnos</Button>
                    </Link>
                </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle>Acciones Rápidas</CardTitle>
                    <CardDescription>Atajos para tu gestión</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <Link href="/classes">
                    <Button className="w-full">Gestionar Horarios</Button>
                    </Link>
                    <Link href="/students">
                    <Button variant="secondary" className="w-full">Cargar Créditos</Button>
                    </Link>
                </CardContent>
                </Card>
            </div>
          </div>
        ) : (
          
          /* --- VISTA DE ALUMNO --- */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mis Próximas Clases</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Reservas confirmadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Créditos Disponibles</CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {loadingStats ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    studentStats.credits
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {studentStats.credits > 0 ? '¡A entrenar!' : 'Sin saldo disponible'}
                </p>
              </CardContent>
            </Card>

            <Card className="col-span-full lg:col-span-1 bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-white">Reservar Clase</CardTitle>
                <CardDescription className="text-blue-100">
                  Busca tu próxima sesión de entrenamiento.
                </CardDescription>
              </CardHeader>
              <CardContent>
              <Link href="/book">
                <Button variant="secondary" className="w-full">
                  Ver Calendario
                </Button>
              </Link>
            </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}