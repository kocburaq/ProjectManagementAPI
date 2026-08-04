import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { USER_ROLE_LABELS } from '@/types/enums';

/**
 * Yetkisiz erişim sayfası.
 *
 * Backend rol kontrolünü zaten yapıyor (403); bu sayfa kullanıcıyı gereksiz bir
 * hata yanıtıyla karşılaştırmadan önce bilgilendirmek içindir.
 */
export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-warning-subtle text-warning">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-warning">403</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bu sayfaya erişim yetkiniz yok
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {user
            ? `Mevcut rolünüz "${USER_ROLE_LABELS[user.role]}". Bu bölüm daha yüksek yetki gerektiriyor; erişim için bir yöneticiye başvurun.`
            : 'Bu bölüm için gerekli yetkiye sahip değilsiniz.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft aria-hidden="true" />
          Geri dön
        </Button>
        <Button asChild>
          <Link to="/dashboard">Panele git</Link>
        </Button>
      </div>
    </div>
  );
}
