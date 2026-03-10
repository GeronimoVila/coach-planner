'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CreditCard, 
  History, 
  CheckCircle2, 
  XCircle, 
  ScrollText,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
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

interface HistoryLog {
  id: string;
  action: 'RESERVED' | 'CANCELLED';
  date: string;
  className: string;
  instructorName: string;
  classDate: string;
  creditsMovement: number;
}

export default function CreditsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [totalCredits, setTotalCredits] = useState(0);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return;
    fetchHistoryPage();
  }, [historyPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, packsRes] = await Promise.all([
        api.get('/students/me'),
        api.get('/credit-packages/me')
      ]);

      setTotalCredits(statsRes.data.credits);

      const sortedPacks = packsRes.data.sort((a: CreditPackage, b: CreditPackage) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPackages(sortedPacks);

      await fetchHistoryPage();

    } catch (error) {
      console.error('Error cargando créditos', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryPage = async () => {
    setLoadingHistory(true);
    try {
      const historyRes = await api.get(`/bookings/history?page=${historyPage}&limit=10`);
      
      const sortedHistory = historyRes.data.data.sort((a: HistoryLog, b: HistoryLog) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setHistory(sortedHistory);
      setTotalPages(historyRes.data.meta.totalPages);
    } catch (error) {
      console.error('Error cargando historial de reservas', error);
    } finally {
      setLoadingHistory(false);
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
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Créditos</h1>
          <p className="text-muted-foreground">Gestiona tu saldo y revisa tus movimientos.</p>
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
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-blue-500" />
                    <CardTitle>Movimientos de Créditos</CardTitle>
                </div>
                <CardDescription>Cronología de tus reservas y cancelaciones.</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingHistory || loading ? (
                    <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                        <p>No hay movimientos registrados.</p>
                    </div>
                ) : (
                    <div className="rounded-md border overflow-hidden bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm relative">
                                <thead className="bg-gray-50 text-gray-500 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium bg-gray-50 whitespace-nowrap">Acción</th>
                                        <th className="px-4 py-3 text-left font-medium bg-gray-50 min-w-50">Clase / Instructor</th>
                                        <th className="px-4 py-3 text-center font-medium bg-gray-50 whitespace-nowrap">Créditos</th>
                                        <th className="px-4 py-3 text-right font-medium bg-gray-50 whitespace-nowrap">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {history.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                {item.action === 'RESERVED' ? (
                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 shadow-none font-normal">
                                                        Reserva
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 font-normal">
                                                        Cancelación
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900">{item.className}</div>
                                                <div className="text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center gap-1 mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" /> {item.instructorName}
                                                    </span>
                                                    <span className="hidden sm:inline text-gray-300">|</span>
                                                    <span>
                                                        {format(new Date(item.classDate), "d 'de' MMM, HH:mm'hs'", { locale: es })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-bold ${item.creditsMovement > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {item.creditsMovement > 0 ? '+' : ''}{item.creditsMovement}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                                                {format(new Date(item.date), "dd/MM/yy HH:mm")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                            <span className="text-sm text-gray-500">
                              Página {historyPage} de {totalPages}
                            </span>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                disabled={historyPage === 1 || loadingHistory}
                              >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                                disabled={historyPage === totalPages || loadingHistory}
                              >
                                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-500" />
              <CardTitle>Historial de Compras</CardTitle>
            </div>
            <CardDescription>
              Paquetes de clases adquiridos, ordenados por fecha de carga.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <p>No tienes historial de compras.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-white">
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm text-left relative">
                    <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10 border-b">
                        <tr>
                        <th className="px-4 py-3 bg-gray-50 whitespace-nowrap">Paquete</th>
                        <th className="px-4 py-3 hidden sm:table-cell bg-gray-50">Carga</th>
                        <th className="px-4 py-3 text-center bg-gray-50">Clases</th>
                        <th className="px-4 py-3 hidden sm:table-cell bg-gray-50">Vencimiento</th>
                        <th className="px-4 py-3 text-right bg-gray-50">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {packages.map((pkg) => {
                        const status = getPackageStatus(pkg);
                        const StatusIcon = status.icon;

                        return (
                            <tr key={pkg.id} className="bg-white hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                {pkg.name || 'Pack Estándar'}
                            </td>
                            <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                                {format(new Date(pkg.createdAt), 'dd/MM/yy', { locale: es })}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                <span className="font-semibold text-gray-900">{pkg.remainingAmount}</span>
                                <span className="text-gray-400"> / {pkg.initialAmount}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                                {format(new Date(pkg.expiresAt), 'dd MMM yyyy', { locale: es })}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
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
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}