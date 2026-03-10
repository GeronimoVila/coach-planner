'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, Mail, Calendar, Phone, Activity, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface StudentProfile {
  id: string;
  fullName: string | null;
  email: string;
  phoneNumber: string | null;
  joinedAt: string;
  credits: number;
  status: string;
  categoryName?: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  performedBy: { fullName: string | null } | null;
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!params?.id) return;
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/students/${params.id}`);
        setStudent(data);
      } catch (error) {
        toast.error('No se pudo cargar el perfil del alumno');
        router.push('/students');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [params?.id, router]);

  useEffect(() => {
    if (!params?.id) return;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data } = await api.get(`/students/${params.id}/credit-history?page=${historyPage}&limit=10`);
        setHistory(data.data);
        setTotalPages(data.meta.totalPages);
      } catch (error) {
        console.error('Error cargando historial:', error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [params?.id, historyPage]);

  const getBadgeStyle = (amount: number, type: string) => {
    if (amount > 0) return "bg-green-100 text-green-800 border-green-200";
    if (amount < 0) return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col p-4 md:p-8 space-y-6">
      <div className="max-w-5xl mx-auto w-full">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/students">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Alumnos
          </Link>
        </Button>

        <Card className="mb-6 border-none shadow-sm">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-700 border-4 border-white shadow-sm shrink-0">
                {student.fullName ? student.fullName[0].toUpperCase() : student.email[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{student.fullName || 'Sin nombre'}</h1>
                <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {student.email}</span>
                  {student.phoneNumber && (
                    <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {student.phoneNumber}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-row md:flex-col gap-4 md:gap-2 w-full md:w-auto p-4 md:p-0 bg-gray-50 md:bg-transparent rounded-lg">
              <div className="flex-1 text-center md:text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Estado</p>
                <Badge className={student.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}>
                  {student.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="flex-1 text-center md:text-right">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Créditos Disponibles</p>
                <span className={`text-xl font-bold ${student.credits > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {student.credits}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-purple-500" /> Historial de Créditos
            </CardTitle>
            <CardDescription>
              Registro de consumos, recargas y devoluciones de este alumno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Concepto</th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-center">Movimiento</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Autorizado por</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No hay movimientos registrados.
                      </td>
                    </tr>
                  ) : (
                    history.map((tx) => (
                      <tr key={tx.id} className="bg-white border-b hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {new Date(tx.createdAt).toLocaleDateString('es-ES', { 
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {tx.description || tx.type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={getBadgeStyle(tx.amount, tx.type)}>
                            {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {tx.performedBy?.fullName || 'Sistema automático'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loadingHistory && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500">
                  Página {historyPage} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                    disabled={historyPage === totalPages}
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}