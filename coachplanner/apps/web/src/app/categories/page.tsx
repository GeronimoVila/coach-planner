'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ArrowLeft, Tag } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

export default function CategoriesPage() {
  const { user, isLoading: authLoading } = useAuth();
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
      const res = await api.get('/categories');
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
      setCategories([...categories, res.data]);
      setNewName('');
      toast.success('Categoría creada');
    } catch (error) {
      toast.error('Error al crear categoría');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que quieres borrar esta categoría?')) return;

    try {
      await api.delete(`/categories/${id}`);
      setCategories(categories.filter((c) => c.id !== id));
      toast.success('Categoría eliminada');
    } catch (error) {
      toast.error('No se pudo borrar. Quizás tiene clases asociadas.');
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
                      className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm group hover:border-primary/50 transition-colors"
                    >
                      <span className="font-medium">{cat.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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