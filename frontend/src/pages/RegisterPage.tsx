import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { AuthShell } from '@/components/auth/AuthShell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, type RegisterFormValues } from '@/schemas/auth';
import { applyApiFieldErrors } from '@/utils/formErrors';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);

    try {
      // `confirmPassword` yalnızca istemci tarafı bir kontroldür, API'ye gönderilmez.
      await register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        department: values.department.trim() === '' ? null : values.department.trim(),
      });

      // Backend kayıt sonrası doğrudan oturum açtığı için ayrıca login gerekmez.
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message = applyApiFieldErrors(error, form.setError, [
        'firstName',
        'lastName',
        'email',
        'password',
        'department',
      ]);
      if (message) setFormError(message);
    }
  }

  return (
    <AuthShell
      title="Hesap oluşturun"
      description="Birkaç saniye içinde çalışma alanınıza katılın."
      footer={
        <>
          Zaten hesabınız var mı?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Giriş yapın
          </Link>
        </>
      }
    >
      {formError ? (
        <Alert variant="danger" className="mb-4">
          {formError}
        </Alert>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Ad</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Soyad</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>E-posta</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="ornek@sirket.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departman</FormLabel>
                <FormControl>
                  <Input placeholder="Örn. Mühendislik" {...field} />
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
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>En az 6 karakter.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Şifre tekrarı</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Alert variant="info" className="text-xs">
            Kayıt olan her kullanıcı <strong>Ekip Üyesi</strong> rolüyle oluşturulur. Rol
            yükseltmesi yalnızca bir yönetici tarafından yapılabilir.
          </Alert>

          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Hesap oluştur
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
