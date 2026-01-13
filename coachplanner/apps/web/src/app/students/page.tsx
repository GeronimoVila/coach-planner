'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, Search, UserPlus, Mail, Calendar, User as UserIcon
} from 'lucide-react';

interface Student {
  id: string;
  membershipId: string;
  fullName: string | null;
  email: string;
  joinedAt: string;
  role: string;
}

export default function StudentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '' });

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR')) {
      router.push('/');
      return;
    }
    fetchStudents();
  }, [user, authLoading, router]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      setStudents(res.data);
    } catch (error) {
      toast.error('Error cargando alumnos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/students', formData);
      toast.success('Alumno registrado correctamente');
      setFormData({ fullName: '', email: '' });
      setIsModalOpen(false);
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    (s.fullName?.toLowerCase() || '').includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col p-4 md:p-8">
      
      <div className="max-w-5xl mx-auto w-full mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alumnos</h1>
            <p className="text-muted-foreground text-sm">Gestiona los miembros de tu gimnasio</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" /> Nuevo Alumno
        </Button>
      </div>

      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o correo..." 
            className="pl-10 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed">
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <UserIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium">No se encontraron alumnos</h3>
            <p className="text-muted-foreground text-sm">Prueba con otra búsqueda o registra uno nuevo.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-5">Alumno</div>
              <div className="col-span-4">Contacto</div>
              <div className="col-span-3 text-right">Fecha Ingreso</div>
            </div>

            <div className="divide-y">
              {filteredStudents.map((student) => (
                <div key={student.membershipId} className="p-4 md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50 transition-colors">
                  
                  <div className="col-span-5 flex items-center gap-3 mb-2 md:mb-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {student.fullName?.[0]?.toUpperCase() || student.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.fullName || 'Sin nombre'}</p>
                      <span className="inline-flex md:hidden items-center text-xs text-gray-500 mt-0.5">
                        <Calendar className="h-3 w-3 mr-1" /> 
                        {new Date(student.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-4 flex items-center text-sm text-gray-600 mb-2 md:mb-0">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {student.email}
                  </div>

                  <div className="col-span-3 text-right hidden md:block text-sm text-gray-500">
                    {new Date(student.joinedAt).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle>Registrar Nuevo Alumno</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input 
                    required 
                    placeholder="Ej: Juan Pérez" 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo Electrónico</Label>
                  <Input 
                    type="email" 
                    required 
                    placeholder="juan@ejemplo.com" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si el usuario ya existe, se vinculará a tu gimnasio. Si es nuevo, se creará con contraseña temporal.
                  </p>
                </div>
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Registrar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}