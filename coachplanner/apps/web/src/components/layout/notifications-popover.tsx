'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

export function NotificationsPopover() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.list);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'bg-green-100 text-green-700';
      case 'WARNING': return 'bg-orange-100 text-orange-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-white animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 md:w-96 p-0 mr-4 mt-2 shadow-xl" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
          <h4 className="font-semibold text-gray-900">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700">
              <Check className="h-3 w-3 mr-1" /> Marcar leídas
            </Button>
          )}
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No tienes notificaciones
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 transition-colors hover:bg-gray-50 cursor-default ${notif.isRead ? 'opacity-70' : 'bg-blue-50/30'}`}
                  onMouseEnter={() => markAsRead(notif.id, notif.isRead)}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getBadgeColor(notif.type)}`}>
                      {notif.type === 'SUCCESS' ? 'Éxito' : notif.type === 'WARNING' ? 'Aviso' : 'Info'}
                    </span>
                    
                    {notif.organization?.name && (
                      <span className="flex items-center text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        <Building2 className="h-3 w-3 mr-1" />
                        {notif.organization.name}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm mt-1.5 ${notif.isRead ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {new Date(notif.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}