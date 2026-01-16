'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Loader2, ArrowLeft, ChevronLeft, ChevronRight, X, User, 
  Clock, Calendar as CalendarIcon, CheckCircle2, AlertCircle, Ban
} from 'lucide-react';
import useMediaQuery from '@/hooks/use-media-query';

interface ClassSession {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  availableSlots: number;
  isFull: boolean;
  isBookedByMe: boolean;
  instructorName: string;
  categoryName: string;
  categoryId: number;
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

const getCategoryBorderColor = (categoryId: number) => {
    const borders: { [key: number]: string } = {
      1: 'border-blue-500', 
      2: 'border-purple-500',
      3: 'border-green-500',
      4: 'border-orange-500',
    };
    return borders[categoryId] || 'border-gray-300';
};

export default function StudentBookingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [myCategoryId, setMyCategoryId] = useState<number | null>(null);

  const [intervalMinutes, setIntervalMinutes] = useState(60); 
  const [gymHours, setGymHours] = useState({ start: 7, end: 22 });

  const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);

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
  }, [user, authLoading, router, weekStart]);

  const fetchData = async () => {
    const startStr = weekStart.toISOString();
    const endWeek = addDays(weekStart, 7);
    const endStr = endWeek.toISOString();

    setLoading(true);
    try {
        const [classesRes, configRes, meRes] = await Promise.all([
            api.get(`/classes/schedule?start=${startStr}&end=${endStr}`), 
            api.get('/organizations/config'),
            api.get('/students/me')
        ]);

        setClasses(classesRes.data);
        setMyCategoryId(meRes.data.categoryId);
        
        if (configRes.data) {
          if (configRes.data.slotDurationMinutes) setIntervalMinutes(configRes.data.slotDurationMinutes);
          if (configRes.data.openHour !== undefined && configRes.data.closeHour !== undefined) {
             setGymHours({ start: configRes.data.openHour, end: configRes.data.closeHour });
          }
        }
    } catch (error) {
        console.error(error);
        toast.error('Error cargando el calendario');
    } finally {
        setLoading(false);
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

  const getClassStatus = (session: ClassSession) => {
      if (session.isBookedByMe) return 'booked';
      
      if (myCategoryId && session.categoryId && session.categoryId !== myCategoryId) return 'wrong_category';

      if (session.isFull) return 'full';

      return 'available';
  };

  const getCardStyle = (session: ClassSession) => {
      const status = getClassStatus(session);
      const borderColor = getCategoryBorderColor(session.categoryId);

      switch (status) {
          case 'booked':
              return 'bg-green-100 border-l-4 border-green-600 text-green-900';
          case 'wrong_category':
              return 'bg-gray-100/50 border-l-4 border-gray-300 text-gray-400 opacity-60 grayscale cursor-not-allowed';
          case 'full':
              return 'bg-red-50 border-l-4 border-red-500 text-red-900 cursor-not-allowed';
          case 'available':
          default:
              return `bg-white border-l-4 ${borderColor} text-gray-900 shadow-sm hover:shadow-md hover:brightness-95 transition-all cursor-pointer`;
      }
  };

  const handleClassClick = (session: ClassSession) => {
    const status = getClassStatus(session);
    
    if (status === 'wrong_category') {
        toast.error('Esta clase no pertenece a tu categoría.');
        return;
    }
    if (status === 'full') {
        toast.error('Esta clase está completa.');
        return;
    }

    setSelectedClass(session);
    setIsModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    try {
      await api.post('/bookings', { classId: selectedClass.id });
      toast.success('¡Reserva confirmada!', {
        description: `Te esperamos en la clase de ${selectedClass.title}`
      });
      setIsModalOpen(false);
      fetchData(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo reservar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    try {
      await api.delete(`/bookings/${selectedClass.id}`);
      
      toast.success('Reserva cancelada', { 
          description: 'Se ha devuelto 1 crédito a tu cuenta.' 
      });
      setIsModalOpen(false);
      fetchData(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo cancelar la reserva');
    } finally {
      setSubmitting(false);
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
          <h1 className="text-xl font-bold">Reservar Clases</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {isDesktop && (
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
          )}
          
          <div className="hidden lg:flex items-center gap-3 mr-2 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-white border border-gray-400"></div> Disponible</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-100 border border-green-500"></div> Tu reserva</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-500"></div> Llena</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-400"></div> Otra Cat.</div>
          </div>

          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold ml-2">
            {user?.fullName?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>
      </header>

      <div className="md:hidden flex flex-col border-b bg-white sticky top-16.25 z-20">
        <div className="flex justify-between items-center p-4 pb-2">
           <div className="flex items-center gap-1 font-semibold text-lg capitalize">
             {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
           </div>
           <div className="flex gap-1">
             <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handlePrevWeek}><ChevronLeft className="h-4 w-4" /></Button>
             <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleNextWeek}><ChevronRight className="h-4 w-4" /></Button>
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
                      
                      return (
                        <div 
                          key={i} 
                          className={`border-l p-1 relative group transition-colors ${activeClass ? '' : 'hover:bg-gray-50'}`}
                          onClick={() => activeClass && handleClassClick(activeClass)}
                        >
                          {activeClass ? (
                            <div className={`h-full w-full rounded-lg p-2 flex flex-col justify-between shadow-sm relative ${getCardStyle(activeClass)}`}>
                              
                              {activeClass.isBookedByMe && (
                                <div className="absolute top-1 right-1">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </div>
                              )}

                              <div>
                                <h3 className="font-bold text-sm truncate pr-4">{activeClass.title}</h3>
                                <p className="text-[11px] opacity-80 truncate">{activeClass.instructorName}</p>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                <div className="flex items-center text-xs font-medium gap-1">
                                  <User className="h-3 w-3" />
                                  {activeClass.bookedCount} / {activeClass.capacity}
                                </div>
                                <div className="text-[10px] opacity-70">
                                   {formatDuration((new Date(activeClass.endTime).getTime() - new Date(activeClass.startTime).getTime()) / 60000)}
                                </div>
                              </div>
                            </div>
                          ) : null}
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
          {classes.filter(c => {
             const d = new Date(c.startTime);
             return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth();
          }).length === 0 && (
             <div className="text-center py-10 text-gray-400">
                <p>No hay clases disponibles este día.</p>
             </div>
          )}

          {timeSlots.map((minutes) => {
             const activeClass = getClassInSlot(selectedDate, minutes);
             if (!activeClass) return null; 

             return (
               <div key={minutes} className="flex gap-4" onClick={() => handleClassClick(activeClass)}>
                 <div className="w-12 text-right text-xs font-medium text-gray-500 pt-2">
                   {minutesToTime(minutes)}
                 </div>
                 
                 <div className="flex-1">
                    <div className={`rounded-xl p-4 shadow-sm flex flex-col gap-2 relative ${getCardStyle(activeClass).replace('border-l-4', 'border-l-[6px]')}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{activeClass.title}</h3>
                          <p className="text-sm opacity-80">{activeClass.instructorName}</p>
                          <p className="text-xs opacity-60 mt-1">{activeClass.categoryName}</p>
                        </div>
                        {activeClass.isBookedByMe && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                        {activeClass.isFull && !activeClass.isBookedByMe && <Ban className="h-5 w-5 text-red-600" />}
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${activeClass.isFull ? 'bg-gray-200 text-gray-600' : 'bg-black/5'}`}>
                          <User className="h-3 w-3" />
                          {activeClass.bookedCount} / {activeClass.capacity} {activeClass.isFull ? 'Completa' : ''}
                        </div>
                        
                        <div className="text-xs font-semibold opacity-70">
                           {formatDuration((new Date(activeClass.endTime).getTime() - new Date(activeClass.startTime).getTime()) / 60000)}
                        </div>
                      </div>
                    </div>
                 </div>
               </div>
             )
          })}
        </div>

      </main>

      {isModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <Card className="w-full sm:max-w-md shadow-xl rounded-t-2xl sm:rounded-xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                  <CardTitle>
                      {selectedClass.isBookedByMe ? 'Detalle de Reserva' : 'Confirmar Reserva'}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
              </div>
              <CardDescription>
                  {selectedClass.isBookedByMe 
                    ? 'Información sobre tu clase programada' 
                    : '¿Quieres inscribirte a esta clase?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                
                {selectedClass.isBookedByMe ? (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 text-green-800">
                            <CheckCircle2 className="h-5 w-5 mt-0.5" />
                            <div>
                                <p className="font-bold">Tu reserva está confirmada</p>
                                <p className="text-sm">Te esperamos en la clase de {selectedClass.title}.</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <p className="text-sm text-gray-500 mb-3">
                                ¿No puedes asistir? Cancela tu reserva para liberar el cupo.
                                <br/>
                                <span className="text-xs text-gray-400">* Se te devolverá el crédito si estás dentro del horario permitido.</span>
                            </p>
                            
                            <Button 
                                variant="destructive" 
                                className="w-full" 
                                onClick={handleCancelBooking} 
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Cancelar Reserva'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <CalendarIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Clase</p>
                                <p className="font-bold text-gray-900">{selectedClass.title}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Horario</p>
                                <p className="font-bold text-gray-900">
                                    {new Date(selectedClass.startTime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })} • {new Date(selectedClass.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Instructor</p>
                                <p className="font-bold text-gray-900">{selectedClass.instructorName}</p>
                            </div>
                        </div>
                        
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 flex items-start gap-2 mt-4">
                           <AlertCircle className="h-4 w-4 mt-0.5" />
                           <p>Esta acción consumirá <strong>1 Crédito</strong> de tu plan activo.</p>
                        </div>
                    </div>

                    <Button className="w-full mt-4" size="lg" onClick={handleConfirmBooking} disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Confirmar Reserva (1 Crédito)'}
                    </Button>
                    </>
                )}

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}