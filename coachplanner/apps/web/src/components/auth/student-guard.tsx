'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function StudentGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (
      user && 
      user.role === 'STUDENT' && 
      user.organizationId && 
      !user.categoryId && 
      pathname !== '/onboarding/category'
    ) {
      router.replace('/onboarding/category');
    } else {
      setIsChecking(false);
    }
  }, [user, isLoading, pathname, router]);

  if (
    !isLoading && 
    user?.role === 'STUDENT' && 
    user?.organizationId &&
    !user?.categoryId && 
    pathname !== '/onboarding/category'
  ) {
    return null; 
  }

  return <>{children}</>;
}