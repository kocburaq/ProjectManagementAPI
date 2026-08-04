import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/enums';

/** Oturum durumu çözülene kadar gösterilen tam sayfa yükleyici. */
function FullPageLoader() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Oturum bilgisi kontrol ediliyor</span>
    </div>
  );
}

export interface ProtectedRouteProps {
  /** Belirtilirse yalnızca bu rollerdeki kullanıcılar erişebilir. */
  allowedRoles?: UserRole[];
}

/**
 * Korumalı rota.
 *
 * - Oturum yoksa `/login`'e yönlendirir ve gelinen adresi `state.from` ile taşır,
 *   böylece giriş sonrası kullanıcı istediği sayfaya döner.
 * - `replace` kullanıldığı için geri tuşu sonsuz döngüye girmez.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <FullPageLoader />;
  }

  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
