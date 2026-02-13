'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api'; 
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Definimos la interfaz aquí para solucionar el error de tipo
interface Category {
  id: number;
  name: string;
}

export default function OnboardingCategoryPage() {
  // Extraemos 'login' también para actualizar el estado manualmente
  const { token, login, logout } = useAuth(); 
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;

    api.students.getAvailableCategories(token)
      .then((data: Category[]) => { // <--- Solución al error 'implicit any'
         setCategories(data);
         setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Error cargando las categorías");
      });
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedId || !token) return;
    setIsSubmitting(true);

    try {
      // 1. Guardar la categoría en la BD
      await api.students.updateCategory(token, selectedId);
      toast.success("¡Categoría guardada!");

      // 2. SOLUCIÓN ROBUSTA: Pedir token nuevo con los datos actualizados
      const sessionData = await api.auth.refreshSession(token);
      
      // sessionData debe traer { access_token: '...', user: { ... } }
      // Esto viene de tu auth.service.ts -> generateJwt

      if (sessionData.access_token && sessionData.user) {
        console.log("🔄 Token refrescado exitosamente. Nueva categoría:", sessionData.user.categoryId);
        
        // 3. Actualizar el contexto de React SIN recargar la página
        login(sessionData.access_token, sessionData.user);

        // 4. Redirigir al dashboard (ahora el Guard verá el categoryId y dejará pasar)
        router.push('/'); 
      } else {
        throw new Error("Respuesta de sesión inválida");
      }

    } catch (error) {
      console.error(error);
      toast.error("Error al finalizar el registro. Intenta ingresar nuevamente.");
      // Si falla el refresh, deslogueamos por seguridad
      logout();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando opciones...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-8 rounded-xl shadow-lg">
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Elige tu disciplina 🏋️</h1>
          <p className="mt-2 text-gray-600">Para personalizar tu experiencia, necesitamos saber qué practicas.</p>
        </div>

        <div className="grid gap-3 text-left">
          {categories.map((cat) => (
            <div 
              key={cat.id}
              onClick={() => setSelectedId(cat.id)}
              className={`
                cursor-pointer p-4 rounded-lg border-2 transition-all flex items-center justify-between
                ${selectedId === cat.id 
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
              `}
            >
              <span className="font-medium text-gray-900">{cat.name}</span>
              <div className={`
                h-5 w-5 rounded-full border flex items-center justify-center
                ${selectedId === cat.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}
              `}>
                {selectedId === cat.id && <div className="h-2 w-2 bg-white rounded-full" />}
              </div>
            </div>
          ))}
        </div>

        <Button 
          size="lg" 
          className="w-full bg-blue-600 hover:bg-blue-700" 
          disabled={!selectedId || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Finalizando...' : 'Confirmar y Entrar →'}
        </Button>

      </div>
    </div>
  );
}