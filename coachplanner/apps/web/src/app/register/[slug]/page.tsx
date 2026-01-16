'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Loader2, AlertCircle, Tag } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Category {
  id: number;
  name: string;
}

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [gymName, setGymName] = useState<string>(''); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCheckingGym, setIsCheckingGym] = useState(true);
  const [gymError, setGymError] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    categoryId: '',
  });

  useEffect(() => {
    const fetchGymInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/gym-info/${slug}`);
        if (!res.ok) throw new Error('Gym no encontrado');
        
        const data = await res.json();
        setGymName(data.name);
        
        if (data.categories && Array.isArray(data.categories)) {
            setCategories(data.categories);
        }

      } catch (error) {
        setGymError(true);
      } finally {
        setIsCheckingGym(false);
      }
    };

    if (slug) fetchGymInfo();
  }, [slug]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/register/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            categoryId: formData.categoryId ? Number(formData.categoryId) : undefined
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Ocurrió un error al registrarse');
      }

      toast.success(`¡Bienvenido a ${gymName}!`, {
        description: 'Tu cuenta ha sido creada exitosamente. Inicia sesión para continuar.',
      });
      
      router.push('/login'); 
    } catch (error: any) {
      toast.error('Error de Registro', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingGym) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (gymError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Enlace inválido</CardTitle>
            <CardDescription>
              El gimnasio que buscas no existe o el enlace ha expirado.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => router.push('/login')}>
              Volver al Inicio
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-lg border-gray-200">
        
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Crear una cuenta
          </CardTitle>
          <CardDescription>
            Regístrate para reservar clases en{' '}
            <span className="font-semibold text-primary text-lg">
              {gymName} 
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                placeholder="Ej: Juan Pérez"
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@ejemplo.com"
                required
                disabled={isSubmitting}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            {categories.length > 0 && (
                <div className="space-y-2">
                <Label htmlFor="category">Disciplina / Categoría</Label>
                <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                    disabled={isSubmitting}
                    >
                    <option value="">Selecciona una opción...</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                        {cat.name}
                        </option>
                    ))}
                    </select>
                </div>
                </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                required
                minLength={6}
                disabled={isSubmitting}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <p className="text-[0.8rem] text-muted-foreground">
                Mínimo 6 caracteres
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Registrarse'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link 
              href="/login" 
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}