'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

interface AuthGuardProps {
  children: React.ReactNode;
}

interface DecodedToken {
  exp: number;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.replace('/auth/login');
      return;
    }

    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      const currentTime = Date.now() / 1000;

      if (decodedToken.exp < currentTime) {
        localStorage.removeItem('token');
        router.replace('/auth/login');
      } else {
        setIsVerified(true);
      }
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
      router.replace('/auth/login');
    }
  }, [router]);

  if (!isVerified) {
    return <div>Loading...</div>; 
  }

  return <>{children}</>;
};

export default AuthGuard;