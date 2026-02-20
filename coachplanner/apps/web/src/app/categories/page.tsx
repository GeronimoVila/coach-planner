'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, ArrowLeft, Tag, PowerOff, CheckCircle2 } from 'lucide-react';
import { useUpgradeModal } from '@/context/upgrade-context';

interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

export default function CategoriesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { openUpgradeModal } = useUpgradeModal();
  const router = useRouter();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      toast.error('Acceso denegado');
      router.push('/');
      return;
    }

    fetchCategories();
  }, [user, authLoading, router]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories?all=true');
      setCategories(res.data);
    } catch (error) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await api.post('/categories', { name: newName });
      setCategories([...categories, { ...res.data, isActive: true }]);
      setNewName('');
      toast.success('Categoría creada');
    } catch (error: any) {
      toast.dismiss();

      if (error.response?.data?.message?.toLowerCase().includes('límite')) {
          openUpgradeModal();
      } else {
          toast.error(error.response?.data?.message || 'Error al crear categoría');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    if (cat.isActive) {
      if (!confirm('¿Seguro que quieres desactivar esta categoría? Ya no aparecerá al crear clases o alumnos nuevos.')) return;
    }

    try {
      await api.patch(`/categories/${cat.id}/toggle`); 
      
      setCategories(categories.map(c => 
        c.id === cat.id ? { ...c, isActive: !c.isActive } : c
      ));

      toast.success(cat.isActive ? 'Categoría desactivada' : 'Categoría reactivada');
    } catch (error) {
      toast.error('No se pudo cambiar el estado de la categoría.');
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      <div className="p-4 md:p-8 pb-0">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-muted-foreground">Gestiona los tipos de clases</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Categorías
              </CardTitle>
              <CardDescription>
                Ejemplos: Crossfit, Yoga, Open Box, Halterofilia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <form onSubmit={handleCreate} className="flex gap-2">
                <Input 
                  placeholder="Nombre de nueva categoría..." 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={creating}
                />
                <Button type="submit" disabled={creating || !newName.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Agregar</span>
                </Button>
              </form>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    No hay categorías creadas aún.
                  </div>
                ) : (
                  categories.map((cat) => (
                    <div 
                      key={cat.id} 
                      className={`flex items-center justify-between p-3 border rounded-md shadow-sm transition-colors ${
                        cat.isActive 
                          ? 'bg-white hover:border-primary/50 group' 
                          : 'bg-gray-50 border-dashed opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${!cat.isActive && 'text-gray-500 line-through'}`}>
                          {cat.name}
                        </span>
                        {!cat.isActive && (
                          <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                            Inactiva
                          </span>
                        )}
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`transition-opacity ${
                          cat.isActive 
                            ? 'text-gray-400 hover:text-orange-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100' 
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                        onClick={() => handleToggleStatus(cat)}
                        title={cat.isActive ? "Desactivar categoría" : "Reactivar categoría"}
                      >
                        {cat.isActive ? <PowerOff className="h-4 w-4" /> : <CheckCircle2 className="h-5 w-5" />}
                      </Button>
                    </div>
                  ))
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}