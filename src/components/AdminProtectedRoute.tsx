import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { checkIsAdmin } from '@/lib/admin/auth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [adminLoading, setAdminLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('[AdminProtectedRoute] authLoading:', authLoading, 'user:', user?.id)
      if (!user) {
        setAdminLoading(false);
        return;
      }

      const { isAdmin } = await checkIsAdmin(user.id);
      console.log('[AdminProtectedRoute] isAdmin:', isAdmin)
      setIsAdmin(isAdmin);
      setAdminLoading(false);
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-accent"></div>
      </div>
    );
  }

  if (!user) {
    console.log('[AdminProtectedRoute] no user, redirecting to /auth')
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    console.log('[AdminProtectedRoute] not admin, redirecting to /app')
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;