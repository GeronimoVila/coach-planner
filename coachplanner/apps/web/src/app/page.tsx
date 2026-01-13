'use client';

import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, LogOut, LayoutDashboard, CalendarDays, Users, Dumbbell } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();

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
      
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Dumbbell className="h-5 w-5" />
            </div>
            CoachPlanner
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {isOwner ? 'Administrador' : 'Alumno'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Cerrar Sesión">
              <LogOut className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Hola, {user.email.split('@')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí tienes el resumen de tu actividad en el gimnasio.
          </p>
        </div>

        {/* --- VISTA DE PROFESOR / DUEÑO --- */}
        {isOwner ? (
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clases Activas</CardTitle>
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
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
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">+0% desde el mes pasado</p>
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
                  <Button variant="secondary" className="w-full">Invitar Alumnos</Button>
                </Link>
              </CardContent>
            </Card>
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
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Reservas confirmadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Créditos Disponibles</CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Plan actual: Estándar</p>
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
                <Button variant="secondary" className="w-full">
                  Ver Calendario
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}