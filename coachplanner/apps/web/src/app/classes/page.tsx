'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, ChevronLeft, ChevronRight, X, User, Plus, 
  Clock, Trash2, Copy, Users, Edit2, AlertCircle, Tag
} from 'lucide-react';
import useMediaQuery from '@/hooks/use-media-query';
import { useUpgradeModal } from '@/context/upgrade-context';

interface Category {
  id: number;
  name: string;
}

interface ClassSession {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  capacity: number;
  categories: { category: Category }[];
  _count?: { bookings: number };
  instructor?: { name: string, avatarUrl?: string }; 
  isCancelled?: boolean;
}

interface ClassDetail extends ClassSession {
    bookings: {
        id: string;
        user: { 
          fullName: string; 
          email: string;
          memberships?: {
            category?: Category;
          }[];
        };
    }[];
}

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDateAPI = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - (offset * 60 * 1000));
    return adjusted.toISOString().slice(0, 16);
};

const minutesToTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const getCategoryStyles = (categoryId?: number | null, isCancelled = false) => {
  if (isCancelled) return 'bg-gray-100 border-l-4 border-gray-400 text-gray-400 opacity-60';
  if (!categoryId) return 'bg-gray-50 border-l-4 border-gray-400 text-gray-700';

  const styles: { [key: number]: string } = {
    1: 'bg-blue-50 border-l-4 border-blue-500 text-blue-700', 
    2: 'bg-purple-50 border-l-4 border-purple-500 text-purple-700',
    3: 'bg-green-50 border-l-4 border-green-500 text-green-700',
    4: 'bg-orange-50 border-l-4 border-orange-500 text-orange-700',
  };
  return styles[categoryId] || 'bg-gray-50 border-l-4 border-gray-400 text-gray-700';
};

