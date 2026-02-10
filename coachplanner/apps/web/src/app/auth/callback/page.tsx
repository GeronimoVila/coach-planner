'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { toast } from 'sonner';
import { api } from '@/lib/api'; // <--- IMPORTANTE: Importar la instancia de Axios

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  
  // Usamos useRef para garantizar que la lógica corra una sola vez
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const token = searchParams.get('token');
    
    if (!token) {
      toast.error('Error de autenticación');
      router.push('/login');
      return;
    }

    // Marcamos como procesado
    processedRef.current = true;

    // 1. Recuperamos la intención
    const intentJson = localStorage.getItem('auth_intent');
    const intent = intentJson ? JSON.parse(intentJson) : null;
    
    // Limpiamos la intención
    localStorage.removeItem('auth_intent');

    console.log("🎯 Callback: Intención detectada:", intent);

    // 2. Iniciamos sesión
    loginWithToken(token);
    
    toast.success('¡Autenticación exitosa!');

    // 3. Lógica de Redirección Estricta

    // CASO 1: Registro de Dueño
    if (intent?.type === 'REGISTER_OWNER') {
        console.log("🚀 Redirigiendo forzosamente a Onboarding de Negocio");
        router.push('/onboarding/business');
        return; 
    } 

    // CASO 2: Unirse a un gimnasio (Registro de Alumno)
    if (intent?.type === 'JOIN_GYM' && intent?.slug) {
        console.log("🚀 Procesando inscripción al gym:", intent.slug);
        
        // --- LLAMADA A LA API PARA VINCULAR ---
        // Usamos el token directamente en el header por si el contexto aún no se actualizó
        api.post('/auth/join', { slug: intent.slug }, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(() => {
             toast.success('¡Te has unido al gimnasio!', {
                 description: 'Ya puedes reservar tus clases.'
             });
             router.push('/'); // Redirigimos al Dashboard
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

    // Destino por defecto
    console.log("🚀 Redirigiendo al Dashboard por defecto");
    router.push('/');

  }, [searchParams, router, loginWithToken]);

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