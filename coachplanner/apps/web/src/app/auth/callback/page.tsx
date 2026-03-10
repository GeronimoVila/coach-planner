'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { api } from '@/lib/api'; 

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const token = searchParams.get('token');
    
    if (!token) {
      toast.error('Error de autenticación');
      router.push('/login');
      return;
    }

    processedRef.current = true;

    const processAuth = async () => {
      const intentJson = localStorage.getItem('auth_intent');
      const intent = intentJson ? JSON.parse(intentJson) : null;
      localStorage.removeItem('auth_intent');

      try {
        const sessionData = await api.auth.refreshSession(token);
        
        if (!sessionData || !sessionData.access_token || !sessionData.user) {
          throw new Error("Datos de sesión inválidos");
        }

        let currentToken = sessionData.access_token;
        let currentUser = sessionData.user;

        login(currentToken, currentUser);

        const redirectUrl = localStorage.getItem('redirect_after_login');

        if (intent?.type === 'REGISTER_OWNER') {
          toast.success('¡Autenticación exitosa!');
          router.push('/onboarding/business');
          return; 
        } 

        if (intent?.type === 'JOIN_GYM' && intent?.slug) {
          try {
            await api.post('/auth/join', { slug: intent.slug }, {
              headers: { Authorization: `Bearer ${currentToken}` }
            });
            toast.success('¡Te has unido al gimnasio!', {
              description: 'Configurando tu perfil...'
            });

            const refreshed = await api.auth.refreshSession(currentToken);
            currentToken = refreshed.access_token;
            currentUser = refreshed.user;
            login(currentToken, currentUser);

          } catch (error) {
            console.error("Error uniéndose al gym:", error);
          }
        }

        if (intent?.type === 'REGISTER_USER' || redirectUrl) {
            toast.success('¡Autenticación exitosa!');
            if (redirectUrl) {
                localStorage.removeItem('redirect_after_login');
                router.push(redirectUrl);
            } else {
                router.push('/');
            }
            return;
        }

        if (currentUser.role === 'STUDENT') {
          if (!currentUser.phoneNumber) {
            router.push('/onboarding/phone');
            return; 
          }

          try {
            if (currentUser.organizationId) {
                const myStudentData = await api.students.getMe(currentToken);
                if (myStudentData.categoryId === null) {
                  router.push('/onboarding/category');
                  return;
                }
            }
          } catch (err) {
            console.error("Error validando categoría:", err);
          }
        }

        toast.success('¡Autenticación exitosa!');
        router.push('/');

      } catch (error) {
        console.error("Error en el flujo de autenticación:", error);
        toast.error('Hubo un problema al validar tu cuenta.');
        router.push('/login');
      }
    };

    processAuth();

  }, [searchParams, router, login]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground animate-pulse">
            Validando información y configurando cuenta...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Cargando...</div>}>
      <CallbackContent />
    </Suspense>
  );
}