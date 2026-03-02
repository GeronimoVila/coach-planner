'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function OnboardingPhonePage() {
  const { token, login, logout } = useAuth(); 
  const router = useRouter();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const phoneTrimmed = phoneNumber.replace(/\s+/g, '');
    if (phoneTrimmed.length < 8) {
      toast.error('Número muy corto', {
        description: 'Por favor ingresa un número de teléfono válido (mínimo 8 caracteres).'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await api.students.updatePhone(token, phoneNumber);
      toast.success("¡Teléfono guardado!");

      const sessionData = await api.auth.refreshSession(token);

      if (sessionData.access_token && sessionData.user) {
        login(sessionData.access_token, sessionData.user);
        
        try {
          const myStudentData = await api.students.getMe(sessionData.access_token);
          
          if (myStudentData.categoryId === null) {
            router.push('/onboarding/category');
          } else {
            router.push('/');
          }
        } catch (routingError) {
          console.error("Error al validar categoría:", routingError);
          router.push('/');
        }

      } else {
        throw new Error("Respuesta de sesión inválida");
      }

    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el teléfono. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-8 rounded-xl shadow-lg border">
        
        <div>
          <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            📱
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Últimos paso</h1>
          <p className="mt-2 text-gray-600">
            Para completar tus datos, necesitamos tu número de celular.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de Celular</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Ej: 11 1234-5678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isSubmitting}
              required
              className="text-lg py-6"
            />
          </div>

          <Button 
            type="submit"
            size="lg" 
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={!phoneNumber || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar y Entrar →'}
          </Button>
        </form>

      </div>
    </div>
  );
}