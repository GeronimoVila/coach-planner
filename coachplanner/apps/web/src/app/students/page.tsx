'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, Search, UserPlus, Mail, Calendar, User as UserIcon, CreditCard, Plus, Tag
} from 'lucide-react';

interface Student {
  id: string;
  membershipId: string;
  fullName: string | null;
  email: string;
  phoneNumber?: string | null;
  joinedAt: string;
  role: string;
  credits: number;
  categoryName?: string;
  categoryId?: number | null;
}

interface Category {
  id: number;
  name: string;
}

export default function StudentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({ fullName: '', email: '', categoryId: '' });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [creditForm, setCreditForm] = useState({ amount: 8, daysValid: 30, name: 'Pack Mensual' });

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR')) {
      router.push('/');
      return;
    }
    fetchData();
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, categoriesRes] = await Promise.all([
        api.get('/students'),
        api.get('/categories')
      ]);
      setStudents(studentsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/students', {
        ...formData,
        categoryId: formData.categoryId ? Number(formData.categoryId) : undefined
      });
      toast.success('Alumno registrado correctamente');
      setFormData({ fullName: '', email: '', categoryId: '' });
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryChange = async (studentId: string, newCategoryId: string) => {
    const originalStudents = [...students];
    setStudents(prev => prev.map(s => 
        s.id === studentId 
            ? { ...s, categoryId: newCategoryId ? Number(newCategoryId) : null } 
            : s
    ));

    try {
        await api.patch(`/students/${studentId}`, {
            categoryId: newCategoryId ? Number(newCategoryId) : null
        });
        toast.success('Categoría actualizada');
    } catch (error) {
        setStudents(originalStudents);
        toast.error('Error al actualizar categoría');
    }
  };

  const handleAssignCredits = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent) return;
      setSubmitting(true);
      try {
        await api.post('/credit-packages', {
          studentId: selectedStudent.id,
          amount: Number(creditForm.amount),
          daysValid: Number(creditForm.daysValid),
          name: creditForm.name
        });
        toast.success(`Créditos asignados a ${selectedStudent.fullName}`);
        setIsCreditModalOpen(false);
        setCreditForm({ amount: 8, daysValid: 30, name: 'Pack Mensual' });
        fetchData();
      } catch (error: any) {
        toast.error('Error asignando créditos');
      } finally {
        setSubmitting(false);
      }
    };
  
    const openCreditModal = (student: Student) => {
      setSelectedStudent(student);
      setIsCreditModalOpen(true);
    };
  
    const filteredStudents = students.filter(s => 
      (s.fullName?.toLowerCase() || '').includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.phoneNumber || '').includes(search)
    );

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col p-4 md:p-8">
      
      <div className="max-w-6xl mx-auto w-full mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alumnos</h1>
            <p className="text-muted-foreground text-sm">Gestiona los miembros de tu gimnasio</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, correo o teléfono" 
              className="pl-10 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

        {loading ? (
            <div className="text-center py-12"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="hidden md:flex items-center justify-between p-4 border-b bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="flex-1 min-w-50">Alumno</div>
              <div className="w-50">Categoría</div>
              <div className="w-30 text-center">Créditos</div>
              <div className="w-37.5 text-right">Fecha Ingreso</div>
              <div className="w-25 text-right">Acciones</div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No se encontraron alumnos con esa búsqueda.
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.membershipId} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50/50 transition-colors gap-4">
                    
                    <div className="flex-1 min-w-50 flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {student.fullName?.[0]?.toUpperCase() || student.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{student.fullName || 'Sin nombre'}</p>
                        
                        <div className="flex flex-col md:hidden mt-0.5">
                            <span className="text-xs text-gray-500 truncate">{student.email}</span>
                            <span className="text-xs text-gray-500 truncate">{student.phoneNumber || 'Sin teléfono'}</span>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 truncate">{student.email}</span>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-500 truncate">{student.phoneNumber || 'Sin teléfono'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-50 shrink-0">
                        <select 
                            className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm"
                            value={student.categoryId || ""}
                            onChange={(e) => handleCategoryChange(student.id, e.target.value)}
                        >
                            <option value="">General (Todas)</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full md:w-30 shrink-0 flex items-center justify-start md:justify-center">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${student.credits > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {student.credits} Clases
                      </div>
                    </div>

                    <div className="hidden md:block w-37.5 shrink-0 text-right text-sm text-gray-500">
                      {new Date(student.joinedAt).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                    </div>

                    <div className="w-full md:w-25 shrink-0 flex justify-end">
                       <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full md:w-auto md:px-3 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                          onClick={() => openCreditModal(student)}
                       >
                          <CreditCard className="h-4 w-4" />
                          <span className="md:hidden">Cargar Créditos</span>
                          <span className="hidden md:inline">Cargar</span>
                       </Button>
                    </div>

                  </div>
                ))
              )}
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
                </div>

                <div className="space-y-2">
                  <Label>Categoría / Disciplina</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.categoryId}
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                    >
                      <option value="">Sin Categoría (Acceso General)</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El alumno solo podrá reservar clases de esta categoría.
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

      {isCreditModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
            <CardHeader>
              <CardTitle>Asignar Pack de Clases</CardTitle>
              <CardDescription>
                Cargando créditos a <strong>{selectedStudent.fullName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAssignCredits} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Pack</Label>
                  <Input 
                    required 
                    placeholder="Ej: Pack Enero, Promo 8 clases..." 
                    value={creditForm.name}
                    onChange={e => setCreditForm({...creditForm, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label>Cantidad Clases</Label>
                    <div className="relative">
                        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input 
                            type="number" 
                            min="1"
                            required 
                            className="pl-9"
                            value={creditForm.amount || ''}
                            onChange={e => setCreditForm({
                                ...creditForm, 
                                amount: e.target.value === '' ? 0 : parseInt(e.target.value)
                            })}
                        />
                    </div>
                    </div>
                    <div className="space-y-2">
                    <Label>Días de Validez</Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input 
                            type="number" 
                            min="1"
                            required 
                            className="pl-9"
                            value={creditForm.daysValid || ''}
                            onChange={e => setCreditForm({
                                ...creditForm, 
                                daysValid: e.target.value === '' ? 0 : parseInt(e.target.value)
                            })}
                        />
                    </div>
                    </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreditModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Confirmar Carga'}
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