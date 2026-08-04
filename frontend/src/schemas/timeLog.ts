import { z } from 'zod';

import { positiveNumberString, requiredDateString } from './common';

/**
 * Zaman kaydı form şeması.
 *
 * Backend karşılığı `Validators/TaskTimeLogValidators.cs`:
 *   Hours       : GreaterThan(0)
 *   Description : MaximumLength(500)
 *   WorkDate    : NotEmpty
 *
 * Model başlangıç/bitiş saati DEĞİL, ondalıklı saat + iş günü tutar; form da buna uyar.
 */
export const timeLogFormSchema = z.object({
  hours: positiveNumberString('Süre sıfırdan büyük olmalıdır.'),
  workDate: requiredDateString,
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir.'),
});

export type TimeLogFormValues = z.infer<typeof timeLogFormSchema>;

export const TIME_LOG_FORM_FIELDS = ['hours', 'workDate', 'description'] as const;
