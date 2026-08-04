import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, type LoginFormValues } from '@/schemas/auth';
import { ApiErrorCode } from '@/types/api';
import { normalizeApiError } from '@/utils/errors';
import { applyApiFieldErrors } from '@/utils/formErrors';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { login, sessionNotice, clearSessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionConflict, setSessionConflict] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Korumalı bir sayfadan yönlendirildiyse giriş sonrası oraya dönülür.
  const state = location.state as LocationState | null;
  const redirectTo = state?.from?.pathname ?? '/dashboard';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Oturum düşme bildirimini bir kez gösterip temizliyoruz.
  useEffect(() => () => clearSessionNotice(), [clearSessionNotice]);

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    setSessionConflict(null);

    try {
      await login({ email: values.email, password: values.password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const normalized = normalizeApiError(error);

      // Backend "aynı anda tek oturum" kuralı uyguluyor: hesabın canlı bir oturumu
      // varsa 409 + SESSION_ALREADY_ACTIVE döner. Bu, hatalı şifreden farklı bir
      // durum olduğu için ayrı ve açıklayıcı biçimde gösterilir.
      if (normalized.code === ApiErrorCode.SessionAlreadyActive) {
        setSessionConflict(normalized.message);
        return;
      }

      const message = applyApiFieldErrors(error, form.setError, ['email', 'password']);
      if (message) setFormError(message);
    }
  }

  return (
    <AuthShell
      title="Tekrar hoş geldiniz"
      description="Çalışma alanınıza erişmek için giriş yapın."
      footer={
        <>
          Hesabınız yok mu?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Kayıt olun
          </Link>
        </>
      }
    >
      {sessionNotice ? (
        <Alert variant="warning" className="mb-4">
          {sessionNotice}
        </Alert>
      ) : null}

      {sessionConflict ? (
        <Alert variant="warning" title="Bu hesap başka bir yerde açık" className="mb-4">
          {sessionConflict}
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="danger" className="mb-4">
          {formError}
        </Alert>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>E-posta</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="ornek@sirket.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Şifre</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Giriş yap
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
