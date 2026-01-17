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
import { Loader2, AlertCircle, Tag, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Category {
  id: number;
  name: string;
}

export default function RegisterStudentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [gymName, setGymName] = useState<string>(''); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCheckingGym, setIsCheckingGym] = useState(true);
  const [gymError, setGymError] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    
    if (
      !formData.name.trim() || 
      !formData.email.trim() || 
      !formData.password || 
      !formData.confirmPassword
    ) {
      toast.warning('Faltan datos', {
        description: 'Por favor, completa nombre, email y contraseñas.'
      });
      return;
    }

    if (categories.length > 0 && !formData.categoryId) {
       toast.warning('Falta la categoría', {
         description: 'Debes seleccionar una disciplina o categoría.'
       });
       return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(formData.email)) {
      toast.error('Correo electrónico inválido', {
        description: 'Por favor verifica que tenga el formato correcto (ej: usuario@gmail.com).'
      });
      return;
    }

    if (formData.password.length < 8) {
      toast.error('La contraseña es muy corta', {
        description: 'Debe tener al menos 8 caracteres.'
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/register/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
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
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                placeholder="Ej: Juan Pérez"
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {categories.length > 0 && (
                <div className="space-y-2">
                <Label htmlFor="category">Disciplina / Categoría</Label>
                <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="relative">
                <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="******"
                    required
                    disabled={isSubmitting}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-10"
                />
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[0.8rem] text-muted-foreground">Mínimo 8 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="******"
                    required
                    disabled={isSubmitting}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pr-10"
                />
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full px-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando cuenta...
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
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}