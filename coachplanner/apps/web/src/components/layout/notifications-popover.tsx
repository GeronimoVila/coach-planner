'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS';
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.list);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error('Error cargando notificaciones', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('Todas marcadas como leídas');
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover 
      open={isOpen} 
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          fetchNotifications();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-900">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-white" />
          )}
          <span className="sr-only">Notificaciones</span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
          <h4 className="font-semibold text-sm">Notificaciones</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto px-2 py-1 text-xs text-blue-600 hover:text-blue-700"
              onClick={markAllRead}
            >
              Marcar leídas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-75">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="mt-1 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="space-y-1">
                    <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-400 pt-1">
                      {new Date(notif.createdAt).toLocaleDateString()} - {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}