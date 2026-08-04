import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';

/**
 * Yalnızca oturumu OLMAYAN kullanıcılara açık rotalar (login, register).
 *
 * Oturum açıkken bu sayfalara gidilirse panele yönlendirilir. Backend "aynı anda
 * tek oturum" kuralı uyguladığı için, açık bir oturum varken ikinci kez giriş
 * denemek zaten 409 ile reddedilirdi; kullanıcıyı en baştan buraya sokmuyoruz.
 */
export function PublicRoute() {
  const { status } = useAuth();

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
