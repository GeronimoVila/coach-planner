import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Dumbbell, 
  Settings, 
  CreditCard 
} from 'lucide-react';

export const ownerNavItems = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Calendario', href: '/classes', icon: CalendarDays },
  { title: 'Alumnos', href: '/students', icon: Users },
  { title: 'Categorías', href: '/categories', icon: Settings },
];

export const studentNavItems = [
  { title: 'Inicio', href: '/', icon: LayoutDashboard },
  { title: 'Mis Reservas', href: '/my-bookings', icon: CalendarDays },
  { title: 'Créditos', href: '/credits', icon: CreditCard },
];