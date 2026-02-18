'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MessageCircle, Crown, ArrowRight } from 'lucide-react';

interface UpgradeContextType {
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
}

const UpgradeContext = createContext<UpgradeContextType | undefined>(undefined);

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openUpgradeModal = () => setIsOpen(true);
  const closeUpgradeModal = () => setIsOpen(false);

  const handleContactSupport = () => {
    const phoneNumber = '5491112345678'; 
    const message = encodeURIComponent('Hola! 👋 Quiero actualizar mi gimnasio al Plan PRO para tener límites infinitos.');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    setIsOpen(false);
  };

  return (
    <UpgradeContext.Provider value={{ openUpgradeModal, closeUpgradeModal }}>
      {children}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="flex flex-col items-center gap-4 pt-4">
            <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center animate-pulse">
                <Crown className="h-8 w-8 text-indigo-600" />
            </div>
            <DialogTitle className="text-2xl text-indigo-950">¡Desbloquea todo el potencial!</DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Has alcanzado el límite de tu plan gratuito. Pásate a <b>PRO</b> y elimina todas las restricciones hoy mismo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4 text-left">
             <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <span>Alumnos <b>Ilimitados</b></span>
             </div>
             <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <span>Clases y Horarios <b>Ilimitados</b></span>
             </div>
             <div className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <span>Categorías <b>Ilimitadas</b></span>
             </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
                size="lg" 
                className="w-full bg-green-600 hover:bg-green-700 gap-2 text-lg h-12"
                onClick={handleContactSupport}
            >
                <MessageCircle className="h-5 w-5" />
                Contactar para Activar
            </Button>
            <Button variant="ghost" onClick={closeUpgradeModal} className="text-gray-400">
                Quizás más tarde
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpgradeContext.Provider>
  );
}

export const useUpgradeModal = () => {
  const context = useContext(UpgradeContext);
  if (!context) throw new Error('useUpgradeModal debe usarse dentro de un UpgradeProvider');
  return context;
};