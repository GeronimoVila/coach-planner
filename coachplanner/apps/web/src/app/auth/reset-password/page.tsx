'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('El enlace es inválido o no contiene el token de seguridad.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
        setStatus('error');
        setMessage('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      await api.post('/auth/reset-password', { 
        token, 
        password 
      });
      
      setStatus('success');
      setMessage('¡Tu contraseña ha sido actualizada correctamente!');
      
      setTimeout(() => router.push('/login'), 3000);

    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error.response?.data?.message || 'El enlace ha expirado o es inválido. Solicita uno nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
             <Card className="w-full max-w-md p-6 text-center">
                 <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                 <h2 className="text-xl font-bold mb-2">Enlace Inválido</h2>
                 <p className="text-gray-600 mb-6">No se encontró el código de seguridad necesario.</p>
                 <Button asChild><Link href="/login">Volver al Inicio</Link></Button>
             </Card>
        </div>
     )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Nueva Contraseña</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'success' ? (
            <div className="flex flex-col items-center space-y-4 py-6">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-700">¡Contraseña Actualizada!</h3>
              <p className="text-center text-sm text-gray-600">
                Serás redirigido al inicio de sesión en unos segundos...
              </p>
              <Button asChild className="w-full mt-4">
                <Link href="/login">Ir a Iniciar Sesión Ahora</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                    id="password" 
                    type="password" 
                    className="pl-9"
                    placeholder="******" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                    id="confirmPassword" 
                    type="password" 
                    className="pl-9"
                    placeholder="******" 
                    required 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
              </div>

              {status === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}