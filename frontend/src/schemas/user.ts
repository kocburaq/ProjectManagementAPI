import { z } from 'zod';

import { ProjectMemberRole, UserRole } from '@/types/enums';

import { enumStringSchema } from './common';

/**
 * Kullanıcı güncelleme form şeması (yalnızca Admin).
 * Backend karşılığı `Validators/UserValidators.cs`:
 *   FirstName / LastName : NotEmpty, MaximumLength(50)
 *   Department           : MaximumLength(100)
 *   Role                 : IsInEnum
 */
export const userFormSchema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur.').max(50, 'Ad en fazla 50 karakter olabilir.'),
  lastName: z.string().min(1, 'Soyad zorunludur.').max(50, 'Soyad en fazla 50 karakter olabilir.'),
  department: z.string().max(100, 'Departman en fazla 100 karakter olabilir.'),
  role: enumStringSchema(Object.values(UserRole), 'Geçerli bir rol seçin.'),
  isActive: z.boolean(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const USER_FORM_FIELDS = ['firstName', 'lastName', 'department', 'role', 'isActive'] as const;

/** Projeye üye ekleme formu — `Validators/ProjectMemberValidators.cs`. */
export const projectMemberFormSchema = z.object({
  userId: z.string().min(1, 'Kullanıcı seçilmelidir.'),
  role: enumStringSchema(Object.values(ProjectMemberRole), 'Geçerli bir rol seçin.'),
});

export type ProjectMemberFormValues = z.infer<typeof projectMemberFormSchema>;

export const PROJECT_MEMBER_FORM_FIELDS = ['userId', 'role'] as const;
