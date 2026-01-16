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
  Clock, Trash2, Check, Ban
} from 'lucide-react';
import useMediaQuery from '@/hooks/use-media-query';

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
  category: Category;
  _count?: { bookings: number };
  instructor?: { name: string, avatarUrl?: string }; 
  isCancelled?: boolean;
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

const getCategoryStyles = (categoryId: number, isCancelled = false) => {
  if (isCancelled) return 'bg-gray-100 border-l-4 border-gray-400 text-gray-400 opacity-60';

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
  const [formData, setFormData] = useState({
    title: '', description: '', start: '', end: '', capacity: 10, categoryId: ''
  });

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

    setFormData({
      title: '', description: '', capacity: 10, categoryId: '',
      start: formatDateAPI(start),
      end: formatDateAPI(end),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startDateTime = new Date(formData.start);
    const now = new Date();

    if (startDateTime < now) {
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
        categoryId: Number(formData.categoryId)
      };

      await api.post('/classes', payload);
      
      toast.success('Clase creada');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClass = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (!confirm('¿Cancelar esta clase? Se reembolsarán los créditos a todos los inscriptos.')) return;
    
    try {
      await api.patch(`/classes/${id}/cancel`);
      
      setClasses(prev => prev.map(c => c.id === id ? { ...c, isCancelled: true } : c));
      
      toast.success('Clase cancelada y créditos devueltos');
    } catch (error: any) { 
        toast.error(error.response?.data?.message || 'Error al cancelar'); 
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
          <h1 className="text-xl font-bold">Calendario</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {isDesktop ? (
              <>
               <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border mr-2">
                  <span className="text-xs font-medium text-gray-500">Duración:</span>
                  <Input 
                    type="number" 
                    min="15" 
                    max="360"
                    className="w-14 h-7 text-center px-1 text-sm bg-white border-gray-200 focus-visible:ring-1"
                    value={intervalMinutes}
                    onChange={(e) => handleConfigChange('slotDurationMinutes', Number(e.target.value))}
                  />
                  <span className="text-xs text-gray-400">min</span>
               </div>

               <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border mr-2">
                  <span className="text-xs font-medium text-gray-500">Cancelación (hs):</span>
                  <Input 
                    type="number" 
                    min="0" 
                    max="72"
                    className="w-12 h-7 text-center px-1 text-sm bg-white border-gray-200 focus-visible:ring-1"
                    value={cancellationWindow}
                    onChange={(e) => handleConfigChange('cancellationWindow', Number(e.target.value))}
                  />
               </div>
               
               <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border mr-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevWeek}>
                      <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium text-sm capitalize px-2 min-w-35 text-center">
                      {weekStart.getDate()} - {addDays(weekStart, 6).getDate()} {weekStart.toLocaleDateString('es-ES', { month: 'short' })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextWeek}>
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
              </>
          ) : (
              null
          )}
          
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ml-2">
            {user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
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
                      const categoryStyle = activeClass ? getCategoryStyles(activeClass.category.id, activeClass.isCancelled) : '';

                      return (
                        <div 
                          key={i} 
                          className={`border-l p-1 relative group transition-colors ${!activeClass ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                          onClick={() => !activeClass && handleSlotClick(day, minutes)}
                        >
                          {activeClass ? (
                            <div className={`h-full w-full rounded-lg p-2 flex flex-col justify-between shadow-sm relative group/card ${categoryStyle}`}>
                              
                              {!activeClass.isCancelled && (
                                  <button 
                                    onClick={(e) => handleCancelClass(e, activeClass.id)}
                                    className="absolute top-1 right-1 p-1 bg-white/80 rounded-full text-red-500 opacity-0 group-hover/card:opacity-100 hover:bg-red-100 transition-all z-10"
                                    title="Cancelar clase y devolver créditos"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                              )}

                              <div>
                                <h3 className="font-bold text-sm truncate pr-4">{activeClass.title}</h3>
                                <p className="text-[11px] opacity-80 truncate">{activeClass.category.name}</p>
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


        <div className="md:hidden space-y-4 pb-20">
          {timeSlots.map((minutes) => {
             const activeClass = getClassInSlot(selectedDate, minutes);
             if (!activeClass) return null;

             const categoryStyle = getCategoryStyles(activeClass.category.id, activeClass.isCancelled);

             return (
               <div key={minutes} className="flex gap-4">
                 <div className="w-12 text-right text-xs font-medium text-gray-500 pt-2">
                   {minutesToTime(minutes)}
                 </div>
                 
                 <div className="flex-1">
                    <div className={`rounded-xl p-4 shadow-sm flex flex-col gap-2 relative ${categoryStyle.replace('border-l-4', 'border-l-[6px]')}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{activeClass.title}</h3>
                          <p className="text-sm opacity-80">{activeClass.category.name}</p>
                        </div>
                        
                        {!activeClass.isCancelled && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 -mt-2 -mr-2 text-inherit opacity-70 hover:bg-white/20 hover:text-red-600"
                              onClick={(e) => handleCancelClass(e, activeClass.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${activeClass._count?.bookings! >= activeClass.capacity ? 'bg-blue-100 text-blue-700' : 'bg-gray-100/80 text-gray-700'}`}>
                          {activeClass._count?.bookings! >= activeClass.capacity && <Check className="h-3 w-3" />}
                          <User className="h-3 w-3" />
                          {activeClass._count?.bookings || 0} / {activeClass.capacity} {activeClass._count?.bookings! >= activeClass.capacity ? 'Completa' : 'Reservas'}
                        </div>
                        
                        <div className="flex -space-x-2 relative z-0">
                           <div className="h-7 w-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[9px]">U1</div>
                           <div className="h-7 w-7 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-[9px] z-10">I</div>
                        </div>
                      </div>
                    </div>
                 </div>
               </div>
             )
          })}
        </div>

      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <Card className="w-full sm:max-w-lg shadow-xl rounded-t-2xl sm:rounded-xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle>Nueva Clase</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input required placeholder="Ej: Crossfit WOD" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Inicio</Label><Input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} /></div>
                  <div><Label>Fin</Label><Input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Cupo</Label><Input type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} /></div>
                  <div>
                    <Label>Categoría</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                      <option value="">Seleccionar...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div><Label>Descripción</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalles..." /></div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Guardar Clase'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}