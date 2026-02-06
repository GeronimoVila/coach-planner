'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Loader2, 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Building, 
  Ticket,
  Pencil, 
  Check,  
  X,
  Lock,
  Key,
  ScanFace
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface UserDetail {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
  createdAt: string;
  ownedGyms: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  }[];
  memberships: {
    gymName: string;
    role: string;
    credits: number;
    joinedAt: string;
  }[];
  stats: {
    classesTaught: number;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (!params?.id) return;

    const fetchUser = async () => {
      try {
        const { data } = await api.get(`/admin/users/${params.id}`);
        setUser(data);
        setNewEmail(data.email); 
      } catch (error) {
        toast.error('No se pudo cargar el usuario');
        router.push('/admin/users');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [params?.id, router]);

  const handleUpdateEmail = async () => {
    if (!user || !newEmail) return;
    
    if (!newEmail.includes('@') || !newEmail.includes('.')) {
        toast.error('Formato de email inválido');
        return;
    }

    setSavingEmail(true);
    try {
      await api.patch(`/admin/users/${user.id}/email`, { email: newEmail });
      setUser({ ...user, email: newEmail });
      setIsEditingEmail(false);
      toast.success('Email actualizado correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsResetting(true);
    try {
      await api.patch(`/admin/users/${params.id}/password`, { password: resetPassword });
      toast.success('Contraseña actualizada correctamente');
      setResetPassword(''); 
    } catch (error) {
      toast.error('Error al actualizar la contraseña');
    } finally {
      setIsResetting(false);
    }
  };

  const handleImpersonate = async () => {
    if (!user) return;
    
    if (!confirm(`¿Estás seguro que quieres entrar al sistema como ${user.email}?`)) return;

    setIsImpersonating(true);
    try {
      const { data } = await api.post('/auth/impersonate', { userId: user.id });
      
      localStorage.setItem('token', data.access_token);
      
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      document.cookie = `token=${data.access_token}; path=/;`;

      toast.success(`Iniciando sesión como ${user.fullName || user.email}...`);

      window.location.href = '/dashboard'; 

    } catch (error) {
      toast.error('Error al intentar suplantar identidad');
      setIsImpersonating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/admin/users">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a la lista
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
          
          <div className="flex flex-row items-center gap-4 flex-1">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-500 uppercase shrink-0">
               {user.fullName ? user.fullName[0] : user.email[0]}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl truncate">{user.fullName || 'Sin nombre'}</CardTitle>
              
              <div className="flex items-center gap-2 mt-1 h-8">
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                
                {isEditingEmail ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <Input 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-7 w-64 text-sm"
                      disabled={savingEmail}
                    />
                    <Button 
                      size="icon" 
                      className="h-7 w-7 bg-green-600 hover:bg-green-700" 
                      onClick={handleUpdateEmail}
                      disabled={savingEmail}
                    >
                      {savingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                          setIsEditingEmail(false);
                          setNewEmail(user.email); 
                      }}
                      disabled={savingEmail}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <span className="text-muted-foreground">{user.email}</span>
                    <button 
                      onClick={() => setIsEditingEmail(true)}
                      className="text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Editar email"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Badge className={user.role === 'ADMIN' ? 'bg-purple-600' : user.role === 'OWNER' ? 'bg-blue-600' : 'bg-gray-600'}>
                  {user.role}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Registrado el {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {user.role !== 'ADMIN' && (
            <Button 
              variant="outline" 
              className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 shrink-0"
              onClick={handleImpersonate}
              disabled={isImpersonating}
              title="Iniciar sesión como este usuario"
            >
              {isImpersonating ? (
                <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
              ) : (
                <ScanFace className="h-4 w-4 md:mr-2" />
              )}
              <span className="hidden md:inline">Acceder como Usuario</span>
            </Button>
          )}

        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {user.ownedGyms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-500" /> Negocios Propios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {user.ownedGyms.map((gym) => (
                  <li key={gym.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{gym.name}</p>
                      <p className="text-xs text-muted-foreground">/{gym.slug}</p>
                    </div>
                    <Badge variant={gym.isActive ? 'outline' : 'destructive'}>
                      {gym.isActive ? 'Activo' : 'Suspendido'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-green-500" /> Membresías
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pertenece a ningún gimnasio.</p>
            ) : (
              <ul className="space-y-3">
                {user.memberships.map((m, index) => (
                  <li key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{m.gymName}</p>
                      <p className="text-xs text-muted-foreground">Rol: {m.role}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{m.credits} créditos</div>
                      <div className="text-[10px] text-muted-foreground">
                        Desde: {new Date(m.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-100 bg-red-50/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Lock className="h-5 w-5 text-gray-500" /> Seguridad
          </CardTitle>
          <CardDescription>
            Restablecer contraseña manualmente. El usuario deberá usar esta nueva clave para ingresar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 max-w-md">
            <div className="grid w-full gap-1.5">
              <label htmlFor="pass" className="text-sm font-medium text-gray-700">
                Nueva Contraseña Temporal
              </label>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="pass"
                  type="text" 
                  placeholder="Ej: Gimnasio123"
                  className="pl-9 bg-white"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
              </div>
            </div>
            <Button 
              onClick={handleResetPassword} 
              disabled={!resetPassword || isResetting}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}