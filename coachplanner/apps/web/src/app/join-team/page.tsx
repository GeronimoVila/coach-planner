'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Users, CheckCircle, EyeOff, Eye } from 'lucide-react';
import { GoogleButton } from "@/components/auth/google-button";

export default function JoinTeamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const { user, isLoading, login, switchOrganization } = useAuth();
  
  const [isAccepting, setIsAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [inviteInfo, setInviteInfo] = useState<{email: string, gymName: string} | null>(null);
  const [formData, setFormData] = useState({ fullName: '', password: '', phoneNumber: '' });

  useEffect(() => {
    if (!token) {
      toast.error('Enlace inválido');
      router.push('/');
      return;
    }

    localStorage.setItem('redirect_after_login', `/join-team?token=${token}`);

    api.auth.getInvitationInfo(token)
      .then(res => setInviteInfo(res.data))
      .catch(() => {
        toast.error('Invitación inválida o expirada');
        router.push('/');
      });

  }, [token, router]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteInfo) return;
    setIsAuthLoading(true);

    try {
      if (authMode === 'login') {
        const response = await api.post("/auth/login", { 
          email: inviteInfo.email, 
          password: formData.password 
        });
        login(response.data.access_token, response.data.user);
        toast.success("¡Sesión iniciada!");

      } else {
        // --- MODO REGISTRO MÁGICO ---
        if (formData.password.length < 8) {
          toast.error("La contraseña debe tener al menos 8 caracteres.");
          setIsAuthLoading(false);
          return;
        }
        
        const response = await api.auth.registerInvited({
          token,
          fullName: formData.fullName,
          password: formData.password,
          phoneNumber: formData.phoneNumber
        });

        localStorage.removeItem('redirect_after_login');
        
        toast.success("¡Cuenta creada y unida con éxito!");
        login(response.access_token, response.user);
        setTimeout(() => router.push('/'), 1500);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error en la autenticación');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAcceptLogged = async () => {
    if (!token) return;
    setIsAccepting(true);

    try {
      const res = await api.organizations.acceptInvitation(token);
      localStorage.removeItem('redirect_after_login');
      toast.success(res.data.message);
      setSuccess(true);
      
      const sessionData = await api.auth.refreshSession(token);
      if (sessionData.access_token) {
        setTimeout(() => switchOrganization(sessionData.access_token), 1500);
      } else {
        router.push('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al aceptar');
      setIsAccepting(false);
    }
  };

  if (isLoading || !inviteInfo) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border border-gray-100">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4 text-blue-600">
            {success ? <CheckCircle className="h-8 w-8" /> : <Users className="h-8 w-8" />}
          </div>
          <CardTitle className="text-2xl">
            {user ? 'Invitación al Equipo' : `Únete a ${inviteInfo.gymName}`}
          </CardTitle>
          <CardDescription>
            {success ? '¡Configurando tu panel...' : `Has sido invitado con el correo ${inviteInfo.email}`}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          {!user ? (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button 
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md ${authMode === 'register' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  onClick={() => setAuthMode('register')}
                >
                  Soy Nuevo
                </button>
                <button 
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md ${authMode === 'login' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  onClick={() => setAuthMode('login')}
                >
                  Ya tengo cuenta
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={inviteInfo.email} disabled className="bg-gray-100 text-gray-500" />
                </div>

                {authMode === 'register' && (
                  <>
                    <div className="space-y-2">
                      <Label>Nombre Completo</Label>
                      <Input required placeholder="Ej: Martín Profe" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Número de Celular</Label>
                      <Input required type="tel" placeholder="Ej: 1123456789" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <Input required type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isAuthLoading}>
                  {isAuthLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  {authMode === 'login' ? 'Ingresar y Unirse' : 'Crear Cuenta y Unirse'}
                </Button>
              </form>

              <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">O continuar con</span></div></div>
              <GoogleButton mode="REGISTER_USER" text="Continuar con Google" />
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-700">Has iniciado sesión como <strong className="text-blue-600">{user.email}</strong></div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg" onClick={handleAcceptLogged} disabled={isAccepting || success}>
                {isAccepting ? <Loader2 className="animate-spin mr-2" /> : 'Aceptar Invitación y Unirse'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}