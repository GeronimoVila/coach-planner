'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, History, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CreditPackage {
  id: string;
  name: string | null;
  initialAmount: number;
  remainingAmount: number;
  expiresAt: string;
  createdAt: string;
}

export default function CreditsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [totalCredits, setTotalCredits] = useState(0);
  const [packages, setPackages] = useState<CreditPackage[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'STUDENT') {
      router.push('/'); 
      return;
    }

    fetchData();
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/students/me');
      setTotalCredits(statsRes.data.credits);

      const packsRes = await api.get('/credit-packages/me');
      setPackages(packsRes.data);
    } catch (error) {
      console.error('Error cargando créditos', error);
    } finally {
      setLoading(false);
    }
  };

  const getPackageStatus = (pkg: CreditPackage) => {
    const isExpired = new Date(pkg.expiresAt) < new Date();
    const isDepleted = pkg.remainingAmount === 0;

    if (isDepleted) return { label: 'Agotado', color: 'bg-gray-100 text-gray-500', icon: CheckCircle2 };
    if (isExpired) return { label: 'Vencido', color: 'bg-red-100 text-red-700', icon: XCircle };
    return { label: 'Activo', color: 'bg-green-100 text-green-700', icon: CreditCard };
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Créditos</h1>
          <p className="text-muted-foreground">Gestiona tu saldo y revisa tu historial de compras.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white border-l-4 border-l-primary shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Saldo Disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900 flex items-baseline gap-2">
                {loading ? <Loader2 className="animate-spin h-8 w-8" /> : totalCredits}
                <span className="text-lg font-normal text-gray-500">clases</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Puedes usarlos para reservar cualquier clase disponible.
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <CardTitle>Historial de Paquetes</CardTitle>
            </div>
            <CardDescription>
              Detalle de tus cargas de clases y sus vencimientos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tienes historial de cargas aún.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Paquete</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Fecha Carga</th>
                      <th className="px-4 py-3 text-center">Clases</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Vencimiento</th>
                      <th className="px-4 py-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {packages.map((pkg) => {
                      const status = getPackageStatus(pkg);
                      const StatusIcon = status.icon;

                      return (
                        <tr key={pkg.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {pkg.name || 'Pack Sin Nombre'}
                            <div className="sm:hidden text-xs text-gray-500 mt-1">
                              Vence: {format(new Date(pkg.expiresAt), 'dd/MM/yy')}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                            {format(new Date(pkg.createdAt), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-gray-900">{pkg.remainingAmount}</span>
                            <span className="text-gray-400"> / {pkg.initialAmount}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                            {format(new Date(pkg.expiresAt), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}