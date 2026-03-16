'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api'; 
import { AlertTriangle, Info, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

export function GlobalBanner() {
  const [announcement, setAnnouncement] = useState<{ message: string; type: string; dismissible?: boolean } | null>(null);
  const [visible, setVisible] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchGlobalAnnouncement = () => {
      api.get('/auth/global-announcement') 
        .then(({ data }) => {
          if (data) setAnnouncement({ ...data, dismissible: true });
        })
        .catch(() => {}); 
    };

    if (user && user.role === 'OWNER' && user.organizationId) {
      api.get('/auth/my-gyms')
        .then(({ data }) => {
          const currentGym = data.find((g: any) => g.id === user.organizationId);
          
          if (currentGym && currentGym.isActive === false) {
            setAnnouncement({
              message: 'Tu organización se encuentra temporalmente suspendida. Las funciones están limitadas. Por favor, contacta a soporte para regularizar tu cuenta.',
              type: 'ERROR',
              dismissible: false
            });
          } else {
            fetchGlobalAnnouncement();
          }
        })
        .catch(() => fetchGlobalAnnouncement());
    } else {
      fetchGlobalAnnouncement();
    }
  }, [user]);

  if (!announcement || !visible) return null;

  const getStyles = () => {
    switch (announcement.type) {
      case 'WARNING': return 'bg-amber-500 text-white border-amber-600';
      case 'ERROR': return 'bg-red-600 text-white border-red-700 font-bold tracking-wide';
      default: return 'bg-blue-600 text-white border-blue-700';
    }
  };

  const getIcon = () => {
    switch (announcement.type) {
      case 'WARNING': 
      case 'ERROR': return <AlertTriangle className="h-5 w-5 shrink-0" />;
      default: return <Info className="h-5 w-5 shrink-0" />;
    }
  };

  return (
    <div className={`${getStyles()} px-4 py-3 shadow-md border-b relative animate-in slide-in-from-top duration-300 z-50`}>
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
        {getIcon()}
        <span className="text-center">{announcement.message}</span>
      </div>
      
      {announcement.dismissible !== false && (
        <button 
          onClick={() => setVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Cerrar anuncio"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}