import { z } from 'zod';

/**
 * Kimlik doğrulama form şemaları.
 *
 * Kurallar backend'deki `Validators/AuthValidators.cs` ile birebir eşleşir:
 *   FirstName / LastName : NotEmpty, MaximumLength(50)
 *   Email                : NotEmpty, EmailAddress, MaximumLength(256)
 *   Password             : NotEmpty, MinimumLength(6)
 *   Department           : MaximumLength(100)
 *
 * Frontend'e ek olarak "şifre tekrarı" alanı vardır; bu yalnızca istemci tarafı bir
 * kolaylıktır ve API'ye gönderilmez.
 */

export const loginSchema = z.object({
  email: z.string().min(1, 'E-posta zorunludur.').email('Geçerli bir e-posta adresi girin.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'Ad zorunludur.').max(50, 'Ad en fazla 50 karakter olabilir.'),
    lastName: z.string().min(1, 'Soyad zorunludur.').max(50, 'Soyad en fazla 50 karakter olabilir.'),
    email: z
      .string()
      .min(1, 'E-posta zorunludur.')
      .email('Geçerli bir e-posta adresi girin.')
      .max(256, 'E-posta en fazla 256 karakter olabilir.'),
    department: z.string().max(100, 'Departman en fazla 100 karakter olabilir.'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.'),
    confirmPassword: z.string().min(1, 'Şifre tekrarı zorunludur.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