export default function ClassesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { openUpgradeModal } = useUpgradeModal();
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [intervalMinutes, setIntervalMinutes] = useState(60); 
  const [cancellationWindow, setCancellationWindow] = useState(2);
  const [gymHours, setGymHours] = useState({ start: 7, end: 22 });

  const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [hasBookings, setHasBookings] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', start: '', end: '', capacity: 10, categoryIds: [] as number[]
  });

  const [viewClass, setViewClass] = useState<ClassDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR')) {
      router.push('/');
      return;
    }
    fetchData();
  }, [user, authLoading, router, weekStart]);

  const fetchData = async () => {
    const startStr = weekStart.toISOString();
    const endWeek = addDays(weekStart, 7);
    const endStr = endWeek.toISOString();

    setLoading(true);
    try {
        const [classesRes, categoriesRes, configRes] = await Promise.all([
            api.get(`/classes?start=${startStr}&end=${endStr}`), 
            api.get('/categories'),
            api.get('/organizations/config')
        ]);

        setClasses(classesRes.data);
        if(categoriesRes.data) setCategories(categoriesRes.data);
        
        if (configRes.data) {
          if (configRes.data.slotDurationMinutes) setIntervalMinutes(configRes.data.slotDurationMinutes);
          if (configRes.data.cancellationWindow !== undefined) setCancellationWindow(configRes.data.cancellationWindow);
          if (configRes.data.openHour !== undefined && configRes.data.closeHour !== undefined) {
             setGymHours({ start: configRes.data.openHour, end: configRes.data.closeHour });
          }
        }
    } catch (error) {
        console.error(error);
        toast.error('Error cargando datos');
    } finally {
        setLoading(false);
    }
  };

  const handleConfigChange = async (key: string, value: number) => {
    if (key === 'slotDurationMinutes') setIntervalMinutes(value);
    if (key === 'cancellationWindow') setCancellationWindow(value);
    
    try {
      await api.patch('/organizations/config', { [key]: value });
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error('Error al guardar configuración');
    }
  };

  const handlePrevWeek = () => {
    const newStart = addDays(weekStart, -7);
    setWeekStart(newStart);
    if (!isDesktop) setSelectedDate(newStart);
  };
  
  const handleNextWeek = () => {
    const newStart = addDays(weekStart, 7);
    setWeekStart(newStart);
    if (!isDesktop) setSelectedDate(newStart);
  };

  const handleSlotClick = (dayDate: Date, totalMinutes: number) => {
    const start = new Date(dayDate);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    start.setHours(hour, minute, 0, 0);
    
    const now = new Date();
    if (start.getTime() < now.getTime() - 60000) { 
        toast.error('No puedes programar en el pasado ⏳');
        return;
    }
    
    const safeInterval = Math.max(15, intervalMinutes);
    const end = new Date(start.getTime() + safeInterval * 60000);

    setIsEditing(false);
    setEditingClassId(null);
    setHasBookings(false);

    setFormData({
      title: '', description: '', capacity: 10, categoryIds: [],
      start: formatDateAPI(start),
      end: formatDateAPI(end),
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (cls: ClassDetail) => {
      setIsEditing(true);
      setEditingClassId(cls.id);
      
      const enrolledCount = cls._count?.bookings || cls.bookings?.length || 0;
      setHasBookings(enrolledCount > 0);

      setFormData({
          title: cls.title,
          description: cls.description || '',
          start: formatDateAPI(new Date(cls.startTime)),
          end: formatDateAPI(new Date(cls.endTime)),
          capacity: cls.capacity,
          categoryIds: cls.categories?.map(c => c.category.id) || []
      });
      
      setViewClass(null);
      setIsModalOpen(true);
  };

  const handleCheckboxChange = (categoryId: number) => {
    setFormData(prev => {
        const hasId = prev.categoryIds.includes(categoryId);
        
        if (hasBookings && hasId) {
            toast.warning('No puedes quitar disciplinas de una clase con reservas.');
            return prev;
        }
        return {
            ...prev,
            categoryIds: hasId 
                ? prev.categoryIds.filter(id => id !== categoryId)
                : [...prev.categoryIds, categoryId]
        };
    });
  };

  const handleViewClass = async (e: React.MouseEvent, classId: string) => {
      e.stopPropagation();
      setIsLoadingDetails(true);
      const basicInfo = classes.find(c => c.id === classId);
      if (basicInfo) {
          setViewClass({ ...basicInfo, bookings: [] });
      }
      
      try {
          const res = await api.get(`/classes/${classId}`);
          setViewClass(res.data);
      } catch (error) {
          console.error(error);
          toast.error("No se pudo cargar la lista de alumnos");
      } finally {
          setIsLoadingDetails(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startDateTime = new Date(formData.start);
    const now = new Date();

    if (!isEditing && startDateTime < now) {
      toast.error('No puedes crear una clase en el pasado ⏳');
      return;
    }

    setSubmitting(true);
    
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        startTime: new Date(formData.start).toISOString(),
        endTime: new Date(formData.end).toISOString(),
        capacity: Number(formData.capacity),
        categoryIds: formData.categoryIds 
      };

      if (isEditing && editingClassId) {
          await api.patch(`/classes/${editingClassId}`, payload);
          toast.success('Clase actualizada');
      } else {
          await api.post('/classes', payload);
          toast.success('Clase creada');
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.dismiss();
      if (error.response?.data?.message?.includes('Límite de clases')) {
          openUpgradeModal(); 
      } else {
          toast.error(error.response?.data?.message || 'Error al procesar la clase');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClass = async (e: React.MouseEvent, id: string, startTime: string) => {
    e.stopPropagation(); 
    const isPast = new Date(startTime) < new Date();
    const confirmMessage = isPast 
        ? '¿Cancelar esta clase pasada? IMPORTANTE: Al ser del pasado, no se reembolsarán los créditos a los alumnos.'
        : '¿Cancelar esta clase? Se reembolsarán los créditos a todos los inscriptos.';
    if (!confirm(confirmMessage)) return;
    try {
      const res = await api.patch(`/classes/${id}/cancel`);
      setClasses(prev => prev.map(c => c.id === id ? { ...c, isCancelled: true } : c));
      if (viewClass?.id === id) setViewClass(null);
      toast.success(res.data?.message || 'Clase cancelada con éxito');
    } catch (error: any) { 
        toast.error(error.response?.data?.message || 'Error al cancelar'); 
    }
  };

  const handleCloneWeek = async () => {
    const nextWeekStart = addDays(weekStart, 7);
    const message = `¿Quieres copiar todas las clases de esta semana (${weekStart.toLocaleDateString()}) a la SIGUIENTE semana (${nextWeekStart.toLocaleDateString()})?`;
    if (!confirm(message)) return;
    const toastId = toast.loading('Clonando semana...');
    try {
      const res = await api.post('/classes/clone-week', {
        sourceWeekStart: weekStart.toISOString(),
        targetWeekStart: nextWeekStart.toISOString()
      });
      toast.dismiss(toastId);
      if (res.data.count === 0) toast.info('No hay clases para clonar en esta semana.');
      else {
         toast.success(`¡Éxito! Se clonaron ${res.data.count} clases.`);
         setWeekStart(nextWeekStart);
      }
    } catch (err: any) {
      toast.dismiss(); 
      if (err.response?.data?.message?.includes('Límite de clases')) openUpgradeModal();
      else toast.error('Error al intentar clonar la semana');
    }
  };

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const timeSlots = useMemo(() => {
    const slots = [];
    const startMinute = gymHours.start * 60;
    const endMinute = gymHours.end * 60;
    let current = startMinute;
    const safeInterval = Math.max(15, intervalMinutes); 
    while (current < endMinute) {
      slots.push(current);
      current += safeInterval;
    }
    return slots;
  }, [intervalMinutes, gymHours]);

  const getClassInSlot = (day: Date, slotMinutes: number) => {
    const safeInterval = Math.max(15, intervalMinutes);
    return classes.find(c => {
      if (c.isCancelled) return false; 
      const d = new Date(c.startTime);
      const classTotalMinutes = d.getHours() * 60 + d.getMinutes();
      return d.getDate() === day.getDate() && 
             d.getMonth() === day.getMonth() &&
             classTotalMinutes >= slotMinutes && 
             classTotalMinutes < (slotMinutes + safeInterval);
    });
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString();

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      
      <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold md:block hidden">Calendario</h1>
          <h1 className="text-lg font-bold md:hidden block">Clases</h1>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {isDesktop && (
              <>
              <Button 
                variant="outline" 
                size="sm" 
                className="mr-2 gap-2 border-dashed border-gray-400 text-gray-600"
                onClick={handleCloneWeek}
              >
                <Copy className="h-4 w-4" />
                <span>Clonar Semana</span>
              </Button>
              </>
          )}

          {!isDesktop && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 w-9 p-0 border-dashed border-gray-400 text-gray-600"
              onClick={handleCloneWeek}
              title="Clonar semana"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border">
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handlePrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-bold text-[10px] sm:text-sm uppercase px-1 min-w-17.5 sm:min-w-30 text-center">
                  {weekStart.getDate()} - {addDays(weekStart, 6).getDate()} {weekStart.toLocaleDateString('es-ES', { month: 'short' })}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handleNextWeek}>
                  <ChevronRight className="h-4 w-4" />
              </Button>
          </div>
          
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ml-1 sm:ml-2 shrink-0">
            {user?.fullName?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      <div className="md:hidden flex flex-col border-b bg-white sticky top-16.25 z-20">
        <div className="flex justify-between items-center p-4 pb-2">
           <div className="flex items-center gap-1 font-semibold text-lg capitalize">
             {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
           </div>
           <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium text-gray-600">
              <Clock className="h-3 w-3" /> {formatDuration(intervalMinutes)}
           </div>
        </div>
        <div className="flex justify-between items-center px-4 pb-4 overflow-x-auto no-scrollbar">
          {weekDays.map((day, i) => {
            const selected = isSelected(day);
            return (
              <button 
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center min-w-12 h-16 rounded-2xl transition-colors mx-1 ${selected ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-transparent'}`}
              >
                <span className="text-[10px] uppercase font-bold mb-1">{day.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0,3)}</span>
                <span className={`text-xl font-bold leading-none ${selected ? '' : 'text-gray-900'}`}>{day.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>


      <main className="flex-1 relative bg-gray-50 p-4 overflow-y-auto">
        <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border">
          <div className="overflow-x-auto">
            <div className="min-w-200">
              <div className="grid grid-cols-8 bg-gray-50 border-b">
                <div className="p-4 text-xs font-medium text-gray-500 uppercase">Hora</div>
                {weekDays.map((day, i) => (
                  <div key={i} className={`p-2 text-center border-l flex flex-col items-center justify-center ${isToday(day) ? 'bg-blue-50/50' : ''}`}>
                    <span className="text-xs uppercase text-gray-500 font-bold">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    <span className={`h-7 w-7 flex items-center justify-center rounded-full text-sm font-bold mt-1 ${isToday(day) ? 'bg-primary text-white' : 'text-gray-900'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                ))}
              </div>
              
              <div>
                 {timeSlots.map((minutes) => (
                  <div key={minutes} className="grid grid-cols-8 min-h-25 border-b last:border-b-0">
                    <div className="p-2 text-xs font-medium text-gray-500 text-right pr-4 relative">
                        <span className="-top-2 relative">{minutesToTime(minutes)}</span>
                    </div>
                    {weekDays.map((day, i) => {
                      const activeClass = getClassInSlot(day, minutes);
                      const firstCategoryId = activeClass?.categories?.[0]?.category?.id;
                      const categoryStyle = activeClass ? getCategoryStyles(firstCategoryId, activeClass.isCancelled) : '';
                      const categoryNames = activeClass?.categories?.map(c => c.category.name).join(', ') || 'General';

                      return (
                        <div 
                          key={i} 
                          className={`border-l p-1 relative group transition-colors ${!activeClass ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                          onClick={() => !activeClass && handleSlotClick(day, minutes)}
                        >
                          {activeClass ? (
                            <div 
                                className={`h-full w-full rounded-lg p-2 flex flex-col justify-between shadow-sm relative group/card cursor-pointer hover:ring-2 ring-primary/20 transition-all ${categoryStyle}`}
                                onClick={(e) => handleViewClass(e, activeClass.id)}
                            >
                              
                              {!activeClass.isCancelled && (
                                <button 
                                  onClick={(e) => handleCancelClass(e, activeClass.id, activeClass.startTime)}
                                  className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-500 opacity-0 group-hover/card:opacity-100 hover:bg-red-100 transition-all z-10"
                                  title="Cancelar clase"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}

                              <div>
                                <h3 className="font-bold text-sm truncate pr-4">{activeClass.title}</h3>
                                <p className="text-[11px] opacity-80 truncate" title={categoryNames}>{categoryNames}</p>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                <div className="flex items-center text-xs font-medium gap-1">
                                  <User className="h-3 w-3" />
                                  {activeClass._count?.bookings || 0} / {activeClass.capacity}
                                </div>
                                <div className="h-5 w-5 rounded-full bg-gray-300 border-white border flex items-center justify-center text-[8px]">I</div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-5 w-5 text-gray-400 bg-white rounded-full p-0.5 shadow-sm" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                 ))}
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden space-y-3 pb-24">
          {timeSlots.map((minutes) => {
            const activeClass = getClassInSlot(selectedDate, minutes);
            const firstCategoryId = activeClass?.categories?.[0]?.category?.id;
            const categoryStyle = activeClass ? getCategoryStyles(firstCategoryId, activeClass.isCancelled) : '';
            const categoryNames = activeClass?.categories?.map(c => c.category.name).join(', ') || 'General';

            return (
              <div key={minutes} className="flex gap-3 group">
                <div className="w-12 text-right text-[11px] font-bold text-gray-400 pt-1 tabular-nums">
                  {minutesToTime(minutes)}
                </div>
                <div className="flex-1">
                  {activeClass ? (
                    <div 
                      className={`rounded-xl p-4 shadow-sm flex flex-col gap-2 relative cursor-pointer active:scale-[0.98] transition-all ${categoryStyle.replace('border-l-4', 'border-l-[6px]')}`}
                      onClick={(e) => handleViewClass(e, activeClass.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-base truncate">{activeClass.title}</h3>
                          <p className="text-xs opacity-80 font-medium truncate">{categoryNames}</p>
                        </div>
                        
                        {!activeClass.isCancelled && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 -mt-2 -mr-2 text-inherit opacity-50 hover:opacity-100"
                            onClick={(e) => handleCancelClass(e, activeClass.id, activeClass.startTime)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold ${activeClass._count?.bookings! >= activeClass.capacity ? 'bg-blue-100 text-blue-700' : 'bg-black/5 text-gray-700'}`}>
                          <Users className="h-3 w-3" />
                          {activeClass._count?.bookings || 0} / {activeClass.capacity}
                        </div>
                        <div className="text-[10px] font-bold opacity-60 italic">
                          {formatDuration(intervalMinutes)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSlotClick(selectedDate, minutes)}
                      className="w-full h-14 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50/50 hover:bg-gray-100 hover:border-gray-300 active:bg-gray-200 transition-all group/slot"
                    >
                      <Plus className="h-5 w-5 text-gray-300 group-hover/slot:text-primary group-hover/slot:scale-110 transition-all" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <Card className="w-full sm:max-w-lg shadow-xl rounded-t-2xl sm:rounded-xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle>{isEditing ? 'Editar Clase' : 'Nueva Clase'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 max-h-[80vh] overflow-y-auto">
              {hasBookings && isEditing && (
                  <div className="mb-4 bg-orange-50 border border-orange-200 p-3 rounded-lg text-xs text-orange-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <p>
                          Esta clase ya tiene alumnos inscritos. <strong>No puedes cambiar el horario, ni quitar disciplinas.</strong> Si necesitas modificar eso, cancela la clase y crea una nueva.
                      </p>
                  </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input required placeholder="Ej: Crossfit WOD" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus />
                </div>                
                <div className="grid grid-cols-2 gap-4">
                  <div className={hasBookings ? 'opacity-60 pointer-events-none' : ''}>
                      <Label>Inicio</Label>
                      <Input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} tabIndex={hasBookings ? -1 : 0} />
                  </div>
                  <div className={hasBookings ? 'opacity-60 pointer-events-none' : ''}>
                      <Label>Fin</Label>
                      <Input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} tabIndex={hasBookings ? -1 : 0} />
                  </div>
                </div>
                
                <div>
                    <Label>Cupo Máximo</Label>
                    <Input type="number" min={hasBookings ? (viewClass?._count?.bookings || 1) : 1} value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
                </div>                  
                
                {categories.length > 0 && (
                    <div>
                      <Label className="block mb-2">Disciplinas habilitadas</Label>
                      <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-gray-50/50 max-h-36 overflow-y-auto">
                          {categories.map(c => {
                              const isSelected = formData.categoryIds.includes(c.id);
                              const isLocked = hasBookings && isSelected;

                              return (
                                  <label key={c.id} className={`flex items-center gap-2 text-sm cursor-pointer select-none ${isLocked ? 'opacity-60' : ''}`}>
                                      <input 
                                          type="checkbox"
                                          className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                          checked={isSelected}
                                          onChange={() => {
                                              if (!isLocked) handleCheckboxChange(c.id);
                                          }}
                                          disabled={isLocked}
                                      />
                                      <span className="truncate">{c.name}</span>
                                  </label>
                              )
                          })}
                      </div>
                    </div>
                )}

                <div><Label>Descripción (Opcional)</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalles..." /></div>
                
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin mr-2" /> : (isEditing ? 'Guardar Cambios' : 'Crear Clase')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {viewClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-xl rounded-xl animate-in fade-in zoom-in-95 duration-200">
              <CardHeader className="border-b pb-4 relative">
                <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setViewClass(null)}>
                    <X className="h-5 w-5" />
                </Button>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                      {viewClass.categories?.map(c => c.category.name).join(' • ') || 'GENERAL'}
                    </span>
                    <CardTitle className="text-2xl flex items-center gap-2">
                        {viewClass.title}
                        {!viewClass.isCancelled && (
                            <button 
                                onClick={() => handleEditClick(viewClass)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Editar Clase"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        )}
                    </CardTitle>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {new Date(viewClass.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                        {new Date(viewClass.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                </div>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="mb-4">
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-gray-500" />
                        Alumnos Inscriptos
                        <span className="ml-auto text-xs font-normal bg-gray-100 px-2 py-1 rounded-full">
                            {viewClass._count?.bookings || viewClass.bookings?.length || 0} / {viewClass.capacity}
                        </span>
                    </h3>
                    
                    {isLoadingDetails ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
                    ) : (
                        <div className="space-y-3 max-h-75 overflow-y-auto pr-1">
                            {viewClass.bookings && viewClass.bookings.length > 0 ? (
                                viewClass.bookings.map((booking) => {
                                    const studentCategory = booking.user.memberships?.[0]?.category?.name || 'Sin categoría';
                                    
                                    return (
                                        <div key={booking.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {booking.user.fullName[0].toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-medium text-sm truncate text-gray-900">{booking.user.fullName}</p>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-tighter shrink-0 border border-gray-200">
                                                        <Tag className="h-2.5 w-2.5" />
                                                        {studentCategory}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">{booking.user.email}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                                    <p className="text-sm">No hay alumnos inscriptos aún.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {viewClass.description && (
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold mb-1 text-gray-900">Descripción</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{viewClass.description}</p>
                    </div>
                )}
             </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}