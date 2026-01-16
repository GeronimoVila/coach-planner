import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Settings, 
  Tags,
  CreditCard 
} from 'lucide-react';

export const ownerNavItems = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Calendario', href: '/classes', icon: CalendarDays },
  { title: 'Alumnos', href: '/students', icon: Users },
  { title: 'Categorías', href: '/categories', icon: Tags },
  { title: 'Configuración', href: '/profile', icon: Settings },
];

export const studentNavItems = [
  { title: 'Inicio', href: '/', icon: LayoutDashboard },
  { title: 'Hacer Reserva', href: '/book', icon: CalendarDays },
  { title: 'Créditos', href: '/credits', icon: CreditCard },
  { title: 'Mi Perfil', href: '/profile', icon: Settings },
];