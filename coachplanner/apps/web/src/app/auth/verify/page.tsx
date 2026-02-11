'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando tu cuenta...');
  
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('El enlace de verificación es inválido (falta el token).');
      return;
    }

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    api.get(`/auth/verify?token=${token}`)
      .then(() => {
        setStatus('success');
        setMessage('¡Tu correo ha sido verificado correctamente!');
      })
      .catch((error: any) => {
        console.error(error);
        setStatus('error');
        setMessage(
          error.response?.data?.message || 
          'El enlace ha expirado o ya fue utilizado.'
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center flex flex-col items-center">
          
          {status === 'loading' && (
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
          )}
          
          {status === 'success' && (
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          )}

          {status === 'error' && (
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          )}

          <CardTitle>
            {status === 'loading' && 'Verificando...'}
            {status === 'success' && '¡Verificación Exitosa!'}
            {status === 'error' && 'Error de Verificación'}
          </CardTitle>
          
          <CardDescription className="text-center mt-2 text-base">
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex justify-center pb-8">
          {status === 'loading' ? (
             <p className="text-sm text-muted-foreground animate-pulse">Por favor espera un momento...</p>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {status === 'success' ? (
                <Button asChild className="w-full" size="lg">
                  <Link href="/login">
                    Iniciar Sesión <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" asChild className="w-full">
                  <Link href="/login">
                    Volver al Inicio
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}