import { z } from 'zod';

import { PROJECT_STATUS_ORDER } from '@/types/enums';

import { enumStringSchema, optionalDateString, requiredDateString } from './common';

/**
 * Proje form şeması.
 *
 * Backend karşılığı `Validators/ProjectValidators.cs` + `ProjectService`:
 *   Name      : NotEmpty, MaximumLength(200)
 *   StartDate : NotEmpty
 *   EndDate   : StartDate'ten önce olamaz (hem validator hem servis kontrol ediyor)
 *   Status    : IsInEnum (yalnızca güncellemede gönderilir)
 *
 * NOT: `Description` için backend'de uzunluk kuralı YOK; bu yüzden burada da
 * yapay bir sınır konulmadı.
 */
export const projectFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Proje adı zorunludur.')
      .max(200, 'Proje adı en fazla 200 karakter olabilir.'),
    description: z.string(),
    startDate: requiredDateString,
    endDate: optionalDateString,
    // Yalnızca düzenleme modunda kullanılır; oluşturmada backend her zaman Planning atar.
    status: enumStringSchema(PROJECT_STATUS_ORDER, 'Geçerli bir durum seçin.'),
  })
  .refine(
    (values) => values.endDate === '' || values.endDate >= values.startDate,
    {
      message: 'Bitiş tarihi başlangıç tarihinden önce olamaz.',
      path: ['endDate'],
    },
  );

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const PROJECT_FORM_FIELDS = ['name', 'description', 'startDate', 'endDate', 'status'] as const;
