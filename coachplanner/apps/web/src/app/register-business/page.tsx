'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Briefcase } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function RegisterBusinessPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    organizationName: '',
    fullName: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar el negocio');
      }

      toast.success('¡Gimnasio creado!', {
        description: 'Tu cuenta de administrador está lista. Inicia sesión.',
      });

      router.push('/login');

    } catch (error: any) {
      toast.error('Error de registro', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            CoachPlanner para Profes
          </CardTitle>
          <CardDescription>
            Registra tu centro deportivo y empieza a gestionar tus clases hoy mismo.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="orgName">Nombre de tu Gimnasio / Marca</Label>
              <Input
                id="orgName"
                placeholder="Ej: Crossfit Fuego, Yoga Studio..."
                required
                disabled={isLoading}
                value={formData.organizationName}
                onChange={(e) =>
                  setFormData({ ...formData, organizationName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Tu Nombre Completo</Label>
              <Input
                id="fullName"
                placeholder="Ej: Marcos Entrenador"
                required
                disabled={isLoading}
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@tugimnasio.com"
                required
                disabled={isLoading}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                required
                minLength={6}
                disabled={isLoading}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando espacio...
                </>
              ) : (
                'Crear mi cuenta Admin'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 justify-center text-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link 
              href="/login" 
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            ¿Eres alumno? Pídele el link de registro a tu profesor.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}