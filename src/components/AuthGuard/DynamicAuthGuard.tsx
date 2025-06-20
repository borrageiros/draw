import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const AuthGuard = dynamic(() => import('./AuthGuard'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
});

const DynamicAuthGuard = ({ children }: { children: ReactNode }) => {
  return <AuthGuard>{children}</AuthGuard>;
};

export default DynamicAuthGuard; 