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
import Link from 'next/link';

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
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [creditFilter, setCreditFilter] = useState<'ALL' | 'WITH_CREDITS' | 'NO_CREDITS'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({ fullName: '', email: '', categoryId: '' });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [creditForm, setCreditForm] = useState({ amount: 8, daysValid: 30, name: 'Pack Mensual' });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      toast.error('Acceso denegado. Solo el personal del gimnasio puede ver esta sección.');
      router.push('/');
      return;
    }  
    fetchData();
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  }

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

  const handleToggleStatus = async (student: Student) => {
    const newStatus = student.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const originalStudents = [...students];
    
    setStudents(prev => prev.map(s => 
        s.id === student.id ? { ...s, status: newStatus } : s
    ));

    try {
        await api.patch(`/students/${student.id}`, { status: newStatus });
        toast.success(newStatus === 'ACTIVE' ? 'Alumno activado' : 'Alumno pausado manualmente.');
    } catch (error) {
        setStudents(originalStudents);
        toast.error('Error al cambiar el estado del alumno');
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
  
    const filteredStudents = students.filter(s => {
      const matchesSearch = (s.fullName?.toLowerCase() || '').includes(search.toLowerCase()) ||
                            s.email.toLowerCase().includes(search.toLowerCase()) ||
                            (s.phoneNumber || '').includes(search);
      if (!matchesSearch) return false;
      if (statusFilter === 'ACTIVE' && s.status !== 'ACTIVE') return false;
      if (statusFilter === 'INACTIVE' && s.status === 'ACTIVE') return false;
      if (categoryFilter !== 'ALL' && s.categoryId?.toString() !== categoryFilter) return false;
      if (creditFilter === 'WITH_CREDITS' && s.credits <= 0) return false;
      if (creditFilter === 'NO_CREDITS' && s.credits > 0) return false;
      
      return true;
    });

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

      <div className="max-w-6xl mx-auto w-full space-y-4">
          
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre, correo o teléfono" 
                  className="pl-10 bg-white shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex bg-gray-200/60 p-1 rounded-lg w-full md:w-auto overflow-x-auto shrink-0">
                  <button 
                    onClick={() => setStatusFilter('ALL')}
                    className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${statusFilter === 'ALL' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Todos
                  </button>
                  <button 
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${statusFilter === 'ACTIVE' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Activos
                  </button>
                  <button 
                    onClick={() => setStatusFilter('INACTIVE')}
                    className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${statusFilter === 'INACTIVE' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Inactivos
                  </button>
              </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-2">
              <div className="relative w-full sm:w-64">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select 
                    className="w-full h-10 rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm appearance-none"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="ALL">Todas las Categorías</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div className="relative w-full sm:w-64">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select 
                    className="w-full h-10 rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm appearance-none"
                    value={creditFilter}
                    onChange={(e) => setCreditFilter(e.target.value as 'ALL' | 'WITH_CREDITS' | 'NO_CREDITS')}
                >
                    <option value="ALL">Todos los créditos</option>
                    <option value="WITH_CREDITS">Tienen clases disponibles</option>
                    <option value="NO_CREDITS">Sin clases (0)</option>
                </select>
              </div>
          </div>

        {loading ? (
            <div className="text-center py-12"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
              <div className="col-span-4">Alumno</div>
              <div className="col-span-3">Categoría</div>
              <div className="col-span-2 text-center">Créditos</div>
              <div className="col-span-2 text-center">Fecha Ingreso</div>
              <div className="col-span-1 text-right">Acciones</div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                  <UserIcon className="h-10 w-10 text-gray-300 mb-3" />
                  No se encontraron alumnos con esos filtros.
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.membershipId} className={`p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center transition-colors ${student.status === 'SUSPENDED' ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}>
                    
                    <div className="col-span-4 flex items-center gap-3 w-full min-w-0 relative">
                      <div className={`absolute -left-4 top-0 bottom-0 w-1 md:hidden ${student.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`} />
                      
                      <Link href={`/students/${student.id}`} className={`h-10 w-10... `}>
                        {student.fullName?.[0]?.toUpperCase() || student.email[0].toUpperCase()}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Link href={`/students/${student.id}`} className="font-medium...">
                              {student.fullName?.replace('undefined', '').trim() || 'Sin nombre'}
                            </Link>
                            {student.status === 'ACTIVE' && (
                                <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider">Activo</span>
                            )}
                            {student.status === 'INACTIVE' && (
                                <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Inactivo 30d</span>
                            )}
                            {student.status === 'SUSPENDED' && (
                                <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">Pausado</span>
                            )}
                        </div>
                        
                        <div className="flex flex-col md:hidden mt-0.5">
                            <span className="text-xs text-gray-500 truncate">{student.email}</span>
                            <span className="text-xs text-gray-500 truncate">{student.phoneNumber || 'Sin teléfono'}</span>
                            <span className={`w-fit mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${student.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {student.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 truncate">{student.email}</span>
                            <span className="text-xs text-gray-300">•</span>
                            <span className="text-xs text-gray-500 truncate">{student.phoneNumber || 'Sin teléfono'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 w-full">
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

                    <div className="col-span-2 w-full flex items-center justify-start md:justify-center">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${student.credits > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {student.credits} Clases
                      </div>
                    </div>

                    <div className="col-span-2 w-full hidden md:block text-center text-sm text-gray-500">
                      {new Date(student.joinedAt).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                    </div>

                    <div className="col-span-1 w-full flex flex-col md:flex-row gap-2 justify-end">
                       <Button 
                          size="sm" 
                          variant={student.status === 'SUSPENDED' ? "default" : "destructive"}
                          className="w-full md:w-auto text-xs h-8 px-2"
                          onClick={() => handleToggleStatus(student)}
                       >
                          {student.status === 'SUSPENDED' ? 'Activar' : 'Pausar'}
                       </Button>
                       
                       <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full md:w-auto gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 h-8 px-2"
                          onClick={() => openCreditModal(student)}
                       >
                          <span className="md:hidden">Créditos</span>
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
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={formData.categoryId}
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                    >
                      <option value="">Sin Categoría (Acceso General)</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
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
                            onChange={e => {
                              const val = e.target.value;
                              setCreditForm({
                                ...creditForm, 
                                amount: val === '' ? '' : parseInt(val)
                              } as any);
                          }}
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
                                daysValid: e.target.value === '' ? '' : parseInt(e.target.value)
                            } as any)}
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