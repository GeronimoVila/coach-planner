import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Settings, 
  Tags,
  CreditCard 
} from 'lucide-react';
import { Building2 } from 'lucide-react';

export const ownerNavItems = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Calendario', href: '/classes', icon: CalendarDays },
  { title: 'Alumnos', href: '/students', icon: Users },
  { title: 'Categorías', href: '/categories', icon: Tags },
  { title: 'Mi Equipo', href: '/team', icon: Users },
  { title: 'Configuración', href: '/profile', icon: Settings },
];

export const staffNavItems = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Calendario', href: '/classes', icon: CalendarDays },
  { title: 'Alumnos', href: '/students', icon: Users },
  { title: 'Mi Perfil', href: '/profile', icon: Settings },
];

export const studentNavItems = [
  { title: 'Inicio', href: '/', icon: LayoutDashboard },
  { title: 'Hacer Reserva', href: '/book', icon: CalendarDays },
  { title: 'Créditos', href: '/credits', icon: CreditCard },
  { title: 'Mi Perfil', href: '/profile', icon: Settings },
];

export const adminNavItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Gimnasios', href: '/admin/organizations', icon: Building2 },
  { title: 'Usuarios', href: '/admin/users', icon: Users },
  { title: 'Configuración', href: '/admin/settings', icon: Settings },
];