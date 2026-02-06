'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api'; 
import { AlertTriangle, Info, X } from 'lucide-react';

export function GlobalBanner() {
  const [announcement, setAnnouncement] = useState<{ message: string; type: string } | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    api.get('/auth/global-announcement') 
      .then(({ data }) => setAnnouncement(data))
      .catch(() => {}); 
  }, []);

  if (!announcement || !visible) return null;

  const getStyles = () => {
    switch (announcement.type) {
      case 'WARNING': return 'bg-amber-500 text-white border-amber-600';
      case 'ERROR': return 'bg-red-600 text-white border-red-700';
      default: return 'bg-blue-600 text-white border-blue-700';
    }
  };

  const getIcon = () => {
    switch (announcement.type) {
      case 'WARNING': 
      case 'ERROR': return <AlertTriangle className="h-4 w-4 shrink-0" />;
      default: return <Info className="h-4 w-4 shrink-0" />;
    }
  };

  return (
    <div className={`${getStyles()} px-4 py-2 shadow-sm border-b relative animate-in slide-in-from-top duration-300 z-50`}>
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        {getIcon()}
        <span className="text-center">{announcement.message}</span>
      </div>
      <button 
        onClick={() => setVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full transition-colors"
        aria-label="Cerrar anuncio"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}