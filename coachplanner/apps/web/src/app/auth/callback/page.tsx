'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { api } from '@/lib/api'; 

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithToken } = useAuth();
  
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

    const intentJson = localStorage.getItem('auth_intent');
    const intent = intentJson ? JSON.parse(intentJson) : null;
    
    localStorage.removeItem('auth_intent');

    console.log("🎯 Callback: Intención detectada:", intent);

    loginWithToken(token);
    
    toast.success('¡Autenticación exitosa!');

    if (intent?.type === 'REGISTER_OWNER') {
        console.log("🚀 Redirigiendo forzosamente a Onboarding de Negocio");
        router.push('/onboarding/business');
        return; 
    } 

    if (intent?.type === 'JOIN_GYM' && intent?.slug) {
        console.log("🚀 Procesando inscripción al gym:", intent.slug);
        
        api.post('/auth/join', { slug: intent.slug }, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(async () => {
             toast.success('¡Te has unido al gimnasio!', {
                 description: 'Configurando tu perfil...'
             });

             try {
                console.log("🔄 Refrescando token para obtener permisos de alumno...");
                const sessionData = await api.auth.refreshSession(token);
                
                if (sessionData && sessionData.access_token && sessionData.user) {
                    console.log("✅ Token actualizado. OrgID:", sessionData.user.organizationId);
                    login(sessionData.access_token, sessionData.user);
                }
             } catch (error) {
                console.error("⚠️ No se pudo refrescar la sesión automáticamente:", error);
             }

             router.push('/'); 
        })
        .catch((error) => {
             console.error("Error uniéndose al gym:", error);
             toast.error('Hubo un problema al unirte al gimnasio', {
                 description: 'Es posible que ya seas miembro o el enlace sea inválido.'
             });
             router.push('/');
        });
        
        return;
    } 

    console.log("🚀 Redirigiendo al Dashboard por defecto");
    router.push('/');

  }, [searchParams, router, login, loginWithToken]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground animate-pulse">
            Configurando tu cuenta...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CallbackContent />
    </Suspense>
  );
}