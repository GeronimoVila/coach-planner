'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';

export default function StudentGuard({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth(); 
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    const verifyStudentStatus = async () => {

      const isPublicOrOnboarding = pathname.startsWith('/login') || pathname.startsWith('/onboarding');

      if (
        user && 
        user.role === 'STUDENT' && 
        user.organizationId && 
        user.categoryId === null &&
        !isPublicOrOnboarding
      ) {
        try {
          const categories = await api.get('/categories', {
              headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.data);
          
          if (categories && categories.length > 0) {
            router.replace('/onboarding/category');
            return;
          } else {
            setIsChecking(false);
          }
        } catch (error) {
          console.error("Error verificando categorías en guard:", error);
          setIsChecking(false); 
        }
      } else {
        setIsChecking(false);
      }
    };

    verifyStudentStatus();
  }, [user, token, isLoading, pathname, router]);

  if (isLoading || isChecking) {
    return null; 
  }

  return <>{children}</>;
}