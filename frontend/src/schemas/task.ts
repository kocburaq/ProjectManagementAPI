import { z } from 'zod';

import { TASK_PRIORITY_ORDER } from '@/types/enums';

import {
  enumStringSchema,
  optionalDateString,
  optionalNonNegativeNumberString,
} from './common';

/**
 * Görev form şeması.
 *
 * Backend karşılığı `Validators/TaskValidators.cs` + `TaskService`:
 *   Title          : NotEmpty, MaximumLength(200)
 *   ProjectId      : GreaterThan(0)
 *   Priority       : IsInEnum
 *   EstimatedHours : >= 0 (opsiyonel)
 *   DueDate        : projenin StartDate'inden önce olamaz (servis kuralı)
 *   AssignedToUser : projenin aktif üyesi (ya da sahibi) olmalı (servis kuralı)
 *
 * Son iki kural proje bağlamı gerektirdiği için şemaya değil, forma parametre
 * olarak verilir (`buildTaskFormSchema`). Yine de nihai doğrulama backend'dedir.
 */
export function buildTaskFormSchema(projectStartDateInput?: string) {
  return z
    .object({
      title: z
        .string()
        .min(1, 'Görev başlığı zorunludur.')
        .max(200, 'Başlık en fazla 200 karakter olabilir.'),
      description: z.string(),
      projectId: z.string().min(1, 'Proje seçilmelidir.'),
      assignedToUserId: z.string(),
      priority: enumStringSchema(TASK_PRIORITY_ORDER, 'Geçerli bir öncelik seçin.'),
      dueDate: optionalDateString,
      estimatedHours: optionalNonNegativeNumberString('Tahmini süre negatif olamaz.'),
    })
    .refine(
      (values) => {
        if (!projectStartDateInput || values.dueDate === '') return true;
        return values.dueDate >= projectStartDateInput;
      },
      {
        message: 'Teslim tarihi, projenin başlangıç tarihinden önce olamaz.',
        path: ['dueDate'],
      },
    );
}

export const taskFormSchema = buildTaskFormSchema();

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const TASK_FORM_FIELDS = [
  'title',
  'description',
  'projectId',
  'assignedToUserId',
  'priority',
  'dueDate',
  'estimatedHours',
] as const;
