'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Briefcase } from 'lucide-react';

export default function OnboardingBusinessPage() {
  const router = useRouter();
  const { token, loginWithToken } = useAuth(); // <--- Usamos loginWithToken
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',     
    fullName: ''  
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.fullName.trim()) {
       toast.warning('Completa todos los campos');
       return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/organizations/onboarding', formData, {
         headers: { Authorization: `Bearer ${token}` }
      });

      // --- CAMBIO CLAVE AQUÍ ---
      // El backend ahora nos devuelve un nuevo token con el rol OWNER
      const newAccessToken = res.data.access_token;

      if (newAccessToken) {
          console.log("🔄 Actualizando permisos de usuario...");
          // Actualizamos el contexto y las cookies con el token nuevo
          loginWithToken(newAccessToken);
      }
      // -------------------------

      toast.success('¡Todo listo!', { description: 'Tu gimnasio ha sido configurado.' });
      
      // Esperamos un micro-segundo para que el estado se propague (opcional pero seguro)
      setTimeout(() => {
          router.push('/'); 
      }, 100);
      
    } catch (error: any) {
      console.error(error);
      toast.error('Error', { description: error.response?.data?.message || 'Algo salió mal' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... (Tu JSX sigue igual que antes)
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Configura tu Gimnasio</CardTitle>
            <CardDescription>
                Ya casi terminamos. Solo necesitamos el nombre de tu negocio.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Tu Nombre</Label>
                    <Input 
                        value={formData.fullName} 
                        onChange={e => setFormData({...formData, fullName: e.target.value})} 
                        placeholder="Ej: Juan Pérez"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Nombre del Gimnasio</Label>
                    <Input 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        placeholder="Ej: PowerGym"
                    />
                </div>
                <Button className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Finalizar Registro'}
                </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}